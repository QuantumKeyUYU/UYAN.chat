export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { getOrCreateUserStats } from '@/lib/stats';
import { isAdminRequest } from '@/lib/adminAuth';

type BanUserBody = {
  deviceId?: string;
  days?: number;
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as BanUserBody;
    const { deviceId, days } = body;

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    if (typeof days !== 'number' || Number.isNaN(days)) {
      return NextResponse.json({ error: 'Некорректное значение срока' }, { status: 400 });
    }

    const normalizedDays = Math.floor(days);
    const db = getAdminDb();
    const statsRef = db.collection('user_stats').doc(deviceId);

    await getOrCreateUserStats(deviceId);

    if (normalizedDays <= 0) {
      await statsRef.set({ bannedUntil: null }, { merge: true });
    } else {
      const now = Timestamp.now();
      const banDurationMs = normalizedDays * 24 * 60 * 60 * 1000;
      const bannedUntil = Timestamp.fromMillis(now.toMillis() + banDurationMs);
      await statsRef.set({ bannedUntil }, { merge: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] Failed to update user ban', error);
    return NextResponse.json({ error: 'Не удалось обновить статус пользователя.' }, { status: 500 });
  }
}
