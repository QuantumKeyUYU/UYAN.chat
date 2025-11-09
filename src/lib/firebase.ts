import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore as getClientFirestore,
  Firestore,
} from 'firebase/firestore';
import { getAuth as getClientAuth } from 'firebase/auth';
import { cert, getApp as getAdminApp, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

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
  return getClientFirestore(app);
};

export const getClientAuthInstance = () => {
  const app = getFirebaseApp();
  return getClientAuth(app);
};

const getAdminConfig = () => {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error('Missing Firebase Admin credentials');
  }

  return {
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    projectId,
  };
};

export const getAdminDb = () => {
  if (!getAdminApps().length) {
    initializeAdminApp(getAdminConfig());
  }
  return getAdminFirestore(getAdminApp());
};
