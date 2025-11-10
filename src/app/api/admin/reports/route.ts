import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { isAdminRequest } from '@/lib/adminAuth';

type ReportStatus = 'pending' | 'reviewed' | 'action_taken';

type FirestoreReport = {
  responseId?: string;
  reason?: string;
  description?: string | null;
  status?: ReportStatus;
  reportedAt?: Timestamp;
};

const STATUSES: ReportStatus[] = ['pending', 'reviewed', 'action_taken'];

const toMillis = (value: unknown): number | null => {
  if (!value) return null;
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (typeof value === 'number') {
    return value;
  }
  return null;
};

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const limitParam = searchParams.get('limit');

    const status: ReportStatus = STATUSES.includes((statusParam as ReportStatus) ?? 'pending')
      ? ((statusParam as ReportStatus) ?? 'pending')
      : 'pending';

    let limit = 20;
    if (limitParam) {
      const parsed = Number(limitParam);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = Math.min(Math.floor(parsed), 100);
      }
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection('reports')
      .where('status', '==', status)
      .orderBy('reportedAt', 'desc')
      .limit(limit)
      .get();

    const reports = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as FirestoreReport & { responseId?: string };

        let response: {
          id: string;
          text: string;
          hidden: boolean;
          deviceId: string;
          reportCount: number;
          createdAt: number;
          moderationNote: string | null;
        } | null = null;
        let message: {
          id: string;
          text: string;
          category: string;
          createdAt: number;
        } | null = null;

        const responseId = data.responseId;
        if (responseId) {
          const responseSnap = await db.collection('responses').doc(responseId).get();
          if (responseSnap.exists) {
            const responseData = responseSnap.data() as Record<string, unknown>;
            const createdAt = toMillis(responseData.createdAt) ?? Date.now();
            response = {
              id: responseSnap.id,
              text: String(responseData.text ?? ''),
              hidden: Boolean(responseData.hidden ?? false),
              deviceId: String(responseData.deviceId ?? ''),
              reportCount: Number(responseData.reportCount ?? 0),
              createdAt,
              moderationNote:
                typeof responseData.moderationNote === 'string' && responseData.moderationNote.length > 0
                  ? String(responseData.moderationNote)
                  : null,
            };

            const messageId = responseData.messageId;
            if (typeof messageId === 'string' && messageId.length > 0) {
              const messageSnap = await db.collection('messages').doc(messageId).get();
              if (messageSnap.exists) {
                const messageData = messageSnap.data() as Record<string, unknown>;
                message = {
                  id: messageSnap.id,
                  text: String(messageData.text ?? ''),
                  category: String(messageData.category ?? ''),
                  createdAt: toMillis(messageData.createdAt) ?? Date.now(),
                };
              }
            }
          }
        }

        return {
          id: doc.id,
          reason: data.reason ?? 'other',
          description: data.description ?? null,
          status: (data.status as ReportStatus) ?? 'pending',
          reportedAt: toMillis(data.reportedAt) ?? Date.now(),
          response,
          message,
        };
      }),
    );

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('[admin] Failed to load reports', error);
    return NextResponse.json({ error: 'Не удалось загрузить жалобы.' }, { status: 500 });
  }
}
