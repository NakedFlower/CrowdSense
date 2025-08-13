"use client";
type PlaceDetail = {
  address?: { road: string | null; jibun: string | null };
  place?: { name: string; category: string; phone: string | null; url: string; distance: string };
  opening_hours?: string[] | null;
  photos?: string[] | null;
};

import { useEffect, useState } from "react";
import { getCrowdAvg, type Beacon } from "../lib/api";

type Props = {
  open: boolean;
  beacon: Beacon | null;
  onClose: () => void;
};

export default function BeaconSidebar({ open, beacon, onClose }: Props) {
  const [avg, setAvg] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  useEffect(() => {
    setPlaceName(beacon?.name || null);
    setAddress(null);
  }, [beacon?.name]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!beacon?.id) {
        setAvg(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const r: any = await getCrowdAvg(beacon.id, 5);
        const v = r?.avg ?? r?.data?.avg;
        if (mounted) setAvg(typeof v === "number" ? v : null);
      } catch (e: any) {
        if (mounted) setError(e?.message || "failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [beacon?.id]);

  useEffect(() => {
    let alive = true;
    async function fetchDetail() {
      if (!beacon) { setDetail(null); return; }
      try {
        setDetailLoading(true);
        const qs = new URLSearchParams({
          lat: String(beacon.lat),
          lon: String(beacon.lon),
          radius: '20',
          name: beacon.name || ''
        });
        const res = await fetch(`/api/places/by-coord?${qs.toString()}`);
        if (!res.ok) throw new Error(`detail http ${res.status}`);
        const json = await res.json();
        if (alive) setDetail(json);
      } catch (e) {
        if (alive) setDetail(null);
      } finally {
        if (alive) setDetailLoading(false);
      }
    }
    fetchDetail();
    return () => { alive = false; };
  }, [beacon?.id, beacon?.lat, beacon?.lon]);

  return (
    <aside
      className={
        "fixed top-0 right-0 h-full w-[360px] max-w-[85vw] bg-blue-50 shadow-xl transition-transform duration-300 ease-out z-[60] " +
        (open ? "translate-x-0" : "translate-x-full")
      }
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-base font-semibold">상세 정보</h2>
        <button
          onClick={onClose}
          className="rounded text-gray-600 hover:bg-gray-100"
          aria-label="Close sidebar"
        >
          <img src="/image/x_icon.svg" alt="닫기" className="w-3 h-3" />
        </button>
      </div>

      <div className="p-4 space-y-3 text-sm">
        {!beacon ? (
          <p className="text-gray-500">마커를 선택하세요.</p>
        ) : (
          <>
            <section className="space-y-2">
              <div>
                <div className="text-xs text-gray-500">장소명</div>
                <div className="text-xl font-semibold">
                  {detail?.place?.name ?? placeName ?? '건물명 없음'}
                </div>
                {(detail?.address?.road || detail?.address?.jibun) && (
                  <div className="text-sm text-gray-500">{detail.address?.road ?? detail.address?.jibun}</div>
                )}
                {detail?.place?.phone && (
                  <div className="text-sm">{detail.place.phone}</div>
                )}
                {detail?.place?.url && (
                  <a href={detail.place.url} target="_blank" className="text-blue-600 underline">카카오맵에서 보기</a>
                )}
                {Array.isArray(detail?.photos) && detail.photos.length > 0 && (
                  <div className="pt-2">
                    <img
                      src={detail.photos[0]}
                      alt={(detail?.place?.name || placeName || 'place photo') as string}
                      className="w-full h-40 object-cover rounded-md"
                      loading="lazy"
                    />
                  </div>
                )}
                <section className="pt-3">
                  <div className="text-xs text-gray-500">혼잡도(avg, 최근 5분)</div>
                  {loading ? (
                    <div className="text-gray-500">불러오는 중…</div>
                  ) : error ? (
                    <div className="text-red-500">오류: {error}</div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{avg ?? "데이터 없음"}</span>
                      {typeof avg === "number" && (
                        <span
                          className={
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                            (avg <= 10
                              ? "bg-green-100 text-green-700"
                              : avg <= 20
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700")
                          }
                        >
                          {avg <= 10 ? "원활" : avg <= 20 ? "보통" : "혼잡"}
                        </span>
                      )}
                    </div>
                  )}
                </section>
                {Array.isArray(detail?.opening_hours) && detail.opening_hours.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs text-gray-500 mb-1">영업시간</div>
                    <ul className="text-sm leading-6 list-disc pl-4">
                      {detail.opening_hours.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {address && (
                  <div className="text-xs text-gray-500 mt-0.5">{address}</div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
