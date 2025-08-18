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
  // 근처 혼잡도 모드일 때만 마커 보이기
  const [showNearbyMarkers, setShowNearbyMarkers] = useState(false);
  const localItemsRef = useRef<{ beacon: Beacon; lat: number; lon: number; avg: number | null }[]>([]);
  const [collectedItems, setCollectedItems] = useState<{ beacon: Beacon; lat: number; lon: number; avg: number | null }[]>([]);
  // 원본 좌표 비콘 목록 저장용
  const baseBeaconsRef = useRef<Beacon[]>([]);

  // 줌/센터 변경 시 클러스터 재계산 트리거용 상태
  const [clusterTick, setClusterTick] = useState(0);

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

  // 동일 위경도(완전 동일) 마커들을 픽셀 단위로 살짝 벌려 배치
  function nudgeSameCoord(
    items: { beacon: Beacon; lat: number; lon: number; avg: number | null }[],
    radiusPx = 12
  ) {
    const map = mapRef.current;
    if (!map || !window.kakao) return items;

    const buckets = new Map<string, { beacon: Beacon; lat: number; lon: number; avg: number | null }[]>();
    items.forEach((it) => {
      const key = `${it.lat},${it.lon}`; // 완전 동일한 좌표만 묶음
      const arr = buckets.get(key) || [];
      arr.push(it);
      buckets.set(key, arr);
    });

    const proj = map.getProjection();
    const out: { beacon: Beacon; lat: number; lon: number; avg: number | null }[] = [];

    buckets.forEach((group) => {
      if (group.length === 1) {
        out.push(group[0]);
        return;
      }
      // 중심 픽셀 좌표
      const cx = group[0].lat;
      const cy = group[0].lon;
      const centerLL = new window.kakao.maps.LatLng(cx, cy);
      const centerPt = proj.pointFromCoords(centerLL);
      const n = group.length;
      for (let i = 0; i < n; i++) {
        const theta = (2 * Math.PI * i) / n;
        const px = centerPt.x + radiusPx * Math.cos(theta);
        const py = centerPt.y + radiusPx * Math.sin(theta);
        const ll = proj.coordsFromPoint(new window.kakao.maps.Point(px, py));
        out.push({ beacon: group[i].beacon, lat: ll.getLat(), lon: ll.getLng(), avg: group[i].avg });
      }
    });

    return out;
  }

  // 화면 픽셀 기준으로 가까운 마커들을 하나로 묶기 (radiusPx 내)
  function clusterByPixel(
    items: { beacon: Beacon; lat: number; lon: number; avg: number | null }[],
    radiusPx = 10
  ) {
    const map = mapRef.current;
    if (!map || !window.kakao) return items.map((x) => ({ ...x, members: [x] }));

    const proj = map.getProjection();

    // 각 아이템의 픽셀 좌표 구하기
    const pts = items.map((it) => ({
      it,
      pt: proj.pointFromCoords(new window.kakao.maps.LatLng(it.lat, it.lon)),
    }));

    const used = new Array(pts.length).fill(false);
    const clusters: { lat: number; lon: number; avg: number | null; maxAvg: number | null; members: typeof items }[] = [] as any;

    for (let i = 0; i < pts.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      const group = [pts[i]] as typeof pts;

      for (let j = i + 1; j < pts.length; j++) {
        if (used[j]) continue;
        const dx = pts[i].pt.x - pts[j].pt.x;
        const dy = pts[i].pt.y - pts[j].pt.y;
        if (Math.hypot(dx, dy) <= radiusPx) {
          used[j] = true;
          group.push(pts[j]);
        }
      }

      // 대표 위치는 픽셀 좌표의 평균 → 위경도로 역변환
      const ax = group.reduce((s, g) => s + g.pt.x, 0) / group.length;
      const ay = group.reduce((s, g) => s + g.pt.y, 0) / group.length;
      const ll = proj.coordsFromPoint(new window.kakao.maps.Point(ax, ay));

      // avg는 그룹 평균(유효값만), maxAvg는 그룹 내 최댓값
      const avgs = group.map((g) => g.it.avg).filter((v) => typeof v === 'number') as number[];
      const avg = avgs.length ? avgs.reduce((s, v) => s + v, 0) / avgs.length : null;
      const maxAvg = avgs.length ? Math.max(...avgs) : null;

      clusters.push({
        lat: ll.getLat(),
        lon: ll.getLng(),
        avg,
        maxAvg,
        members: group.map((g) => g.it),
      });
    }

    return clusters;
  }

  // 현재 뷰포트(지도 bounds)에 보이는 비콘만 추려서 사이드바 아이템 형태로 반환
  function getVisibleNearbyItems(): NearbySidebarItem[] {
    const map = mapRef.current;
    if (!map || !window.kakao) return [];
    const bounds = map.getBounds();
    const items = localItemsRef.current || [];
    return items
      .filter((x) => bounds.contain(new window.kakao.maps.LatLng(x.lat, x.lon)))
      .map((x) => ({ id: x.beacon.id, name: x.beacon.name, lat: x.lat, lon: x.lon, avg: x.avg ?? null }));
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
        // 원본 좌표 저장(줌 변경 시 클러스터 재계산용)
        baseBeaconsRef.current = baseItems;

        // 5) 평균 혼잡도 조회 후 원본 좌표로 수집 (클러스터링은 렌더 단계에서 수행)
        const items = baseItems;
        if (items.length > 0) {
          const bounds = new window.kakao.maps.LatLngBounds();

          const avgs = await Promise.all(
            items.map(async (b) => {
              try {
                const r: any = await getCrowdAvg(b.id, 5);
                const avg = r?.avg ?? r?.data?.avg;
                return typeof avg === 'number' ? avg : null;
              } catch {
                return null;
              }
            })
          );

          const collected: { beacon: Beacon; lat: number; lon: number; avg: number | null }[] = [];
          items.forEach((b, idx) => {
            const pos = new window.kakao.maps.LatLng(b.lat, b.lon);
            bounds.extend(pos);
            const avgVal = (avgs[idx] ?? null) as number | null;
            collected.push({ beacon: b, lat: b.lat, lon: b.lon, avg: avgVal });
          });

          // Save for nearby list queries & later rendering
          localItemsRef.current = collected;
          setCollectedItems(collected);

          // 줌 변경 시 마커 클러스터 재계산을 위해 강제 리렌더 트리거
          window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
            try {
              setClusterTick((t) => t + 1);
              window.dispatchEvent(new CustomEvent('map-viewport-changed'));
            } catch (e) {
              console.warn('cluster re-layout failed', e);
            }
          });

          // 중심 변경 시에도 마커 클러스터 재계산 트리거
          window.kakao.maps.event.addListener(map, 'center_changed', () => {
            setClusterTick((t) => t + 1);
            window.dispatchEvent(new CustomEvent('map-viewport-changed'));
          });

          // 이동/확대가 끝난 뒤 근처 목록을 재계산해서 사이드바에 전달
          window.kakao.maps.event.addListener(map, 'idle', () => {
            try {
              const list = getVisibleNearbyItems();
              window.dispatchEvent(new CustomEvent('sidebar-open', { detail: { mode: 'nearby', items: list } }));
            } catch (e) {
              console.warn('idle nearby publish failed', e);
            }
          });

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

  // Build marker nodes using clustered result at current zoom/center
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!showNearbyMarkers) {
      setMarkerNodes([]);
      return;
    }

    // 동일 좌표는 살짝 벌려서 겹침 방지 → 그 다음 픽셀 반경 클러스터링 적용
    const nudged = nudgeSameCoord(collectedItems, 12);
    const clusters = clusterByPixel(nudged, 20);

    const nodes: React.ReactNode[] = clusters.map((c, idx) => {
      // 대표 마커는 첫 멤버 기준으로 title/active를 정함
      const first = c.members[0];
      const isActive = !!selectedBeacon && c.members.some((m) => m.beacon.id === selectedBeacon.id);
      const count = c.members.length;
      const colorAvg = c.maxAvg ?? c.avg ?? undefined; // 색상은 최댓값 기준
      return (
        <Marker
          key={first.beacon.id + ':' + idx}
          map={map}
          lat={c.lat}
          lon={c.lon}
          title={first.beacon.name || String(first.beacon.id)}
          avg={colorAvg}
          count={count}
          active={isActive}
          onClick={() => {
            if (count === 1) {
              setSelectedBeacon(first.beacon);
              setSidebarOpen(true);
            } else {
              // 여러 개면 사이드바에 목록 표시 (줌인 대신)
              const items: NearbySidebarItem[] = c.members.map((m) => ({
                id: m.beacon.id,
                name: m.beacon.name,
                lat: m.lat,
                lon: m.lon,
                avg: m.avg,
              }));
              window.dispatchEvent(
                new CustomEvent('sidebar-open', { detail: { mode: 'nearby', items } })
              );
              setShowNearbyMarkers(true);
              setSidebarOpen(true);
              setSelectedBeacon(null);
              // 필요하면 중앙으로만 살짝 이동
              map.panTo(new window.kakao.maps.LatLng(c.lat, c.lon));
            }
          }}
        />
      );
    });

    setMarkerNodes(nodes);
  }, [collectedItems, selectedBeacon?.id, showNearbyMarkers, clusterTick]);

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
        setShowNearbyMarkers(true);
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

  // Listen: sidebar-open → nearby면 on, 아니면 off
  useEffect(() => {
    function onSidebarOpen(e: any) {
      const mode = e?.detail?.mode;
      if (mode === 'nearby') setShowNearbyMarkers(true);
      else setShowNearbyMarkers(false);
    }
    window.addEventListener('sidebar-open', onSidebarOpen as any);
    return () => window.removeEventListener('sidebar-open', onSidebarOpen as any);
  }, []);

  return (
    <>
      {/* Kakao SDK 로드 (클라이언트 전용) */}
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false&libraries=services,clusterer`}
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