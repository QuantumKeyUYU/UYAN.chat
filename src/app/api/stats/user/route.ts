import { NextResponse } from 'next/server';
import type { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import type { UserStats } from '@/types/firestore';

interface SerializedUserStats {
  deviceId: string;
  lightsGiven: number;
  lightsReceived: number;
  messagesSent: number;
  karmaScore: number;
  createdAt: number | null;
  lastActiveAt: number | null;
}

const serializeTimestamp = (value?: Timestamp | null): number | null => {
  if (!value) return null;
  try {
    return value.toMillis();
  } catch (error) {
    console.warn('[stats/user] Failed to serialize timestamp', error);
    return null;
  }
};

const emptyStats = (deviceId: string): SerializedUserStats => ({
  deviceId,
  lightsGiven: 0,
  lightsReceived: 0,
  messagesSent: 0,
  karmaScore: 0,
  createdAt: null,
  lastActiveAt: null,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId обязателен' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db.collection('user_stats').doc(deviceId).get();

    if (!snapshot.exists) {
      return NextResponse.json({ stats: emptyStats(deviceId) }, { status: 200 });
    }

    const data = snapshot.data() as UserStats;
    const stats: SerializedUserStats = {
      deviceId: data.deviceId,
      lightsGiven: data.lightsGiven ?? 0,
      lightsReceived: data.lightsReceived ?? 0,
      messagesSent: data.messagesSent ?? 0,
      karmaScore: data.karmaScore ?? 0,
      createdAt: serializeTimestamp(data.createdAt),
      lastActiveAt: serializeTimestamp(data.lastActiveAt),
    };

    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error('[stats/user] Failed to load user stats', error);
    return NextResponse.json({ error: 'Не удалось загрузить статистику.' }, { status: 500 });
  }
}
