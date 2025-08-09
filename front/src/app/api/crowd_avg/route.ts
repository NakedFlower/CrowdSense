import { NextResponse } from 'next/server';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const time = searchParams.get('time') ?? undefined;
  const url = new URL('/crowd_avg', API_BASE);
  url.searchParams.set('id', id);
  if (time) url.searchParams.set('time', time);

  const res = await fetch(url, { method: 'GET' });
  const body = await res.text();
  return new NextResponse(body, { status: res.status, headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' } });
}