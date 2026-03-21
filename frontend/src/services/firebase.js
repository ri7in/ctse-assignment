import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

let database = null;

try {
  const raw = import.meta.env.VITE_FIREBASE_CONFIG;
  if (raw) {
    const firebaseConfig = JSON.parse(raw);
    if (firebaseConfig.databaseURL || firebaseConfig.projectId) {
      const app = initializeApp(firebaseConfig);
      database = getDatabase(app);
    }
  }
} catch {
  // Firebase not configured — real-time notifications disabled
}

export { database };
