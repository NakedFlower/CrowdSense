'use client';

import { useState } from 'react';
import MapView from '../components/MapView';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function Home() {
  // 사이드바 열림/닫힘 상태
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="relative h-screen w-full grid grid-cols-[64px_1fr]">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* MAP AREA (full width, sidebar는 오버레이로 겹침) */}
      <section className="relative bg-[#f7f7f7]">
        {/* Map type thumbnails (top-right) */}
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          {['일반지도', '위성지도', '지형지도'].map((t) => (
            <button
              key={t}
              className="w-24 h-16 bg-white border rounded-md shadow-sm grid place-items-center text-xs hover:bg-gray-50"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Map canvas */}
        <div id="map" className="absolute inset-0">
          <MapView />
        </div>

        {/* Zoom & my location (bottom-right) */}
        <div className="absolute right-3 bottom-28 z-10 flex flex-col gap-2">
          <button className="w-10 h-10 rounded-md bg-white border grid place-items-center hover:bg-gray-50 shadow-sm text-xl">
            ＋
          </button>
          <button className="w-10 h-10 rounded-md bg-white border grid place-items-center hover:bg-gray-50 shadow-sm text-xl">
            －
          </button>
          <button
            className="w-10 h-10 rounded-md bg-white border grid place-items-center hover:bg-gray-50 shadow-sm"
            title="내 위치"
          >
            📍
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
        <div className="p-3 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            <span className="text-gray-500">🔎</span>
            <input
              placeholder="장소, 버스, 지하철, 도로 검색"
              className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="mt-2 text-xs text-blue-600 truncate">
            [이벤트] 지도앱 업데이트 안내 · 대중교통 칼착기 꿀팁…
          </div>
        </div>

        {/* Title */}
        <div className="px-4 pt-4">
          <h2 className="text-xl font-bold">용인시 처인구 남사읍</h2>
          <p className="text-[11px] text-gray-500 mt-1">오픈베타</p>
        </div>

        {/* SmartAround */}
        <div className="px-4 pt-4">
          <h3 className="text-sm font-semibold">
            <span className="font-bold">Smart</span> Around
          </h3>
          <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
            주변 <span className="text-blue-600">오후 시간대</span> 추천순 ▾
          </div>
        </div>

        {/* Result cards (dummy) */}
        <div className="px-4 py-4 space-y-4 overflow-y-auto h-[calc(100%-100px)]">
          {Array.from({ length: 8 }).map((_, i) => (
            <article
              key={i}
              className="rounded-lg border overflow-hidden hover:shadow-sm transition-shadow bg-white"
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
      </Sidebar>
    </div>
  );
}