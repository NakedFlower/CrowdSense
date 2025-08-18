// src/app/api/beacon_region/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_BASE: string =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://43.201.171.30:8080';

type BeaconRegionOK = {
  code?: number;
  data?: {
    ids?: Array<{
      id: string;
      name?: string;
      type?: string;
      lat?: number;
      lon?: number;
      radius?: number;
    }>;
  };
  message?: string | null;
  [k: string]: unknown;
};

type BeaconRegionErr = {
  code: number;
  message: string;
};

type ReadParams = { region: string; limit: number };

/** GET 쿼리 + POST(JSON/Form) 모두 지원해서 파라미터 읽기 */
async function readParams(req: NextRequest): Promise<ReadParams> {
  const url = new URL(req.url);
  const search = url.searchParams;

  // 우선순위: querystring -> JSON body -> form body
  let region = search.get('region') ?? '';
  let limitRaw = search.get('limit') ?? '';

  if (!region || !limitRaw) {
    const ct = req.headers.get('content-type') || '';
    try {
      if (ct.includes('application/json')) {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        if (!region && typeof body?.region !== 'undefined') region = String(body.region);
        if (!limitRaw && typeof body?.limit !== 'undefined') limitRaw = String(body.limit);
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const form = await req.formData().catch(() => null);
        if (form) {
          const fRegion = form.get('region');
          const fLimit = form.get('limit');
          if (!region && fRegion != null) region = String(fRegion);
          if (!limitRaw && fLimit != null) limitRaw = String(fLimit);
        }
      }
    } catch {
      // body 파싱 실패는 무시
    }
  }

  // limit 보정 (기본 10, 음수/NaN 방지, 필요하면 상한선 100 등)
  let limit = Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : 10;
  if (!Number.isFinite(limit) || limit <= 0) limit = 10;
  // 필요 시 상한선 (예: 100)
  if (limit > 100) limit = 100;

  return { region: region.trim(), limit };
}

/** 백엔드 호출 (문서상 GET) */
async function callBackend(region: string, limit: number) {
  const u = new URL('/beacon_region', API_BASE);
  u.searchParams.set('region', region);
  u.searchParams.set('limit', String(limit));

  const res = await fetch(u.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });

  const text = await res.text();
  let json: BeaconRegionOK | { raw: string };
  try {
    json = JSON.parse(text) as BeaconRegionOK;
  } catch {
    json = { raw: text };
  }

  return NextResponse.json(json, { status: res.status });
}

/** GET /api/beacon_region?region=Seoul&limit=10 */
export async function GET(req: NextRequest) {
  const { region, limit } = await readParams(req);
  if (!region) {
    return NextResponse.json<BeaconRegionErr>(
      { code: 400, message: 'Missing required parameter: region' },
      { status: 400 }
    );
  }
  try {
    return await callBackend(region, limit);
  } catch (e: any) {
    return NextResponse.json<BeaconRegionErr>(
      { code: 500, message: e?.message || 'beacon_region proxy failed' },
      { status: 500 }
    );
  }
}

/** POST /api/beacon_region  (JSON/Form/Query 모두 가능) */
export async function POST(req: NextRequest) {
  const { region, limit } = await readParams(req);
  if (!region) {
    return NextResponse.json<BeaconRegionErr>(
      { code: 400, message: 'Missing required parameter: region' },
      { status: 400 }
    );
  }
  try {
    return await callBackend(region, limit);
  } catch (e: any) {
    return NextResponse.json<BeaconRegionErr>(
      { code: 500, message: e?.message || 'beacon_region proxy failed' },
      { status: 500 }
    );
  }
}