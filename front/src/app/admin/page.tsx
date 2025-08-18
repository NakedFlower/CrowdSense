'use client'
import React, { useEffect, useMemo, useState } from 'react'
// no extra imports needed; we'll use fetch to hit /api/crowd_stat
import { useSearchParams } from 'next/navigation'
import { getCrowdAvg, getBeaconByName } from '../../lib/api'
import AdminHeader from '@/components/AdminHeader';

// ===== Mock (hardcoded) chart data =====
// Two series: avg congestion vs. today
const MOCK_LABELS = [
  '07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'
]
const MOCK_AVG =    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
const MOCK_TODAY =  [ 0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0]
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);

// ===== A tiny, dependency-free line chart (SVG) =====
function LineChart({
  labels,
  series,
  width = 760,
  height = 280,
  padding = 32,
}: {
  labels: string[]
  series: { name: string; values: number[]; color?: string; dash?: number[]; width?: number; opacity?: number }[]
  width?: number
  height?: number
  padding?: number
}) {
  const L = Math.max(1, labels.length);
  const normalized = useMemo(() => series.map(s => ({
    ...s,
    values: Array.isArray(s.values) ? s.values.slice(0, L) : [],
  })), [series, L]);

  const flat = normalized.flatMap(s => s.values.filter(v => Number.isFinite(v)) as number[]);
  const min = flat.length ? Math.min(0, ...flat) : 0;
  const maxCandidate = flat.length ? Math.max(...flat) : 1;
  const max = maxCandidate === min ? min + 1 : maxCandidate;

  const w = width - padding * 2;
  const h = height - padding * 2;

  const x = (i: number) => (i / (L - 1)) * w + padding;
  const y = (v: number) => height - padding - ((v - min) / (max - min || 1)) * h;

  const paths = useMemo(() => {
    return normalized.map(s => {
      const d = s.values
        .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)},${y(v)}`)
        .join(' ');
      const dash = s.dash ?? (s.name.includes('평균') ? [6, 6] : undefined);
      const width = s.width ?? 3;
      const opacity = s.opacity ?? 1;
      return { name: s.name, d, color: s.color, dash, width, opacity };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(normalized), width, height, padding]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="block w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* axes */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#111" strokeWidth={2}/>
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#111" strokeWidth={2}/>

      {/* y ticks */}
      {Array.from({ length: 4 }).map((_, i) => {
        const t = min + ((i + 1) / 4) * (max - min);
        const ty = y(t);
        return (
          <g key={i}>
            <line x1={padding} x2={width - padding} y1={ty} y2={ty} stroke="#e5e7eb"/>
            <text x={padding - 8} y={ty + 4} textAnchor="end" className="fill-gray-500 text-[10px]">{Math.round(t)}</text>
          </g>
        )
      })}

      {/* x labels */}
      {labels.map((lb, i) => (
        <text key={lb + i} x={x(i)} y={height - padding + 16} textAnchor="middle" className="fill-gray-500 text-[10px]">
          {lb}
        </text>
      ))}

      {/* series */}
      {paths.map((p, idx) => (
        <path
          key={idx}
          d={p.d}
          fill="none"
          stroke={p.color ?? (idx === 0 ? '#94a3b8' : '#fb923c')}
          strokeWidth={p.width}
          strokeLinecap="round"
          strokeOpacity={p.opacity}
          strokeDasharray={p.dash ? p.dash.join(',') : undefined}
        />
      ))}
    </svg>
  )
}

// ===== Badge/Chip =====
const Badge: React.FC<React.PropsWithChildren<{ tone?: 'success'|'neutral'|'warn' }>> = ({ tone='neutral', children }) => (
  <span className={
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' +
    (tone==='success' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
     tone==='warn'    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' :
                        'bg-slate-50 text-slate-700 ring-1 ring-slate-200')
  }>{children}</span>
)

export default function AdminDashboardPage() {
  const [query, setQuery] = useState('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  // ===== crowd_stat state =====
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [period, setPeriod] = useState<number>(1);
  const [stat, setStat] = useState<number[] | null>(null);
  const [statStart, setStatStart] = useState<number | null>(null);
  const [weeklyStat, setWeeklyStat] = useState<number[] | null>(null);
  const [weeklyStart, setWeeklyStart] = useState<number | null>(null);
  const [showWeeklyAvg, setShowWeeklyAvg] = useState(true);
  const [statLoading, setStatLoading] = useState(false);
  const [statError, setStatError] = useState<string | null>(null);
  const [hourlyLabels, setHourlyLabels] = useState<string[] | null>(null);
  const [weeklyHourly, setWeeklyHourly] = useState<number[] | null>(null);

  async function loadCrowdStat(id: string, p = period) {
    try {
      setStatLoading(true);
      setStatError(null);
      setStat(null);
      setStatStart(null);
      setHourlyLabels(null);

      // period는 "일" 단위. bucket/tz는 백엔드 스펙에 없음
      const qs = new URLSearchParams({ id, period: String(Math.max(1, Math.min(30, p))) });
      const res = await fetch(`/api/crowd_stat?${qs.toString()}`, { cache: 'no-store' });
      const text = await res.text();
      let json: any; try { json = JSON.parse(text); } catch { json = { raw: text }; }

      const list = json?.data?.list ?? json?.list ?? null;
      const start = json?.data?.start ?? json?.start ?? null;

      if (!Array.isArray(list)) {
        setStatError('리스트 데이터가 없습니다.');
        return;
      }

      const nums = list.map((v: any) => Number(v));
      // 최근 24개(하루치)만 표시
      const slice = nums.length > 24 ? nums.slice(-24) : nums;
      setStat(slice);

      if (typeof start === 'number') {
        // slice가 뒤쪽 24개라면 라벨 시작 offset 반영
        const offsetHours = nums.length - slice.length;
        const labels = Array.from({ length: slice.length }, (_, i) => fmtHM(start + (offsetHours + i) * 3600));
        setHourlyLabels(labels);
        setStatStart(start + offsetHours * 3600);
      } else {
        // fallback: 00:00 ~ 23:00
        const labels = Array.from({ length: slice.length }, (_, i) => `${String(i % 24).padStart(2,'0')}:00`);
        setHourlyLabels(labels);
      }
    } catch (e: any) {
      setStatError(e?.message || 'crowd_stat 불러오기 실패');
    } finally {
      setStatLoading(false);
    }
  }
  async function loadWeeklyRaw(id: string) {
    try {
      const qs = new URLSearchParams({ id, period: String(7) });
      const res = await fetch(`/api/crowd_stat?${qs.toString()}`, { cache: 'no-store' });
      const text = await res.text();
      let json: any; try { json = JSON.parse(text); } catch { json = { raw: text }; }
      const list = json?.data?.list ?? json?.list ?? null;
      if (Array.isArray(list)) {
        const nums = list.map((v: any) => Number(v));
        // 보통 24개가 내려오도록 설계, 아니라면 24개로 보정
        const fixed = nums.length === 24 ? nums : Array.from({ length: 24 }, (_, i) => nums[i] ?? null);
        setWeeklyHourly(fixed as number[]);
      } else setWeeklyHourly(null);
    } catch {
      setWeeklyHourly(null);
    }
  }

  // crowd_stat → 차트용 라벨/시리즈 생성
  function fmtHM(epochSec: number) {
    const d = new Date(epochSec * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  const chart = useMemo(() => {
    const labels = hourlyLabels ?? HOUR_LABELS;
    if (Array.isArray(stat) && stat.length > 0) {
      const series: { name: string; values: number[]; color?: string; dash?: number[] }[] = [];
      if (showWeeklyAvg && Array.isArray(weeklyHourly) && weeklyHourly.length > 0) {
        series.push({ name: '평균', values: weeklyHourly, color: '#94a3b8', dash: [6,6] });
      }
      series.push({ name: '오늘', values: stat, color: '#fb923c' });
      return { labels, series };
    }
    return {
      labels: HOUR_LABELS,
      series: [
        { name: '평균', values: MOCK_AVG, color: '#94a3b8' },
        { name: '오늘', values: MOCK_TODAY, color: '#fb923c' },
      ],
    };
  }, [stat, hourlyLabels, weeklyHourly, showWeeklyAvg]);

  type BeaconRow = { id: string; name: string; avg: number | null };
  const [beacons, setBeacons] = useState<BeaconRow[]>([]);

  // Selected beacon name from URL, e.g., /admin?beacon=한양대점
  const searchParams = useSearchParams()
  const beaconName = searchParams.get('beacon')
  const addr = searchParams.get('road') || searchParams.get('jibun') || ''
  const phone = searchParams.get('phone') || ''
  const placeUrl = searchParams.get('url') || ''
  const beaconId = searchParams.get('id') || 'BEACON-0001'

  useEffect(() => {
    const hasAny = searchParams.getAll('beacon').length > 0 || !!(searchParams.get('beacon') || '').trim();
    if (!hasAny) {
      window.location.href = '/admin/login';
    }
  }, [searchParams]);

  // Build beacons list from URL params and fetch avg for each
  useEffect(() => {
    const names = searchParams.getAll('beacon');
    const ids = searchParams.getAll('id');

    // Fallback to single params if arrays are empty
    const fallbackName = searchParams.get('beacon') || '';
    const fallbackId = searchParams.get('id') || '';

    const base: BeaconRow[] = ids.length > 0
      ? ids.map((id, i) => ({ id, name: names[i] || names[0] || '', avg: null }))
      : (fallbackId ? [{ id: fallbackId, name: fallbackName, avg: null }] : []);

    // If no ids but there are names, still show rows (avg will be null)
    const rows = base.length > 0 ? base : (names.length > 0 ? names.map(n => ({ id: '', name: n, avg: null })) : []);

    let alive = true;
    (async () => {
      // 1) Separate rows that already have id vs. name-only rows
      const withId = rows.filter(r => !!r.id);
      const nameOnly = rows.filter(r => !r.id && r.name);

      // 2) Resolve name-only rows → fetch ALL matches per unique name
      const uniqueNames = Array.from(new Set(nameOnly.map(r => r.name)));
      const expandedByName: { id: string; name: string }[] = [];
      await Promise.all(uniqueNames.map(async (nm) => {
        try {
          const resp: any = await getBeaconByName(nm!, 25);
          const list = resp?.results || resp?.data?.ids || [];
          list.forEach((it: any) => {
            if (it?.id) expandedByName.push({ id: String(it.id), name: it.name || nm! });
          });
        } catch {
          // ignore errors per name
        }
      }));

      // 3) Merge rows: keep explicit ids + all resolved (name-only)
      const merged: { id: string; name: string }[] = [
        ...withId.map(r => ({ id: r.id, name: r.name })),
        ...expandedByName,
      ];

      // 4) Deduplicate by id (prefer first occurrence)
      const dedupMap = new Map<string, { id: string; name: string }>();
      for (const m of merged) {
        if (m.id && !dedupMap.has(m.id)) dedupMap.set(m.id, m);
      }
      const finalList = Array.from(dedupMap.values());

      // 5) Fetch avg for each id
      const withAvg = await Promise.all(finalList.map(async (b) => {
        let avg: number | null = null;
        try {
          const rr: any = await getCrowdAvg(b.id, 5);
          const v = rr?.avg ?? rr?.data?.avg;
          avg = (typeof v === 'number') ? v : null;
        } catch { avg = null; }
        return { id: b.id, name: b.name, avg } as BeaconRow;
      }));

      if (alive) setBeacons(withAvg);
    })();
    return () => { alive = false };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-300">
      {/* Top bar */}
      <div className="mx-auto max-w-7xl">
        <AdminHeader title={`${(searchParams.getAll('beacon')[0] || beaconName || 'Beacon')} Admin`} />

        {/* Content grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_440px]">
          {/* Main card */}
          <section className="rounded-2xl bg-white p-4 md:p-6 shadow">

            <h2 className="mb-2 text-xl font-semibold">기간 / 시간대별 혼잡도 변화</h2>
            <div className="relative overflow-x-auto rounded-lg border bg-white transition-transform duration-150 hover:scale-[1.02] hover:shadow-md mx-auto w-full">
              {/* Legend: 평균 / 오늘 */}
              <div className="absolute right-3 top-3 z-10 flex items-center gap-3 text-xs select-none">
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <span className="inline-block h-2 w-5 rounded bg-[#94a3b8]" />
                  평균(점선)
                </span>
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <span className="inline-block h-2 w-5 rounded bg-[#fb923c]" />
                  오늘
                </span>
              </div>
              <LineChart labels={chart.labels} series={chart.series} />
            </div>

            {/* 선택 비콘의 시간대별 원시 값 패널 */}
            {Array.isArray(stat) && stat.length > 0 && (
              <div className="mt-4 rounded-lg border bg-white p-3 transition-transform duration-150 hover:scale-[1.02] hover:shadow-md">
                <h3 className="mb-2 text-sm font-semibold">선택 비콘 · 시간대별 값</h3>
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm">
                  {stat.map((v, i) => (
                    <li key={i} className="flex items-center justify-between rounded-md border px-2 py-1">
                      <span className="text-slate-500">{(hourlyLabels ?? HOUR_LABELS)[i] ?? `${String(i % 24).padStart(2,'0')}:00`}</span>
                      <span className="font-semibold">{Number.isFinite(v) ? Math.round(v * 100) / 100 : '-'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* crowd_stat toolbar */}
            <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-700">
                {selected ? (
                  <>선택된 비콘: <span className="font-semibold">{selected.name}</span> <span className="text-slate-400">(ID: {selected.id})</span></>
                ) : (
                  <span className="text-slate-500">좌측 비콘 목록에서 항목을 클릭하면 혼잡도(stat)를 불러옵니다.</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <label className="ml-2 inline-flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-slate-900"
                    checked={showWeeklyAvg}
                    onChange={(e) => setShowWeeklyAvg(e.target.checked)}
                  />
                  <span className="text-slate-700">평균선</span>
                </label>
                <button
                  className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 transition-transform duration-150 hover:scale-[1.03]"
                  onClick={() => {
                    if (selected?.id) {
                      loadCrowdStat(selected.id, period);
                      loadWeeklyRaw(selected.id); // ← 이 줄 추가
                    }
                  }}
                  disabled={!selected?.id}
                >
                  새로고침
                </button>
              </div>
            </div>
          </section>

          {/* Right sidebar: 비콘 정보 */}
          <aside className="rounded-2xl bg-white p-4 md:p-6 shadow">
            <h3 className="mb-4 text-base font-semibold">비콘 정보</h3>

            {beacons.length === 0 ? (
              <div className="text-slate-500 text-sm">선택된 비콘이 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {beacons.map((b, i) => (
                  <li
                    key={`${b.id || 'noid'}-${b.name || 'noname'}-${i}`}
                    className={`py-2 flex items-center justify-between gap-3 rounded-md border p-2 bg-white transition-transform transition-shadow duration-150 hover:scale-[1.02] hover:shadow-md cursor-pointer ${selected?.id===b.id ? 'ring-2 ring-slate-300' : ''}`}
                    onClick={() => {
                      if (!b.id) return;
                      setSelected({ id: b.id, name: b.name || b.id });
                      loadCrowdStat(b.id, period);
                      loadWeeklyRaw(b.id);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{b.name || b.id || '이름 없음'}</div>
                      {b.id && <div className="text-xs text-slate-500 truncate">ID: {b.id}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof b.avg === 'number' ? (
                        <>
                          <span className="font-semibold">{b.avg}</span>
                          <Badge tone={b.avg <= 10 ? 'success' : b.avg <= 20 ? 'neutral' : 'warn'}>
                            {b.avg <= 10 ? '원활' : b.avg <= 20 ? '보통' : '혼잡'}
                          </Badge>
                        </>
                      ) : (
                        <span className="text-slate-400">데이터 없음</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>

        {/* Footer spacing */}
        <div className="h-6"/>
      </div>
    </div>
  )
}
