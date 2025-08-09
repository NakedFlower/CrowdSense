'use client';

import MapView from '../components/MapView';

export default function Home() {
  return (
    <div className="h-screen w-full grid grid-cols-[64px_360px_1fr]">
      {/* LEFT RAIL */}
      <nav className="bg-white border-r flex flex-col items-center py-3 gap-3">
        {[
          { label: '지도 홈', icon: '🗺️' },
          { label: '길찾기', icon: '🧭' },
          { label: '버스/지하철', icon: '🚌' },
          { label: '거리뷰', icon: '📷' },
          { label: '저장', icon: '⭐' },
          { label: '더보기', icon: '⋯' },
        ].map((it) => (
          <button
            key={it.label}
            className="w-10 h-10 grid place-items-center rounded-lg hover:bg-gray-100 text-xl"
            title={it.label}
            aria-label={it.label}
          >
            {it.icon}
          </button>
        ))}

        <div className="mt-auto grid gap-2">
          <button className="w-10 h-10 grid place-items-center rounded-lg hover:bg-gray-100" title="내 위치">
            📍
          </button>
          <button className="w-10 h-10 grid place-items-center rounded-lg hover:bg-gray-100" title="메뉴">
            ☰
          </button>
        </div>
      </nav>

      {/* SIDEBAR */}
      <aside className="bg-white border-r overflow-y-auto">
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
        <div className="px-4 py-4 space-y-4">
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
                  <button className="text-xl leading-none" title="저장">☆</button>
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
      </aside>

      {/* MAP AREA */}
      <section className="relative bg-[#f7f7f7]">
        {/* Map type thumbnails (top-right) */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          {['일반지도', '위성지도', '지형지도'].map((t) => (
            <button
              key={t}
              className="w-24 h-16 bg-white border rounded-md shadow-sm grid place-items-center text-xs hover:bg-gray-50"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Map canvas (replace with real map) */}
        <div id="map" className="absolute inset-0">
          {/* placeholder grid */}
          <MapView />
        </div>

        {/* Right vertical tools */}
        <div className="absolute right-3 top-28 z-20 flex flex-col gap-2">
          {[
            { k: '테마', i: '🎨' },
            { k: '저장', i: '⭐' },
            { k: '지적편집도', i: '🗺️' },
            { k: '거리뷰', i: '📷' },
            { k: '변경', i: '↺' },
            { k: '연결', i: '🔌' },
            { k: '거리', i: '📐' },
            { k: '다운로드', i: '⬇️' },
            { k: '인쇄', i: '🖨️' },
            { k: '공유', i: '🔗' },
          ].map((b) => (
            <button
              key={b.k}
              className="w-12 h-12 rounded-lg bg-white border flex items-center justify-center hover:bg-gray-50 shadow-sm text-lg"
              title={b.k}
              aria-label={b.k}
            >
              {b.i}
            </button>
          ))}
        </div>

        {/* Zoom & my location (bottom-right) */}
        <div className="absolute right-3 bottom-28 z-20 flex flex-col gap-2">
          <button className="w-10 h-10 rounded-md bg-white border grid place-items-center hover:bg-gray-50 shadow-sm text-xl">
            ＋
          </button>
          <button className="w-10 h-10 rounded-md bg-white border grid place-items-center hover:bg-gray-50 shadow-sm text-xl">
            －
          </button>
          <button className="w-10 h-10 rounded-md bg-white border grid place-items-center hover:bg-gray-50 shadow-sm" title="내 위치">
            📍
          </button>
        </div>

        {/* Weather / scale (bottom-left) */}
        <div className="absolute left-3 bottom-5 z-20 flex items-end gap-4">
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
    </div>
  );
}