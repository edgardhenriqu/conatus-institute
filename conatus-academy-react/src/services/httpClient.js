const API_URL = '/api';

export function getHeaders() {
  const token = sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function request(url, options = {}) {
  const res = await fetch(url, { headers: getHeaders(), ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.erro || `Erro ${res.status}`);
  }
  return res.json();
}

export { API_URL };
