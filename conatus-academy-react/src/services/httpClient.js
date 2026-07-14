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

/**
 * Baixa um binário protegido (hoje: o áudio da narração das aulas).
 *
 * Um <audio src="/api/..."> não serve: a tag não manda o Authorization, e a rota
 * exige token e matrícula. Buscamos o blob aqui e o player toca de um object URL.
 */
export async function requestBlob(url, options = {}) {
  const { Authorization } = getHeaders();
  const res = await fetch(url, {
    headers: { ...(Authorization ? { Authorization } : {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.blob();
}

export { API_URL };
