'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { getBeaconByGeo, getCrowdAvg, type Beacon } from '../lib/api';
import Marker from '../components/Marker';
import BeaconSidebar from '../components/BeaconSidebar';

// Type for sidebar event payload (nearby list)
type NearbySidebarItem = { id: string; name?: string; lat: number; lon: number; avg: number | null };

type MapViewProps = {
  /** 백엔드 region 파라미터 (예: 'Seoul' 또는 '서울') */
  region?: string;
  /** 검색 반경 (백엔드 단위 기준, 기본 50) */
  rad?: number;
  /** 최대 개수 (백엔드 상한 25 권장) */
  limit?: number;
};

export default function MapView({
  region = 'Seoul',
  rad = 50,
  limit = 25,
}: MapViewProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [markerNodes, setMarkerNodes] = useState<React.ReactNode[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBeacon, setSelectedBeacon] = useState<Beacon | null>(null);
  const localItemsRef = useRef<{ beacon: Beacon; lat: number; lon: number; avg: number | null }[]>([]);
  const [collectedItems, setCollectedItems] = useState<{ beacon: Beacon; lat: number; lon: number; avg: number | null }[]>([]);

  const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_APPKEY!;

  // region별 기본 중심 좌표 (사용자가 center를 넘기지 않아도 동작하게)
  const defaultCenter = useMemo(() => {
    const table: Record<string, { lat: number; lon: number }> = {
      Seoul: { lat: 37.5665, lon: 126.9780 },
      '서울': { lat: 37.5665, lon: 126.9780 },
      // 필요 시 지역 추가
      // Busan/부산 등...
    };
    return table[region] ?? { lat: 37.5665, lon: 126.9780 };
  }, [region]);

  // 기존 마커 정리
  const clearMarkers = () => {
    setMarkerNodes([]); // Unmount Marker components -> they cleanup themselves
  };

  // 한국 근처 좌표만 우선 표시 (너무 멀거나 0,0 같은 값 제외)
  const isKRBounds = (lat: number, lon: number) =>
    lat >= 32 && lat <= 39.5 && lon >= 124 && lon <= 132;

  // 같은 좌표가 여러 개면 서로 겹치지 않게 미세 오프셋을 준다.
  function jitterPositions(items: Beacon[]): { beacon: Beacon; lat: number; lon: number }[] {
    const buckets = new Map<string, Beacon[]>();
    items.forEach((b) => {
      const key = `${b.lat?.toFixed?.(6)},${b.lon?.toFixed?.(6)}`; // 좌표 스냅
      const arr = buckets.get(key) || [];
      arr.push(b);
      buckets.set(key, arr);
    });

    const J = 0.0003; // ~30m 정도
    const out: { beacon: Beacon; lat: number; lon: number }[] = [];

    buckets.forEach((arr) => {
      if (arr.length === 1) {
        out.push({ beacon: arr[0], lat: arr[0].lat, lon: arr[0].lon });
      } else {
        // 중심을 기준으로 원형으로 살짝 배치
        const cx = arr[0].lat;
        const cy = arr[0].lon;
        const n = arr.length;
        const r = J;
        arr.forEach((b, i) => {
          const theta = (2 * Math.PI * i) / n;
          const lat = cx + r * Math.sin(theta);
          const lon = cy + r * Math.cos(theta);
          out.push({ beacon: b, lat, lon });
        });
      }
    });

    return out;
  }

  useEffect(() => {
    if (!ready || !mapEl.current || !window.kakao) return;
    let disposed = false;

    window.kakao.maps.load(async () => {
      if (disposed) return;
      // 1) 맵 초기화 (1회)
      if (!mapRef.current) {
        const initialCenter = new window.kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lon);
        mapRef.current = new window.kakao.maps.Map(mapEl.current!, {
          center: initialCenter,
          level: 5,
        });
      }
      const map = mapRef.current;

      try {
        // 2) 데이터 가져오기: beacon_geo 사용 (파라미터는 region + 내부 defaultCenter)
        let results: Beacon[] = [];
        const resp = await getBeaconByGeo({
          lat: defaultCenter.lat,
          lon: defaultCenter.lon,
          region,
          rad,
          limit,
        });
        results = (resp as any)?.results ?? (resp as any)?.data?.ids ?? [];
        console.log('[beacon_geo via api.ts]', {
          region,
          center: defaultCenter,
          rad,
          count: results?.length ?? 0,
        });

        // 3) 기존 마커 제거 후 새로 그리기
        clearMarkers();

        // 4) 좌표 유효성 검사
        const valid: Beacon[] = (results || []).filter(
          (b: Beacon) =>
            typeof b?.lat === 'number' &&
            typeof b?.lon === 'number' &&
            !Number.isNaN(b.lat) &&
            !Number.isNaN(b.lon)
        );

        // 한국 범위 우선. 없으면 전체 사용
        const krOnly = valid.filter((b) => isKRBounds(b.lat, b.lon));
        const baseItems = krOnly.length > 0 ? krOnly : valid;

        // 5) 겹치는 좌표에 대한 미세 오프셋
        const items = jitterPositions(baseItems);

        if (items.length > 0) {
          const bounds = new window.kakao.maps.LatLngBounds();

          // crowd_avg를 병렬로 조회 (time=5 기본)
          const avgs = await Promise.all(
            items.map(async ({ beacon: b }) => {
              try {
                const r: any = await getCrowdAvg(b.id, 5);
                const avg = r?.avg ?? r?.data?.avg;
                return typeof avg === 'number' ? avg : null;
              } catch {
                return null; // 실패 시 null 처리
              }
            })
          );

          const collected: { beacon: Beacon; lat: number; lon: number; avg: number | null }[] = [];
          items.forEach(({ beacon: b, lat, lon }, idx) => {
            const pos = new window.kakao.maps.LatLng(lat, lon);
            bounds.extend(pos);
            const avgVal = (avgs[idx] ?? null) as number | null;
            collected.push({ beacon: b, lat, lon, avg: avgVal });
          });

          // Save for nearby list queries & later rendering
          localItemsRef.current = collected;
          setCollectedItems(collected);

          if (!bounds.isEmpty()) {
            map.setBounds(bounds);
          }
        } else {
          console.warn('[map] no usable coordinates', { region, center: defaultCenter, results });
        }
      } catch (err) {
        console.error('[map] fetch error:', err);
      }
    });

    return () => {
      disposed = true;
      clearMarkers();
    };
  }, [ready, region, rad, limit, defaultCenter.lat, defaultCenter.lon]);

  // Build marker nodes when data or selection changes (no refetch, no map reset)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const nodes: React.ReactNode[] = collectedItems.map(({ beacon: b, lat, lon, avg }) => (
      <Marker
        key={b.id}
        map={map}
        lat={lat}
        lon={lon}
        title={b.name || String(b.id)}
        avg={avg ?? undefined}
        active={selectedBeacon?.id === b.id}
        onClick={() => {
          setSelectedBeacon(b);
          setSidebarOpen(true);
        }}
      />
    ));
    setMarkerNodes(nodes);
  }, [collectedItems, selectedBeacon?.id]);

  // Listen: focus on a beacon from outside (e.g., nearby list item click)
  useEffect(() => {
    function onFocusBeacon(e: any) {
      try {
        const detail = e?.detail || {};
        const map = mapRef.current;
        if (!map || !window.kakao) return;

        const { id, lat, lon, zoom } = detail;
        const items = localItemsRef.current || [];
        const found = id ? items.find((x) => x.beacon.id === id) : undefined;
        const tLat = typeof lat === 'number' ? lat : found?.lat;
        const tLon = typeof lon === 'number' ? lon : found?.lon;
        if (typeof tLat !== 'number' || typeof tLon !== 'number') return;

        const pos = new window.kakao.maps.LatLng(tLat, tLon);
        const level = typeof zoom === 'number' ? zoom : 4; // smaller = closer
        map.setLevel(level);
        map.panTo(pos);

        const beacon = found?.beacon || items.find((x) => x.lat === tLat && x.lon === tLon)?.beacon;
        if (beacon) {
          setSelectedBeacon(beacon);
          setSidebarOpen(true);
        }
      } catch (err) {
        console.warn('focus-beacon handler failed', err);
      }
    }
    window.addEventListener('focus-beacon', onFocusBeacon as any);
    return () => window.removeEventListener('focus-beacon', onFocusBeacon as any);
  }, []);

  // Listen: when Header asks to open nearby list, compute visible beacons and notify the existing sidebar
  useEffect(() => {
    function onOpenNearby() {
      try {
        const map = mapRef.current;
        if (!map || !window.kakao) return;
        const b = map.getBounds();
        const visible = (localItemsRef.current || []).filter((x) =>
          b.contain(new window.kakao.maps.LatLng(x.lat, x.lon))
        );
        const items: NearbySidebarItem[] = visible.map((v) => ({
          id: v.beacon.id,
          name: v.beacon.name,
          lat: v.lat,
          lon: v.lon,
          avg: v.avg,
        }));
        window.dispatchEvent(
          new CustomEvent('sidebar-open', { detail: { mode: 'nearby', items } })
        );
      } catch (e) {
        console.warn('open-nearby handler failed', e);
      }
    }
    window.addEventListener('open-nearby', onOpenNearby as any);
    return () => window.removeEventListener('open-nearby', onOpenNearby as any);
  }, []);

  return (
    <>
      {/* Kakao SDK 로드 (클라이언트 전용) */}
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&libraries=services,clusterer&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div ref={mapEl} className="absolute inset-0" />
      {markerNodes}
      <BeaconSidebar
        open={sidebarOpen}
        beacon={selectedBeacon}
        onClose={() => {
            setSidebarOpen(false)
            setSelectedBeacon(null);
        }}
      />
    </>
  );
}