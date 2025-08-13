'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Prefill from query if available
  const [beaconName, setBeaconName] = useState('')
  const [beaconId, setBeaconId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // enter animation for the card
  const [enter, setEnter] = useState(false)
  useEffect(() => {
    // trigger after first paint
    const t = requestAnimationFrame(() => setEnter(true))
    return () => cancelAnimationFrame(t)
  }, [])

  useEffect(() => {
    const qName = searchParams.get('beacon') || ''
    const qId = searchParams.get('id') || ''
    if (qName) setBeaconName(qName)
    if (qId) setBeaconId(qId)
  }, [searchParams])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!beaconName.trim()) {
      setError('Beacon Name을 입력해주세요.')
      return
    }

    try {
      setLoading(true)
      // 1) Lookup by name using local API route (GET)
      const url = `/api/beacon_name?name=${encodeURIComponent(beaconName.trim())}&limit=10`
      const res = await fetch(url, { method: 'GET', headers: { 'accept': 'application/json' } })
      if (!res.ok) {
        const text = await res.text()
        console.error('API non-OK:', res.status, text)
        setError('서버 통신 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
        return
      }
      let json: any = {}
      try {
        json = await res.json()
      } catch (e) {
        console.error('JSON parse error', e)
      }

      // Normalize various possible shapes -> array of beacon objects { id, name, lat, lon, type, radius }
      const raw = Array.isArray(json)
        ? json
        : (json?.data?.ids ?? json?.ids ?? json?.data ?? json?.results ?? [])

      let list: any[] = []
      if (Array.isArray(raw)) {
        list = raw.map((item: any) => {
          if (item && typeof item === 'object') {
            // handle alternate keys like beacon_name
            const name = (item.name ?? item.beacon_name ?? '').toString()
            const id = (item.id ?? item.beacon_id ?? '').toString()
            return {
              id,
              name,
              lat: item.lat ?? item.latitude ?? null,
              lon: item.lon ?? item.lng ?? item.longitude ?? null,
              type: item.type ?? null,
              radius: item.radius ?? null,
            }
          }
          // if item is primitive, treat as id
          return { id: String(item), name: '' }
        })
      }

      // Case-insensitive helpers
      const norm = (s: any) => (s ?? '').toString().trim().toLowerCase()
      const wantName = norm(beaconName)

      // Build a list to send
      let selected: any[] = []
      if (wantName) {
        // Exact name matches first; if none, use partial contains
        const exacts = list.filter((b: any) => norm(b.name) === wantName)
        selected = exacts.length > 0 ? exacts : list.filter((b: any) => norm(b.name).includes(wantName))
      } else {
        // No filters provided -> send all results
        selected = list
      }

      if (!selected || selected.length === 0) {
        setError('해당 이름/ID의 비콘을 찾을 수 없어요. 철자를 확인해주세요.')
        return
      }

      console.debug('Beacon candidates resolved:', selected)

      // 2) Navigate to /admin with multiple beacons as repeated params
      const params = new URLSearchParams()
      // Cap to a reasonable number to prevent URL overflow
      const MAX = 20
      selected.slice(0, MAX).forEach((c: any) => {
        params.append('beacon', c.name || beaconName.trim())
        if (c.lat != null) params.append('lat', String(c.lat))
        if (c.lon != null) params.append('lon', String(c.lon))
        if (c.type) params.append('type', c.type)
        if (c.radius != null) params.append('radius', String(c.radius))
      })

      router.push(`/admin?${params.toString()}`)
    } catch (err) {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-0px)] w-full bg-gray-500 py-10">
      <div className="mx-auto max-w-3xl p-4">
        <section
          className={
            `mx-auto rounded-[28px] bg-white p-8 md:p-12 shadow-[0_6px_0_0_rgba(0,0,0,0.08)] min-h-[80vh] flex flex-col justify-start ` +
            `will-change-transform transition-transform transition-opacity duration-500 ease-out ` +
            (enter ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')
          }
        >
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-700">CrowdSense</h1>
            <p className="mt-2 text-sm text-slate-500">관리자용</p>
          </header>

          <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-6 w-full">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Beacon Name</label>
              <input
                value={beaconName}
                onChange={(e) => setBeaconName(e.target.value)}
                placeholder="beacon name"
                className="w-full rounded-[14px] border px-4 py-2 text-lg outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input
                value={beaconId}
                onChange={(e) => setBeaconId(e.target.value)}
                placeholder="password"
                className="w-full rounded-[14px] border px-4 py-2 text-lg outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {error && (
              <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[14px] bg-gray-400 px-4 py-2 text-lg font-semibold tracking-wide text-white shadow hover:brightness-95 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'SIGN IN'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}