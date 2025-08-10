"use client";

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

  return (
    <aside
      className={
        "fixed top-0 right-0 h-full w-[360px] max-w-[85vw] bg-white shadow-xl transition-transform duration-300 ease-out z-[60] " +
        (open ? "translate-x-0" : "translate-x-full")
      }
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-base font-semibold">비콘 상세</h2>
        <button
          onClick={onClose}
          className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
          aria-label="Close sidebar"
        >
          <img src="/image/x_icon.svg" alt="닫기" className="w-4 h-4" />
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
                <div className="font-semibold">
                  {placeName || '건물명 없음'}
                </div>
                {address && (
                  <div className="text-xs text-gray-500 mt-0.5">{address}</div>
                )}
              </div>
            </section>

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

            {/* 추후: 건물 상세 API 연동 시 여기에 추가 */}
          </>
        )}
      </div>
    </aside>
  );
}
