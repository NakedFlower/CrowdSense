import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!; // 또는 서버 전용으로 분리 가능

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');
  const limit = searchParams.get('limit') ?? undefined;

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const url = new URL('/beacon_name', API_BASE);
  url.searchParams.set('name', name);
  if (limit) url.searchParams.set('limit', limit);

  const res = await fetch(url, { method: 'GET' });
  const data = await res.json();

  // 응답 포맷을 통일: data.ids → results
  return NextResponse.json({
    results: data?.data?.ids ?? [],
  });
}