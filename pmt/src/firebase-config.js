// Firebase SDK modüllerini import et
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase yapılandırma bilgileri
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Firebase servislerini dışa aktar
export const auth = getAuth(app);
export const db = getFirestore(app);  // Firestore'ı ekledik
export const functions = getFunctions(app);  // Firebase Functions'ı ekledik

// Local Emulator Configuration
if (window.location.hostname === 'localhost') {
  // Connect to Firebase Auth Emulator (default port 9099)
  connectAuthEmulator(auth, "http://localhost:9099");

  // Connect to Firestore Emulator (default port 8080)
  connectFirestoreEmulator(db, "localhost", 8080);

  // Connect to Firebase Functions Emulator (default port 5001)
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export default app;
