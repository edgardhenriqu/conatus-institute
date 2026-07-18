/**
 * Rate limiting simples, EM MEMÓRIA, por IP.
 *
 * Objetivo: frear força bruta de senha, credential stuffing e abuso das rotas
 * que disparam e-mail (reenvio de confirmação, redefinição, cadastro). O CAPTCHA
 * do login só entra DEPOIS da senha correta — ou seja, não protege a etapa de
 * adivinhação de senha. Este teto por IP cobre justamente essa lacuna.
 *
 * Em memória (e não no banco), pelo mesmo motivo do teto de chamados em
 * suporte.js: o dado é descartável e some no restart. Não é proteção contra um
 * botnet distribuído (IPs variados), mas corta o abuso trivial de um único
 * endereço sem adicionar dependência nem estado persistente.
 *
 * Atrás de proxy (Replit/Nginx) o server.js faz `app.set('trust proxy', 1)`,
 * então req.ip já reflete o IP real de X-Forwarded-For.
 */

/**
 * Cria um middleware de rate limit.
 * @param {object} opts
 * @param {number} opts.windowMs janela de contagem, em ms.
 * @param {number} opts.max      máximo de requisições por IP na janela.
 * @param {string} [opts.erro]   mensagem devolvida ao estourar o teto.
 * @returns {import('express').RequestHandler}
 */
function rateLimit({ windowMs, max, erro }) {
  // Map<ip, number[]> — timestamps das requisições recentes.
  const acessosPorIp = new Map();
  const mensagem = erro || 'Muitas tentativas. Aguarde um instante e tente novamente.';

  return function rateLimitMiddleware(req, res, next) {
    const agora = Date.now();
    const ip = req.ip || req.connection?.remoteAddress || 'desconhecido';

    // Limpeza preguiçosa: mantém só o que ainda está dentro da janela. Sem isso
    // o Map cresceria para sempre com IPs antigos.
    const recentes = (acessosPorIp.get(ip) || []).filter((t) => agora - t < windowMs);

    if (recentes.length >= max) {
      // Retry-After em segundos até a requisição mais antiga sair da janela.
      const liberaEm = Math.ceil((windowMs - (agora - recentes[0])) / 1000);
      res.setHeader('Retry-After', String(liberaEm));
      return res.status(429).json({ erro: mensagem });
    }

    recentes.push(agora);
    acessosPorIp.set(ip, recentes);
    next();
  };
}

module.exports = { rateLimit };
