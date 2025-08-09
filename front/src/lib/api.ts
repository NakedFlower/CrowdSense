import { buildUrl, fetchJson } from './http';

export type Beacon = { id: string; name: string; lat: number; lon: number };

export async function getBeaconByName(name: string, limit?: number) {
  const url = buildUrl('/', '/api/beacon_name', { name, limit });
  return fetchJson<{ results: Beacon[] }>(url);
}
export async function getBeaconByGeo(args: { lat: number; lon: number; region: string; rad?: number; limit?: number; }) {
  const url = buildUrl('/', '/api/beacon_geo', args);
  return fetchJson<{ results: Beacon[] }>(url);
}
export async function getCrowdAvg(id: string, time?: number) {
  const url = buildUrl('/', '/api/crowd_avg', { id, time });
  return fetchJson<{ id: string; avg: number; unit: string }>(url);
}