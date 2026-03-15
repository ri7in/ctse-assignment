const { Kafka } = require('kafkajs');
const TimeEntry = require('../models/TimeEntry');
const { publish } = require('../services/kafka.producer');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'tracker-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'tasky-tracker-group' });

const handlers = {
  // task.status.changed → auto-start/stop time entry
  'task.status.changed': async ({ taskId, projectId, assigneeId, newStatus }) => {
    if (!assigneeId) return;

    if (newStatus === 'in-progress') {
      // Create open time entry
      await TimeEntry.create({
        taskId,
        projectId,
        userId: assigneeId,
        startedAt: new Date()
      });
    } else {
      // Close any open entry for this task
      const entry = await TimeEntry.findOne({ taskId, endedAt: null });
      if (entry) {
        const endedAt = new Date();
        const duration = Math.round((endedAt - entry.startedAt) / 60000);
        entry.endedAt = endedAt;
        entry.duration = duration;
        await entry.save();

        await publish('timeEntry.logged', {
          entryId: entry._id.toString(),
          taskId,
          projectId,
          userId: assigneeId,
          duration
        });
      }
    }
  },

  // task.completed → close open time entry
  'task.completed': async ({ taskId, projectId, assigneeId }) => {
    const entry = await TimeEntry.findOne({ taskId, endedAt: null });
    if (entry) {
      const endedAt = new Date();
      const duration = Math.round((endedAt - entry.startedAt) / 60000);
      entry.endedAt = endedAt;
      entry.duration = duration;
      await entry.save();

      await publish('timeEntry.logged', {
        entryId: entry._id.toString(),
        taskId,
        projectId,
        userId: assigneeId,
        duration
      });
    }
  },

  // task.deleted → remove all time entries for this task
  'task.deleted': async ({ taskId }) => {
    await TimeEntry.deleteMany({ taskId });
  },

  // project.created → no direct action needed (baseline is implicit)
  'project.created': async () => {},

  // user.deleted → anonymize time entries
  'user.deleted': async ({ userId }) => {
    await TimeEntry.updateMany({ userId }, { $set: { userId: 'deleted-user' } });
  }
};

const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({
    topics: ['tasky.task-events', 'tasky.project-events', 'tasky.user-events'],
    fromBeginning: false
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const envelope = JSON.parse(message.value.toString());
        const handler = handlers[envelope.event];
        if (handler) {
          await handler(envelope.data);
          console.log(`[tracker-consumer] handled: ${envelope.event}`);
        }
      } catch (err) {
        console.error(`[tracker-consumer] error on ${topic}:`, err.message);
      }
    }
  });

  console.log('tracker-service Kafka consumer started');
};

module.exports = { startConsumer };
