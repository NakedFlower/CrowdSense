'use client';

import { useEffect, useState } from 'react';
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

        {/* Weather / scale (bottom-left) */}
        <div className="absolute left-3 bottom-5 z-10 flex items-end gap-4">
          <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 shadow-sm">
            <span>🌧️</span>
            <div className="text-xs leading-tight">
              <div className="font-semibold">26°</div>
              <div className="text-gray-500">미세 초미세</div>
            </div>
          </div>
          <div className="text-[11px] text-gray-500">ⓒ NAVER 200m</div>
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
        <div className="p-3 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
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
              <h2 className="text-xl font-bold">근처 혼잡도</h2>
              <p className="text-[11px] text-gray-500 mt-1">현재 화면에 보이는 비콘 목록</p>
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
              <ul className="divide-y">
                {nearbyList.map((b) => (
                  <li
                    key={b.id}
                    className="py-2 flex items-start justify-between gap-3 cursor-pointer hover:bg-gray-50 rounded-md px-2"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('focus-beacon', {
                          detail: { id: b.id, lat: b.lat, lon: b.lon, zoom: 4 },
                        })
                      );
                    }}
                  >
                    <div className="min-w-0">
                      <div className="font-medium font-semibold truncate">{b.name || b.id}</div>
                    </div>
                    {typeof b.avg === 'number' && (
                      <span
                        className={
                          'shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' +
                          (b.avg <= 10
                            ? 'bg-green-100 text-green-700'
                            : b.avg <= 20
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700')
                        }
                        title={`avg: ${b.avg}`}
                      >
                        {b.avg <= 10 ? '원활' : b.avg <= 20 ? '보통' : '혼잡'}
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
                className="rounded-lg  overflow-hidden hover:shadow-sm transition-shadow bg-white"
              >
                <div className="h-44 bg-gray-100 grid place-items-center text-gray-400">
                  (이미지 {i + 1})
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