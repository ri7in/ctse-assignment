const { Kafka } = require('kafkajs');
const Task = require('../models/Task');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'task-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'tasky-task-group' });

const handlers = {
  // project.deleted → archive all tasks in that project
  'project.deleted': async ({ projectId }) => {
    await Task.updateMany({ projectId }, { $set: { status: 'done' } });
  },

  // member.removed → unassign tasks in that project for that user
  'member.removed': async ({ projectId, userId }) => {
    await Task.updateMany({ projectId, assigneeId: userId }, { $set: { assigneeId: null } });
  },

  // user.deleted → unassign + anonymize reporter
  'user.deleted': async ({ userId }) => {
    await Task.updateMany({ assigneeId: userId }, { $set: { assigneeId: null } });
    await Task.updateMany({ reporterId: userId }, { $set: { reporterId: 'deleted-user' } });
  },

  // timeEntry.logged → add duration to trackedTime
  'timeEntry.logged': async ({ taskId, duration }) => {
    await Task.findByIdAndUpdate(taskId, { $inc: { trackedTime: duration } });
  },

  // timeEntry.deleted → subtract duration from trackedTime
  'timeEntry.deleted': async ({ taskId, duration }) => {
    await Task.findByIdAndUpdate(taskId, { $inc: { trackedTime: -duration } });
  }
};

const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({
    topics: ['tasky.project-events', 'tasky.tracker-events', 'tasky.user-events'],
    fromBeginning: false
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const envelope = JSON.parse(message.value.toString());
        const handler = handlers[envelope.event];
        if (handler) {
          await handler(envelope.data);
          console.log(`[task-consumer] handled: ${envelope.event}`);
        }
      } catch (err) {
        console.error(`[task-consumer] error on ${topic}:`, err.message);
      }
    }
  });

  console.log('task-service Kafka consumer started');
};

module.exports = { startConsumer };
