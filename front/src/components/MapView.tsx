'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

export default function MapView() {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_APPKEY;

  useEffect(() => {
    if (!ready || !mapEl.current || !window.kakao) return;

    // SDK 로드 후 실행
    window.kakao.maps.load(() => {
      const center = new window.kakao.maps.LatLng(37.5665, 126.9780); // 서울 (임시)
      const map = new window.kakao.maps.Map(mapEl.current!, {
        center,
        level: 5, // 숫자 작을수록 확대
      });

      // 마커 예시
      const marker = new window.kakao.maps.Marker({ position: center });
      marker.setMap(map);

      // 필요하면 cleanup
      return () => {
        if (mapEl.current) mapEl.current.innerHTML = '';
      };
    });
  }, [ready]);

  return (
    <>
      {/* autoload=false 로드 후 kakao.maps.load로 초기화 */}
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&libraries=services,clusterer&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div ref={mapEl} className="absolute inset-0" />
    </>
  );
}