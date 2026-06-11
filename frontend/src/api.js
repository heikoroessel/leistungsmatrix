const BASE = import.meta.env.VITE_API_URL || '';

export async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler');
  return data;
}

export const post = (path, body, headers = {}) =>
  api(path, { method: 'POST', body, headers });

export const get = (path, headers = {}) =>
  api(path, { method: 'GET', headers });

export const del = (path, body, headers = {}) =>
  api(path, { method: 'DELETE', body, headers });
