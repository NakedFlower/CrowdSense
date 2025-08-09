import { NextResponse } from 'next/server';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const required = ['lat', 'lon', 'region'] as const;
  for (const k of required) if (!searchParams.get(k)) return NextResponse.json({ error: `${k} required` }, { status: 400 });

  const url = new URL('/beacon_geo', API_BASE);
  searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const res = await fetch(url, { method: 'GET' });
  let json;
  try {
    json = await res.json();
  } catch {
    return NextResponse.json({ error: 'Failed to parse backend response' }, { status: 500 });
  }

  const results = json?.data?.ids ?? [];
  return NextResponse.json({ results }, { status: res.status, headers: { 'content-type': 'application/json' } });
}