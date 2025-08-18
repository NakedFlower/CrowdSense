// src/app/api/crowd_stat/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://43.201.171.30:8080';

/**
 * 공통 파라미터 파싱: GET 쿼리 + POST(JSON/Form) 모두 처리
 */
async function readParams(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams;

  // 우선순위: querystring -> JSON body -> form body
  let id = search.get('id') ?? '';
  let periodRaw = search.get('period') ?? '';
  let bucket = search.get('bucket') ?? '';
  let tz = search.get('tz') ?? '';

  if (!id || !periodRaw) {
    const ct = req.headers.get('content-type') || '';
    try {
      if (ct.includes('application/json')) {
        const body = await req.json().catch(() => ({} as any));
        if (!id && body?.id) id = String(body.id);
        if (!periodRaw && body?.period != null) periodRaw = String(body.period);
        if (!bucket && body?.bucket) bucket = String(body.bucket);
        if (!tz && body?.tz) tz = String(body.tz);
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const form = await req.formData().catch(() => null);
        if (form) {
          if (!id && form.get('id')) id = String(form.get('id'));
          if (!periodRaw && form.get('period') != null)
            periodRaw = String(form.get('period'));
          if (!bucket && form.get('bucket')) bucket = String(form.get('bucket'));
          if (!tz && form.get('tz')) tz = String(form.get('tz'));
        }
      }
    } catch {
      // body 파싱 실패는 무시 (쿼리로만 처리)
    }
  }

  const period = Number.isFinite(Number(periodRaw)) ? Math.max(1, Number(periodRaw)) : 1;
  bucket = bucket?.trim().toLowerCase();
  tz = (tz?.trim() || 'Asia/Seoul');

  return { id: id?.trim(), period, bucket, tz };
}

/**
 * 백엔드로 프록시 호출 (문서 기준 POST, 쿼리로 전달)
 */
async function callBackend(id: string, period: number, bucket?: string, tz?: string) {
  const u = new URL('/crowd_stat', API_BASE);
  u.searchParams.set('id', id);
  u.searchParams.set('period', String(period));

  const res = await fetch(u.toString(), {
    method: 'POST',              // 스펙에 맞춰 POST 사용
    headers: { accept: 'application/json' },
    cache: 'no-store',           // 항상 최신값
  });

  // 백엔드에서 온 결과 그대로 전달
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  // Optional aggregation by hour
  if (bucket === 'hour') {
    try {
      const list: any[] | undefined = json?.data?.list ?? json?.list;
      const start: number | undefined = json?.data?.start ?? json?.start;
      if (Array.isArray(list) && list.length > 0) {
        const periodSec = period * 60;
        const stepSec = Math.max(60, Math.round(periodSec / list.length));
        const baseStart = typeof start === 'number' ? start : Math.floor(Date.now() / 1000) - list.length * stepSec;
        const sums = new Array(24).fill(0);
        const counts = new Array(24).fill(0);
        const timeZone = tz || 'Asia/Seoul';
        const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone });
        for (let i = 0; i < list.length; i++) {
          const v = Number(list[i]);
          if (!Number.isFinite(v)) continue;
          const ts = (baseStart + i * stepSec) * 1000;
          const parts = fmt.formatToParts(new Date(ts));
          const hhStr = parts.find(p => p.type === 'hour')?.value ?? '00';
          const hh = Math.max(0, Math.min(23, parseInt(hhStr, 10) || 0));
          sums[hh] += v;
          counts[hh] += 1;
        }
        const hourly = sums.map((s, h) => (counts[h] > 0 ? s / counts[h] : 0));
        const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
        const shaped = {
          code: json?.code ?? 200,
          data: { list: hourly, start: baseStart, labels, bucket: 'hour', tz: timeZone },
          message: json?.message ?? null,
        };
        return NextResponse.json(shaped, { status: 200 });
      }
    } catch (_) {
      // if aggregation fails, fall through and return original json
    }
  }

  // 백엔드 상태코드 그대로 매핑
  return NextResponse.json(json, { status: res.status });
}

/**
 * GET /api/crowd_stat?id=...&period=...
 */
export async function GET(req: NextRequest) {
  const { id, period, bucket, tz } = await readParams(req);
  if (!id) {
    return NextResponse.json(
      { code: 400, message: 'Missing required parameter: id' },
      { status: 400 }
    );
  }
  try {
    return await callBackend(id, period, bucket, tz);
  } catch (e: any) {
    return NextResponse.json(
      { code: 500, message: e?.message || 'crowd_stat proxy failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crowd_stat  (body/json or form, 혹은 query)
 */
export async function POST(req: NextRequest) {
  const { id, period, bucket, tz } = await readParams(req);
  if (!id) {
    return NextResponse.json(
      { code: 400, message: 'Missing required parameter: id' },
      { status: 400 }
    );
  }
  try {
    return await callBackend(id, period, bucket, tz);
  } catch (e: any) {
    return NextResponse.json(
      { code: 500, message: e?.message || 'crowd_stat proxy failed' },
      { status: 500 }
    );
  }
}