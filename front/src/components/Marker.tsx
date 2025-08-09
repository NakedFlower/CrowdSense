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
};

export default function Marker({ map, lat, lon, title, zIndex, onClick, iconSrc, avg }: Props) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !window.kakao) return;

    const pos = new window.kakao.maps.LatLng(lat, lon);

    let imageSrc = '';
    if (avg !== undefined) {
      if (avg <= 10) {
        imageSrc = '/image/marker_green.svg';
      } else if (avg <= 20) {
        imageSrc = '/image/marker_yellow.svg';
      } else {
        imageSrc = '/image/marker_red.svg';
      }
    } else {
      imageSrc = iconSrc || '/image/marker_green.svg';
    }

    const imageSize = new window.kakao.maps.Size(32, 32); // 필요 시 조정
    const imageOption = { offset: new window.kakao.maps.Point(16, 32) };

    const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

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
  }, [map, lat, lon, title, zIndex, onClick, iconSrc, avg]);

  return null; // DOM 출력 없음
}