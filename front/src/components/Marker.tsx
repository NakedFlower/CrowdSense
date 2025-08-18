'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  map: any;           // kakao.maps.Map
  lat: number;
  lon: number;
  title?: string;
  zIndex?: number;
  onClick?: () => void;
  /** 마커 이미지 경로 (예: '/image/marker_green.svg') */
  iconSrc?: string;
  avg?: number;
  active?: boolean;
  count?: number;
};

export default function Marker({ map, lat, lon, title, zIndex, onClick, iconSrc, avg, active, count }: Props) {
  function pickImageSrc() {
    if (avg !== undefined) {
      if (avg <= 10) return '/image/marker_green.svg';
      if (avg <= 20) return '/image/marker_yellow.svg';
      return '/image/marker_red.svg';
    }
    return iconSrc || '/image/marker_green.svg';
  }
  function makeMarkerImage(size: number) {
    const src = pickImageSrc();
    const imageSize = new window.kakao.maps.Size(size, size);
    const imageOption = { offset: new window.kakao.maps.Point(size / 2, size) };
    return new window.kakao.maps.MarkerImage(src, imageSize, imageOption);
  }

  function buildBadgeEl(count?: number) {
    if (!count || count <= 1) return null;
    const el = document.createElement('div');
    el.style.position = 'relative';
    el.style.transform = 'translate(12px, -27px)'; // 오른쪽 위로 살짝 이동 (마커 기준)
    el.style.pointerEvents = 'none';

    const span = document.createElement('span');
    span.textContent = String(count);
    span.style.minWidth = '18px';
    span.style.height = '18px';
    span.style.lineHeight = '18px';
    span.style.fontSize = '11px';
    span.style.fontWeight = '600';
    span.style.color = '#fff';
    span.style.textAlign = 'center';
    span.style.borderRadius = '9999px';
    span.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
    span.style.padding = '0 4px';
    // 배지 배경색은 혼잡도 최댓값(=avg prop) 기준으로 지정됨
    if (avg !== undefined) {
      if (avg <= 10) span.style.background = '#16a34a'; // green-600
      else if (avg <= 20) span.style.background = '#ca8a04'; // yellow-600
      else span.style.background = '#dc2626'; // red-600
    } else {
      span.style.background = '#0f172a'; // slate-900 fallback
    }

    el.appendChild(span);
    return el;
  }

  const markerRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);

  // Create marker once on mount
  useEffect(() => {
    if (!map || !window.kakao) return;

    const pos = new window.kakao.maps.LatLng(lat, lon);

    const markerImage = makeMarkerImage(active ? 70 : 40);

    const marker = new window.kakao.maps.Marker({
      position: pos,
      title,
      image: markerImage,
      zIndex,
    });

    marker.setMap(map);
    markerRef.current = marker;

    // 작은 카운트 배지 오버레이 (count>1일 때만 표시)
    if (typeof (window as any).kakao !== 'undefined') {
      const kakao = (window as any).kakao;
      const badgeEl = buildBadgeEl(undefined); // 초기에는 count 의존, 아래 effect에서 갱신
      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: badgeEl || document.createElement('div'),
        xAnchor: 0.5, // 마커 중심 기준
        yAnchor: 1.0, // 하단 기준 (배지 내부 transform으로 우상단에 배치)
        zIndex: (typeof zIndex === 'number' ? zIndex : 0) + 1,
      });
      overlay.setMap(map);
      overlayRef.current = overlay;
    }

    if (onClick) {
      window.kakao.maps.event.addListener(marker, 'click', onClick);
    }

    window.kakao.maps.event.addListener(marker, 'mouseover', () => setHovered(true));
    window.kakao.maps.event.addListener(marker, 'mouseout', () => setHovered(false));

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [map]);

  // Update marker position
  useEffect(() => {
    if (markerRef.current && window.kakao) {
      const pos = new window.kakao.maps.LatLng(lat, lon);
      markerRef.current.setPosition(pos);
    }
  }, [lat, lon]);

  // Update marker title
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setTitle(title || '');
    }
  }, [title]);

  // Update marker zIndex
  useEffect(() => {
    if (markerRef.current && zIndex !== undefined) {
      markerRef.current.setZIndex(zIndex);
    }
  }, [zIndex]);

  // Enlarge/shrink marker image smoothly by swapping MarkerImage (no re-create)
  useEffect(() => {
    if (!markerRef.current || !window.kakao) return;
    const img = makeMarkerImage(active ? 60 : hovered ? 40 : 32);
    markerRef.current.setImage(img);
    // lift active marker above others
    if (typeof zIndex === 'number') {
      markerRef.current.setZIndex(active ? Math.max(zIndex, 100) : zIndex);
    } else {
      markerRef.current.setZIndex(active ? 100 : 0);
    }
  }, [active, avg, iconSrc, zIndex, hovered]);

  useEffect(() => {
    if (!overlayRef.current || !window.kakao) return;

    const overlay = overlayRef.current as any;
    // 위치 갱신
    overlay.setPosition(new window.kakao.maps.LatLng(lat, lon));

    // 내용 갱신: count>1일 때만 배지 표시, 아니면 빈 요소로 치환
    const el = buildBadgeEl(count);
    if (el) {
      overlay.setContent(el);
      overlay.setZIndex((typeof zIndex === 'number' ? zIndex : 0) + (active ? 2 : 1));
      overlay.setMap(map);
    } else {
      // 숨기기 위해 빈 content로 대체
      overlay.setContent(document.createElement('div'));
      overlay.setMap(map);
    }
  }, [lat, lon, count, avg, active, hovered, map, zIndex]);

  return null; // DOM 출력 없음
}