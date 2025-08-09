export function buildUrl(base: string, path: string, params?: Record<string, any>) {
  // Ensure base is absolute
  let absoluteBase = base;
  if (!/^https?:\/\//i.test(base)) {
    if (typeof window !== 'undefined') {
      absoluteBase = window.location.origin + base;
    } else {
      absoluteBase = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + base;
    }
  }

  const url = new URL(path, absoluteBase);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

export async function fetchJson<T>(input: string | Request, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} → ${text}`);
  }
  return res.json() as Promise<T>;
}