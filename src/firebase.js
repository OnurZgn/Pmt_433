import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);


// Use emulators in development
if (process.env.REACT_APP_USE_EMULATOR === 'true' && window.location.hostname === 'localhost') {
  connectAuthEmulator(auth, `http://localhost:${process.env.REACT_APP_AUTH_EMULATOR_PORT}`);
  connectFirestoreEmulator(db, 'localhost', parseInt(process.env.REACT_APP_FIRESTORE_EMULATOR_PORT));
  connectFunctionsEmulator(functions, 'localhost', parseInt(process.env.REACT_APP_FUNCTIONS_EMULATOR_PORT));
}

export { app, db, auth, functions};
