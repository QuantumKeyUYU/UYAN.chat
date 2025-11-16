export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';

import { prisma } from '@/server/db/client';

export async function GET() {
  let dbStatus: 'ok' | 'error' = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = 'error';
    console.error('[api/health] Database check failed', error);
  }

  const moderationStatus = process.env.OPENAI_API_KEY ? 'ok' : 'missing';

  const ok = dbStatus === 'ok';

  return NextResponse.json(
    {
      ok,
      db: dbStatus,
      moderation: moderationStatus,
      legacyFirebase: 'unused',
    },
    { status: ok ? 200 : 503 },
  );
}
