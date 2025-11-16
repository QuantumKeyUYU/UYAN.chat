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
    console.error('[api/health] Database check failed', error);
    dbStatus = 'error';
  }

  const response = {
    ok: dbStatus === 'ok',
    db: dbStatus,
    moderation: 'ok',
  };

  return NextResponse.json(response, { status: response.ok ? 200 : 503 });
}
