'use client';

import { useEffect, useRef } from 'react';

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
};

export default function Marker({ map, lat, lon, title, zIndex, onClick, iconSrc, avg, active }: Props) {
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

  const markerRef = useRef<any>(null);

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

    if (onClick) {
      window.kakao.maps.event.addListener(marker, 'click', onClick);
    }

    return () => {
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
    const img = makeMarkerImage(active ? 60 : 32);
    markerRef.current.setImage(img);
    // lift active marker above others
    if (typeof zIndex === 'number') {
      markerRef.current.setZIndex(active ? Math.max(zIndex, 100) : zIndex);
    } else {
      markerRef.current.setZIndex(active ? 100 : 0);
    }
  }, [active, avg, iconSrc, zIndex]);

  return null; // DOM 출력 없음
}