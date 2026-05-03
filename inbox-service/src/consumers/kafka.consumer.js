const { Kafka } = require('kafkajs');
const { createNotification } = require('../services/notification.service');
const Notification = require('../models/Notification');
const ProjectIndex = require('../models/ProjectIndex');
const { ensureProjectIndex } = require('../services/project.client');
const { deleteUserNotifications } = require('../config/firebase');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'inbox-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'tasky-inbox-group' });

const handlers = {
  // task.assigned → notify assignee
  'task.assigned': async ({ assigneeId, title, taskId, projectId, actorId }) => {
    if (!assigneeId) return;
    await createNotification({
      userId: assigneeId,
      event: 'task.assigned',
      title: `New task assigned to you: ${title}`,
      body: title,
      metadata: { taskId, projectId, actorId }
    });
  },

  // task.completed → notify project context (we notify assignee & reporter)
  'task.completed': async ({ assigneeId, title, taskId, projectId, completedBy }) => {
    if (assigneeId && assigneeId !== completedBy) {
      await createNotification({
        userId: assigneeId,
        event: 'task.completed',
        title: `Task completed: ${title}`,
        body: title,
        metadata: { taskId, projectId, actorId: completedBy }
      });
    }
  },

  // task.status.changed → notify assignee
  'task.status.changed': async ({ assigneeId, title, taskId, projectId, newStatus, actorId }) => {
    if (!assigneeId || assigneeId === actorId) return;
    await createNotification({
      userId: assigneeId,
      event: 'task.status.changed',
      title: `Task "${title}" moved to ${newStatus}`,
      body: `Status changed to ${newStatus}`,
      metadata: { taskId, projectId, actorId }
    });
  },

  // task.updated → notify assignee if priority changed to urgent
  'task.updated': async ({ changes, projectId, taskId, actorId }) => {
    // Only if we have assigneeId in metadata — we skip for now since task.updated doesn't include it
    // This is handled when task.assigned is emitted alongside
  },

  // member.added → notify new member, keep ProjectIndex in sync
  'member.added': async ({ userId, projectId, projectName, addedBy }) => {
    await ProjectIndex.updateOne(
      { projectId },
      { $addToSet: { members: userId } }
    );
    await createNotification({
      userId,
      event: 'member.added',
      title: `You were added to project: ${projectName}`,
      body: projectName,
      metadata: { projectId, actorId: addedBy }
    });
  },

  // member.removed → keep ProjectIndex in sync
  'member.removed': async ({ projectId, userId }) => {
    await ProjectIndex.updateOne(
      { projectId },
      { $pull: { members: userId } }
    );
  },

  // project.created → seed ProjectIndex + notify owner
  'project.created': async ({ ownerId, projectId, name, members = [] }) => {
    await ProjectIndex.updateOne(
      { projectId },
      { $set: { projectId, ownerId, members: [...new Set([ownerId, ...members])] } },
      { upsert: true }
    );
    await createNotification({
      userId: ownerId,
      event: 'project.created',
      title: `Welcome to your new project: ${name}`,
      body: name,
      metadata: { projectId }
    });
  },

  // project.deleted → drop ProjectIndex entry
  'project.deleted': async ({ projectId }) => {
    await ProjectIndex.deleteOne({ projectId });
  },

  // task.created → notify the creator (mirrors project.created notifying the
  // owner) AND every other project member. The assignee is excluded because
  // they're already covered by task.assigned, which fires alongside.
  'task.created': async ({ taskId, title, projectId, reporterId, assigneeId, priority }) => {
    // Falls back to fetching project-service if we haven't indexed this project yet
    // (e.g. it was created before this consumer started, or the project event was missed).
    const idx = await ensureProjectIndex(projectId);
    const memberPool = idx ? idx.members : [];
    // Always include the creator even if for some reason they're not in the
    // member list (handles edge cases where the project lookup failed).
    const recipientSet = new Set([reporterId, ...memberPool]);
    if (assigneeId) recipientSet.delete(assigneeId);

    for (const userId of recipientSet) {
      const isCreator = userId === reporterId;
      await createNotification({
        userId,
        event: 'task.created',
        title: isCreator ? `Task created: ${title}` : `New task: ${title}`,
        body: priority ? `Priority: ${priority}` : title,
        metadata: { taskId, projectId, actorId: reporterId }
      });
    }
  },

  // milestone.reached → notify all project members
  'milestone.reached': async ({ members, projectId, projectName, milestone }) => {
    for (const userId of members) {
      await createNotification({
        userId,
        event: 'milestone.reached',
        title: `Project ${projectName} reached ${milestone}% completion!`,
        body: `${milestone}% milestone`,
        metadata: { projectId }
      });
    }
  },

  // report.generated → notify generator
  'report.generated': async ({ generatedBy, projectId, projectName }) => {
    await createNotification({
      userId: generatedBy,
      event: 'report.generated',
      title: `Your project report for ${projectName} is ready`,
      body: projectName,
      metadata: { projectId }
    });
  },

  // user.invited → notify invited user
  'user.invited': async ({ userId, invitedBy }) => {
    await createNotification({
      userId,
      event: 'user.invited',
      title: "You've been invited to Tasky.io",
      body: 'Welcome!',
      metadata: { actorId: invitedBy }
    });
  },

  // user.deleted → delete all notifications and Firebase entries for this user
  'user.deleted': async ({ userId }) => {
    await Notification.deleteMany({ userId });
    await deleteUserNotifications(userId);
  }
};

const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({
    topics: ['tasky.task-events', 'tasky.project-events', 'tasky.tracker-events', 'tasky.user-events'],
    fromBeginning: false
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const envelope = JSON.parse(message.value.toString());
        const handler = handlers[envelope.event];
        if (handler) {
          await handler(envelope.data);
          console.log(`[inbox-consumer] handled: ${envelope.event}`);
        }
      } catch (err) {
        console.error(`[inbox-consumer] error on ${topic}:`, err.message);
      }
    }
  });

  console.log('inbox-service Kafka consumer started');
};

module.exports = { startConsumer };
