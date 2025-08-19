'use client';

import { useEffect, useState, useRef } from 'react';
import MapView from '../components/MapView';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

type NearbyItem = { id: string; name?: string; lat: number; lon: number; avg: number | null };

export default function Home() {
  // 사이드바 열림/닫힘 상태
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 사이드바 모드 및 근처 목록 상태
  const [sidebarMode, setSidebarMode] = useState<'route' | 'nearby'>('route');
  const [nearbyList, setNearbyList] = useState<NearbyItem[]>([]);

  // Cache of resolved place names by beacon id
  const placeNameCache = useRef<Record<string, string>>({});
  const [placeNames, setPlaceNames] = useState<Record<string, string>>({});

  // MapView에서 보내는 'sidebar-open' 커스텀 이벤트 수신
  useEffect(() => {
    function onSidebarOpen(e: any) {
      const detail = e?.detail;
      if (!detail) return;
      if (detail.mode === 'nearby') {
        setSidebarMode('nearby');
        setNearbyList(Array.isArray(detail.items) ? detail.items : []);
        setSidebarOpen(true);
      } else if (detail.mode === 'route') {
        setSidebarMode('route');
        setSidebarOpen(true);
      }
    }
    window.addEventListener('sidebar-open', onSidebarOpen as any);
    return () => window.removeEventListener('sidebar-open', onSidebarOpen as any);
  }, []);

  // 맵 확대/이동 시 근처 목록 초기화 (nearby 모드 UX 일관성)
  useEffect(() => {
    function onViewportChanged() {
      // nearby 모드에서만 초기화
      setNearbyList([]);
      placeNameCache.current = {};
      setPlaceNames({});
    }
    window.addEventListener('map-viewport-changed', onViewportChanged);
    return () => window.removeEventListener('map-viewport-changed', onViewportChanged);
  }, []);

  // Resolve display names for nearby items using our Places API (coord → place name)
  useEffect(() => {
    if (sidebarMode !== 'nearby' || nearbyList.length === 0) return;
    let alive = true;
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        nearbyList.map(async (b) => {
          if (!b?.id) return;
          if (placeNameCache.current[b.id]) return; // already cached
          try {
            const qs = new URLSearchParams({
              lat: String(b.lat),
              lon: String(b.lon),
              radius: '20',
              name: b.name || '',
            });
            const res = await fetch(`/api/places/by-coord?${qs.toString()}`);
            const json = await res.json();
            const resolved = json?.place?.name || b.name || b.id;
            placeNameCache.current[b.id] = resolved;
            updates[b.id] = resolved;
          } catch (e) {
            // fallback to existing b.name or id
            placeNameCache.current[b.id] = b.name || b.id;
            updates[b.id] = b.name || b.id;
          }
        })
      );
      if (alive && Object.keys(updates).length) {
        setPlaceNames((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [sidebarMode, nearbyList]);

  return (
    <div className="relative h-screen w-full grid grid-cols-[64px_1fr] text-black">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* MAP AREA (full width, sidebar는 오버레이로 겹침) */}
      <section className="relative bg-[#f7f7f7]">
        {/* Map type thumbnails (top-right) */}
        {/* <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          {['일반지도', '위성지도', '지형지도'].map((t) => (
            <button
              key={t}
              className="w-24 h-16 bg-white border rounded-md shadow-sm grid place-items-center text-xs hover:bg-gray-50"
            >
              {t}
            </button>
          ))}
        </div> */}

        {/* Map canvas */}
        <div id="map" className="absolute inset-0">
          <MapView />
        </div>

        {/* Zoom & my location (bottom-right) */}
        <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-2">
          <button className="w-10 h-10 rounded-md bg-white border-2 grid place-items-center hover:bg-gray-50 shadow-sm text-xl">
            <img src="/image/plus_icon.svg" className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-md bg-white border-2 grid place-items-center hover:bg-gray-50 shadow-sm text-xl">
            <img src="/image/minus_icon.svg" className="w-4 h-4" />
          </button>
          <button
            className="w-10 h-10 rounded-md bg-white border-2 grid place-items-center hover:bg-gray-50 shadow-sm"
            title="내 위치"
          >
            <img src="/image/location_icon.svg" className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* SIDEBAR (component) */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        width={360}
        offset={64}
      >
        {/* Search */}
        <div className="p-3 sticky top-0 bg-blue-50 z-10">
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
            <span className="text-gray-500">
              <img src="/image/magnifier_icon.svg" className="w-4 h-4" />
            </span>
            <input
              placeholder="장소, 버스, 지하철, 도로 검색"
              className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
        {/* Title */}
        <div className="px-4 pt-4">
          {sidebarMode === 'nearby' ? (
            <>
              <h2 className="text-xl font-bold">매장 혼잡도</h2>
              <p className="text-[11px] text-gray-500 mt-1">현재 화면에 보이는 매장</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">서울특별시 성동구 왕십리로</h2>
              <p className="text-[11px] text-gray-500 mt-1">오픈베타</p>
            </>
          )}
        </div>

        {/* Content */}
        {sidebarMode === 'nearby' ? (
          <div className="px-4 py-4 space-y-2 overflow-y-auto h-[calc(100%-100px)]">
            {nearbyList.length === 0 ? (
              <p className="text-sm text-gray-500">현재 화면에 보이는 비콘이 없습니다.</p>
            ) : (
              <ul>
                {nearbyList.map((b) => (
                  <li
                    key={b.id}
                    className="py-2 flex items-start justify-between gap-3 cursor-pointer hover:bg-white px-2 rounded-lg transition-colors transform hover:scale-[1.02] transition-transform duration-150"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('focus-beacon', {
                          detail: { id: b.id, lat: b.lat, lon: b.lon, zoom: 4 },
                        })
                      );
                    }}
                  >
                    <div className="min-w-0">
                      <div className="font-medium font-semibold truncate">{placeNames[b.id] || b.name || b.id}</div>
                    </div>
                    {typeof b.avg === 'number' && (
                      <span
                        className={
                          'self-center shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' +
                          (b.avg <= 50
                            ? 'bg-green-100 text-green-700'
                            : b.avg <= 300
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700')
                        }
                        title={`avg: ${b.avg}`}
                      >
                        {b.avg <= 50 ? '원활' : b.avg <= 300 ? '보통' : '혼잡'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="h-24" />
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4 overflow-y-auto h-[calc(100%-100px)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <article
                key={i}
                className="rounded-lg overflow-hidden hover:shadow-sm transition-shadow bg-white transform hover:scale-[1.02] transition-transform duration-150"
              >
                <div className="h-44 bg-gray-100 relative overflow-hidden">
                  <img
                    src="/image/temp.jpg"
                    alt="place thumbnail"
                    className="w-full h-full object-cover select-none"
                    loading="lazy"
                    draggable={false}
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-[15px]">무진앙고 본점</h4>
                    <button className="text-xl leading-none" title="저장">
                      ☆
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">베이커리 · 예약</div>
                  <p className="text-sm mt-2">
                    소금빵과 아메리카노의 완벽한 페어링
                    <span className="text-gray-500"> · 리뷰 118 · 평균 10,000원</span>
                  </p>
                </div>
              </article>
            ))}
            <div className="h-24" />
          </div>
        )}
      </Sidebar>
    </div>
  );
}