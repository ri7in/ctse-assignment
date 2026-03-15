const admin = require('firebase-admin');

let initialized = false;

const initFirebase = () => {
  if (initialized) return;

  if (!process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.FIREBASE_DATABASE_URL) {
    console.warn('Firebase env vars not set — real-time push disabled');
    return;
  }

  try {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    initialized = true;
    console.log('Firebase Admin initialized');
  } catch (err) {
    console.error('Firebase init error:', err.message);
  }
};

const pushNotification = async (userId, notificationId, payload) => {
  if (!initialized) return;
  try {
    const db = admin.database();
    await db.ref(`/notifications/${userId}/${notificationId}`).set(payload);
  } catch (err) {
    console.error('Firebase push error:', err.message);
  }
};

const deleteUserNotifications = async (userId) => {
  if (!initialized) return;
  try {
    const db = admin.database();
    await db.ref(`/notifications/${userId}`).remove();
  } catch (err) {
    console.error('Firebase delete error:', err.message);
  }
};

module.exports = { initFirebase, pushNotification, deleteUserNotifications };
