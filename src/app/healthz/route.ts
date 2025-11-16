import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse('ok', {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
    },
  });
}
