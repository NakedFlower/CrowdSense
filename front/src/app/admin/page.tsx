'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCrowdAvg, getBeaconByName } from '../../lib/api'
import AdminHeader from '@/components/AdminHeader';

// ===== Mock (hardcoded) chart data =====
// Two series: avg congestion vs. today
const MOCK_LABELS = [
  '07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'
]
const MOCK_AVG =    [12, 20, 18, 35, 30, 28, 22, 15, 12, 25, 42, 40, 24, 16, 12]
const MOCK_TODAY =  [ 8, 12, 10, 18, 14, 30, 26, 10,  9, 12, 36, 38, 20, 14, 15]

// ===== A tiny, dependency-free line chart (SVG) =====
function LineChart({
  labels,
  series,
  width = 760,
  height = 280,
  padding = 32,
}: {
  labels: string[]
  series: { name: string; values: number[]; color?: string }[]
  width?: number
  height?: number
  padding?: number
}) {
  const flat = series.flatMap(s => s.values)
  const min = Math.min(0, ...flat)
  const max = Math.max(...flat)
  const w = width - padding * 2
  const h = height - padding * 2

  const x = (i: number) => (i / (labels.length - 1)) * w + padding
  const y = (v: number) => height - padding - ((v - min) / (max - min || 1)) * h

  const paths = useMemo(() => {
    return series.map(s => {
      const d = s.values
        .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)},${y(v)}`)
        .join(' ')
      return { name: s.name, d, color: s.color }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(series), width, height, padding])

  return (
    <svg width={width} height={height} className="w-full">
      {/* axes */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#111" strokeWidth={2}/>
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#111" strokeWidth={2}/>

      {/* y ticks */}
      {Array.from({ length: 4 }).map((_, i) => {
        const t = min + ((i + 1) / 4) * (max - min)
        const ty = y(t)
        return (
          <g key={i}>
            <line x1={padding} x2={width - padding} y1={ty} y2={ty} stroke="#e5e7eb"/>
            <text x={padding - 8} y={ty + 4} textAnchor="end" className="fill-gray-500 text-[10px]">{Math.round(t)}</text>
          </g>
        )
      })}

      {/* x labels */}
      {labels.map((lb, i) => (
        <text key={lb} x={x(i)} y={height - padding + 16} textAnchor="middle" className="fill-gray-500 text-[10px]">
          {lb}
        </text>
      ))}

      {/* series */}
      {paths.map((p, idx) => (
        <path key={idx} d={p.d} fill="none" stroke={p.color ?? (idx === 0 ? '#94a3b8' : '#fb923c')} strokeWidth={3} strokeLinecap="round"/>
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

  const chartSeries = [
    { name: '평균', values: MOCK_AVG, color: '#94a3b8' },
    { name: '오늘', values: MOCK_TODAY, color: '#fb923c' },
  ]

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-500">
      {/* Top bar */}
      <div className="mx-auto max-w-7xl">
        <AdminHeader title={`${(searchParams.getAll('beacon')[0] || beaconName || 'Beacon')} Admin`} />

        {/* Content grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
          {/* Main card */}
          <section className="rounded-2xl bg-white p-4 md:p-6 shadow">

            <h2 className="mb-2 text-xl font-semibold">기간 / 시간대별 혼잡도 변화</h2>
            <div className="overflow-x-auto rounded-lg border bg-white transition-transform transition-shadow duration-150 hover:scale-[1.02] hover:shadow-md">
              <LineChart labels={MOCK_LABELS} series={chartSeries} />
            </div>

            {/* Store info & actions */}
            <div className="mt-6 grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_auto_auto]">
              <div className="space-y-2 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">비콘 정보</div>
                {beacons.length === 0 ? (
                  <div className="text-slate-500">선택된 비콘이 없습니다.</div>
                ) : (
                  <ul className="space-y-2">
                    {beacons.map((b, i) => (
                      <li key={`${b.id || 'noid'}-${b.name || 'noname'}-${i}`} className="flex items-center justify-between gap-3 rounded-md border p-2 bg-white transition-transform transition-shadow duration-150 hover:scale-[1.02] hover:shadow-md">
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
              </div>
              <div className="self-start">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2"><span className="h-2 w-6 rounded bg-slate-400 inline-block"/> 평균</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-6 rounded bg-orange-400 inline-block"/> 오늘</div>
                </div>
              </div>
            </div>
          </section>

          {/* Filters */}
          <aside className="rounded-2xl bg-white p-4 md:p-6 shadow">
            <h3 className="mb-4 text-base font-semibold">Filters</h3>

            <div className="space-y-5">
              {/* Dates */}
              <div>
                <div className="mb-2 text-xs font-semibold text-slate-500">Dates</div>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-md border bg-white p-[2px] transition-transform transition-shadow duration-150 hover:scale-[1.02] hover:shadow-md">
                    <input type="date" value={dateRange.from} onChange={(e)=>setDateRange(v=>({...v, from: e.target.value}))} className="w-full rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 border-none outline-none"/>
                  </div>
                  <div className="flex-1 rounded-md border bg-white p-[2px] transition-transform transition-shadow duration-150 hover:scale-[1.02] hover:shadow-md">
                    <input type="date" value={dateRange.to} onChange={(e)=>setDateRange(v=>({...v, to: e.target.value}))} className="w-full rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 border-none outline-none"/>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="transition-transform transition-shadow duration-150 hover:scale-[1.02] hover:shadow-md">
                  <button className="w-full rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                    확인
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer spacing */}
        <div className="h-6"/>
      </div>
    </div>
  )
}
