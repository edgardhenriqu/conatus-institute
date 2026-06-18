const crypto = require('crypto');

/*
 * Armazenamento temporário e SEGURO das respostas de CAPTCHA.
 *
 * A resposta correta fica apenas aqui, na memória do servidor — nunca é enviada
 * ao navegador. O cliente recebe somente um identificador opaco (captchaId) e a
 * imagem. Na verificação, ele devolve o captchaId + o texto digitado, e a
 * comparação acontece exclusivamente no backend.
 *
 * Cada desafio:
 *  - tem validade curta (TTL) e é apagado quando expira;
 *  - é de uso único: qualquer verificação (certa ou errada) consome o desafio,
 *    obrigando o cliente a pedir uma nova imagem. Isso evita ataques de força
 *    bruta sobre a mesma imagem.
 */

const TTL_MS = 2 * 60 * 1000; // 2 minutos de validade

// Map<captchaId, { answer: string, expiresAt: number }>
const store = new Map();

/** Remove desafios expirados (limpeza preguiçosa, chamada a cada acesso). */
function purgeExpired() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }
}

/**
 * Guarda a resposta de um novo desafio e devolve o identificador opaco.
 * @param {string} answer texto correto do CAPTCHA.
 * @returns {string} captchaId aleatório.
 */
function save(answer) {
  purgeExpired();
  const id = crypto.randomBytes(18).toString('hex');
  store.set(id, { answer: answer.toUpperCase(), expiresAt: Date.now() + TTL_MS });
  return id;
}

/**
 * Verifica e CONSOME um desafio (uso único).
 * @param {string} id captchaId enviado pelo cliente.
 * @param {string} attempt texto digitado pelo usuário.
 * @returns {{ ok: boolean, reason?: 'not_found' | 'mismatch' }}
 */
function verifyAndConsume(id, attempt) {
  purgeExpired();
  const entry = store.get(id);
  if (!entry) return { ok: false, reason: 'not_found' };

  // Uso único: remove independentemente do resultado.
  store.delete(id);

  if (entry.expiresAt <= Date.now()) return { ok: false, reason: 'not_found' };

  const normalized = String(attempt || '').trim().toUpperCase();
  if (normalized && normalized === entry.answer) return { ok: true };
  return { ok: false, reason: 'mismatch' };
}

module.exports = { save, verifyAndConsume };
