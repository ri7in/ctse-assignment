const { Kafka } = require('kafkajs');
const Project = require('../models/Project');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'project-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'tasky-project-group' });

const handlers = {
  // task.created → increment totalTasks
  'task.created': async ({ projectId }) => {
    await Project.findByIdAndUpdate(projectId, { $inc: { totalTasks: 1 } });
  },

  // task.completed → increment completedTasks (fired by /complete endpoint)
  'task.completed': async ({ projectId }) => {
    await Project.findByIdAndUpdate(projectId, { $inc: { completedTasks: 1 } });
  },

  // task.status.changed → sync completedTasks when status moves to/from 'done'
  'task.status.changed': async ({ projectId, oldStatus, newStatus }) => {
    if (oldStatus === newStatus) return;
    const inc = {};
    if (newStatus === 'done') inc.completedTasks = 1;
    else if (oldStatus === 'done') inc.completedTasks = -1;
    if (Object.keys(inc).length) {
      await Project.findByIdAndUpdate(projectId, { $inc: inc });
    }
  },

  // task.deleted → decrement counters
  'task.deleted': async ({ projectId, wasCompleted }) => {
    const update = { $inc: { totalTasks: -1 } };
    if (wasCompleted) update.$inc.completedTasks = -1;
    await Project.findByIdAndUpdate(projectId, update);
  },

  // member.removed (from own topic — handled by controller, not re-consumed)
  // user.deleted → remove user from all project member arrays
  'user.deleted': async ({ userId }) => {
    await Project.updateMany({ members: userId }, { $pull: { members: userId } });
  },

  // report.generated → update lastReportAt
  'report.generated': async ({ projectId }) => {
    await Project.findByIdAndUpdate(projectId, { lastReportAt: new Date() });
  }
};

const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({
    topics: ['tasky.task-events', 'tasky.tracker-events', 'tasky.user-events'],
    fromBeginning: false
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const envelope = JSON.parse(message.value.toString());
        const handler = handlers[envelope.event];
        if (handler) {
          await handler(envelope.data);
          console.log(`[project-consumer] handled: ${envelope.event}`);
        }
      } catch (err) {
        console.error(`[project-consumer] error processing message on ${topic}:`, err.message);
      }
    }
  });

  console.log('project-service Kafka consumer started');
};

module.exports = { startConsumer };
