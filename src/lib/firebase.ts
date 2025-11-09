import { initializeApp, getApps, getApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const getFirebaseApp = () => {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getApp();
};

export const getClientDb = (): Firestore => {
  const app = getFirebaseApp();
  const { getFirestore } = require('firebase/firestore') as typeof import('firebase/firestore');
  return getFirestore(app);
};

export const getClientAuthInstance = () => {
  const app = getFirebaseApp();
  const { getAuth } = require('firebase/auth') as typeof import('firebase/auth');
  return getAuth(app);
};
