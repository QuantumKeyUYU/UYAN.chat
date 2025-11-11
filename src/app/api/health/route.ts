export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

interface CheckResult {
  status: 'ok' | 'error';
  details?: string;
}

const createResponse = (checks: Record<string, CheckResult>) => {
  const ok = Object.values(checks).every((check) => check.status === 'ok');
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
};

export async function GET() {
  const checks: Record<string, CheckResult> = {
    firestore: { status: 'ok' },
    openai: { status: 'ok' },
    cron: { status: 'ok' },
  };

  try {
    const db = getAdminDb();
    await db.collection('messages').limit(1).get();
  } catch (error) {
    console.error('Health check: firestore unavailable', error);
    checks.firestore = {
      status: 'error',
      details: 'Firebase Admin недоступен или не настроен',
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    checks.openai = {
      status: 'error',
      details: 'Отсутствует OPENAI_API_KEY',
    };
  }

  if (!process.env.CRON_SECRET) {
    checks.cron = {
      status: 'error',
      details: 'Отсутствует CRON_SECRET для служебных задач',
    };
  }

  return createResponse(checks);
}
