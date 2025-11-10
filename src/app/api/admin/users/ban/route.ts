export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { getOrCreateUserStatsByHash } from '@/lib/stats';
import { isAdminRequest } from '@/lib/adminAuth';
import { hashDeviceId } from '@/lib/deviceHash';

type BanUserBody = {
  deviceId?: string;
  deviceHash?: string;
  days?: number;
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as BanUserBody;
    const inputId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const inputHash = typeof body.deviceHash === 'string' ? body.deviceHash.trim() : '';
    const candidate = inputHash || inputId;

    if (!candidate) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    const looksLikeHash = /^[a-f0-9]{64}$/i.test(candidate);
    const deviceHash = looksLikeHash ? candidate : hashDeviceId(candidate);
    const legacyId = looksLikeHash ? null : candidate;

    const { days } = body;

    if (typeof days !== 'number' || Number.isNaN(days)) {
      return NextResponse.json({ error: 'Некорректное значение срока' }, { status: 400 });
    }

    const normalizedDays = Math.floor(days);
    const db = getAdminDb();

    const hashedRef = db.collection('user_stats').doc(deviceHash);
    const legacyRef = legacyId ? db.collection('user_stats').doc(legacyId) : null;

    const [, legacySnap] = await Promise.all([
      getOrCreateUserStatsByHash(deviceHash),
      legacyRef ? legacyRef.get() : Promise.resolve(null),
    ]);

    let update: Record<string, unknown>;
    if (normalizedDays <= 0) {
      update = { bannedUntil: null };
    } else {
      const now = Timestamp.now();
      const banDurationMs = normalizedDays * 24 * 60 * 60 * 1000;
      update = { bannedUntil: Timestamp.fromMillis(now.toMillis() + banDurationMs) };
    }

    await hashedRef.set(update, { merge: true });

    if (legacyRef && legacySnap && legacySnap.exists) {
      await legacyRef.set(update, { merge: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] Failed to update user ban', error);
    return NextResponse.json({ error: 'Не удалось обновить статус пользователя.' }, { status: 500 });
  }
}
