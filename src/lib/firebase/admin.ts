import { cert, getApp as getAdminApp, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const sanitizeProjectId = (raw: string | undefined | null) => {
  if (!raw) {
    return raw ?? undefined;
  }
  const trimmed = raw.trim();
  const match = trimmed.match(/projects\/([^/]+)\/databases/);
  if (match) {
    return match[1];
  }
  return trimmed;
};

const getAdminConfig = () => {
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmailRaw = process.env.FIREBASE_CLIENT_EMAIL;
  const projectIdRaw = process.env.FIREBASE_PROJECT_ID;

  const privateKey = typeof privateKeyRaw === 'string' ? privateKeyRaw.trim() : privateKeyRaw;
  const clientEmail = typeof clientEmailRaw === 'string' ? clientEmailRaw.trim() : clientEmailRaw;
  const projectId = sanitizeProjectId(projectIdRaw ?? undefined);

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
