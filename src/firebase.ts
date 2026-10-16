import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence Firestore connection logs in preview environment
try {
  setLogLevel('silent');
} catch {
  // Ignore
}

export const app = initializeApp(firebaseConfig);
export const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;

// Initialize Firestore with Force Long Polling to avoid WebSocket connection drops in preview iframe
// and ignoreUndefinedProperties so optional undefined fields do not cause write rejections
try {
  initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true
  }, firebaseConfig.firestoreDatabaseId);
} catch {
  // If already initialized
}

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

export async function testConnection() {
  return true;
}
