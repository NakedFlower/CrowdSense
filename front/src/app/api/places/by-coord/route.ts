import { NextRequest, NextResponse } from 'next/server';

const KAKAO = process.env.KAKAO_REST_API_KEY!; // Kakao Local REST API key (server-side only)
const GOOGLE = process.env.GOOGLE_MAPS_API_KEY; // optional

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius') ?? '150'; // widen default
  const name = (searchParams.get('name') || '').trim();
  if (!lat || !lon) return NextResponse.json({ error: 'lat/lon required' }, { status: 400 });

  const debug: any = { called: [], errors: [] };
  if (!KAKAO) {
    return NextResponse.json({ error: 'KAKAO_REST_API_KEY missing', debug }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const KH = {
    Authorization: `KakaoAK ${KAKAO}`,
    // KA header needs os or origin token. Include both to be safe.
    // Format: "sdk/<ver> os/<platform> lang/<locale> device/<type> origin/<origin>"
    KA: `sdk/4.0.0 os/nodejs lang/ko-KR device/PC origin/${origin}`,
    Referer: origin,
  } as Record<string, string>;

  // 1) 주소(도로/지번)
  const addrUrl = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lon}&y=${lat}`;
  debug.called.push({ type: 'coord2address', url: addrUrl });
  let addr: any = null;
  try {
    const r = await fetch(addrUrl, { headers: KH });
    if (!r.ok) {
      debug.errors.push({ type: 'coord2address', status: r.status, text: await r.text() });
    } else {
      addr = await r.json();
    }
  } catch (e: any) {
    debug.errors.push({ type: 'coord2address', err: String(e) });
  }
  const road = addr?.documents?.[0]?.road_address?.address_name ?? null;
  const jibun = addr?.documents?.[0]?.address?.address_name ?? null;

  // 2) 주변 장소(카테고리 우선 탐색, 거리순)
  // broaden categories
  const cats = ['CE7','FD6','CS2','MT1','PO3','SC4','AT4','HP8','PM9','BK9','SW8','OL7'];
  let place: any = null;
  for (const c of cats) {
    const u = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${c}&x=${lon}&y=${lat}&radius=${radius}&sort=distance&size=10`;
    debug.called.push({ type: 'category', code: c, url: u });
    let j: any = null;
    try {
      const r = await fetch(u, { headers: KH });
      if (!r.ok) {
        debug.errors.push({ type: 'category', code: c, status: r.status, text: await r.text() });
      } else {
        j = await r.json();
      }
    } catch (e: any) {
      debug.errors.push({ type: 'category', code: c, err: String(e) });
    }
    if (j?.documents?.length) { place = j.documents[0]; break; }
  }

  // Fallback: 키워드 검색 (name 제공 시)
  if (!place && name) {
    const ku = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(name)}&x=${lon}&y=${lat}&radius=${radius}&sort=distance&page=1&size=5`;
    debug.called.push({ type: 'keyword', name, url: ku });
    try {
      const r = await fetch(ku, { headers: KH });
      if (!r.ok) {
        debug.errors.push({ type: 'keyword', status: r.status, text: await r.text() });
      } else {
        const kj = await r.json();
        if (kj?.documents?.length) {
          place = kj.documents[0];
        }
      }
    } catch (e: any) {
      debug.errors.push({ type: 'keyword', err: String(e) });
    }
  }

  // If no address found, try region code as broader address and secondary keyword
  let roadName = road;
  let jibunName = jibun;
  let regionName: string | null = null;
  if (!roadName && !jibunName) {
    const regUrl = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lon}&y=${lat}`;
    debug.called.push({ type: 'coord2regioncode', url: regUrl });
    try {
      const r = await fetch(regUrl, { headers: KH });
      if (!r.ok) {
        debug.errors.push({ type: 'coord2regioncode', status: r.status, text: await r.text() });
      } else {
        const reg = await r.json();
        regionName = reg?.documents?.[0]?.address_name ?? null;
        jibunName = regionName || null;
      }
    } catch (e: any) {
      debug.errors.push({ type: 'coord2regioncode', err: String(e) });
    }
  }
  if (!place && regionName) {
    const ku2 = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(regionName)}&x=${lon}&y=${lat}&radius=${radius}&sort=distance&page=1&size=5`;
    debug.called.push({ type: 'keyword-region', query: regionName, url: ku2 });
    try {
      const r = await fetch(ku2, { headers: KH });
      if (!r.ok) {
        debug.errors.push({ type: 'keyword-region', status: r.status, text: await r.text() });
      } else {
        const kj = await r.json();
        if (kj?.documents?.length) {
          place = kj.documents[0];
        }
      }
    } catch (e: any) {
      debug.errors.push({ type: 'keyword-region', err: String(e) });
    }
  }

  // 3) (선택) 구글 Places로 영업시간 및 사진 보강
  let opening_hours: string[] | null = null;
  let photos: string[] | null = null;
  if (place && GOOGLE) {
    const text = encodeURIComponent(`${place.place_name} ${roadName || jibunName || ''}`);
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${text}&inputtype=textquery&locationbias=point:${lat},${lon}&key=${GOOGLE}`;
    const find = await fetch(findUrl).then(r => r.json()).catch(() => null);
    const pid = find?.candidates?.[0]?.place_id;
    if (pid) {
      const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pid}&fields=name,opening_hours,formatted_phone_number,website,url,photos&language=ko&key=${GOOGLE}`;
      const det = await fetch(detailUrl).then(r => r.json()).catch(() => null);
      let oh = det?.result?.opening_hours?.weekday_text ?? null;
      opening_hours = oh;
      if (det?.result?.photos?.length) {
        photos = det.result.photos.map((p: any) =>
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${GOOGLE}`
        );
      }
    }
  }

  return NextResponse.json({
    address: { road: roadName, jibun: jibunName },
    place: place && {
      name: place.place_name,
      category: place.category_name,
      phone: place.phone || null,
      url: place.place_url,
      distance: place.distance,
    },
    opening_hours,
    photos,
    debug,
  });
}