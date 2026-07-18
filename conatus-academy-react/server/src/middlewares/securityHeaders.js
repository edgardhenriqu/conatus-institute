/**
 * Cabeçalhos de segurança HTTP da aplicação.
 *
 * Substitui o `helmet` por uma implementação enxuta e sem dependência nova (o
 * lockfile herdado do Replit torna `npm install` arriscado). Cobre o que falta:
 *
 *  - Content-Security-Policy: a defesa central. O conteúdo das aulas é HTML cru
 *    (dangerouslySetInnerHTML no player), então um <script> injetado ali NÃO
 *    executa — `script-src` não tem 'unsafe-inline'. O único script inline do
 *    site (bootstrap de tema no index.html) é liberado pelo HASH exato dele,
 *    calculado do próprio build; se o script mudar, o hash é recalculado no
 *    próximo boot. Sem hash casado, nem esse script rodaria.
 *  - X-Frame-Options / frame-ancestors: anti-clickjacking (o site não pode ser
 *    embutido em iframe de terceiros).
 *  - X-Content-Type-Options: impede o browser de "adivinhar" o tipo do conteúdo.
 *  - Referrer-Policy, Permissions-Policy, HSTS: endurecimento adicional.
 *
 * As rotas de download de arquivo (/api/uploads, /api/suporte/anexos) definem a
 * PRÓPRIA CSP, mais restrita ("default-src 'none'; sandbox"), sobrescrevendo
 * esta para aquelas respostas — o conteúdo vem de usuário e não é confiável.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Extrai os scripts INLINE do index.html compilado e devolve os tokens
 * "'sha256-...'" correspondentes, para liberá-los na CSP sem 'unsafe-inline'.
 * Sem build (ambiente de dev, em que o Vite serve o HTML), devolve lista vazia:
 * aqui o Express só responde a API, que não tem script inline.
 */
function hashesDeScriptsInline() {
  try {
    const indexPath = path.join(__dirname, '..', '..', '..', 'dist', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');
    // <script> SEM atributo src (os com src são carregados de 'self').
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    const hashes = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      const conteudo = m[1];
      const hash = crypto.createHash('sha256').update(conteudo, 'utf8').digest('base64');
      hashes.push(`'sha256-${hash}'`);
    }
    return hashes;
  } catch {
    return [];
  }
}

// Calculado uma vez no boot — o build não muda em tempo de execução.
const SCRIPT_HASHES = hashesDeScriptsInline();

// Diretivas da CSP, montadas a partir do uso real da aplicação:
//  - script-src: só 'self' + o(s) hash(es) do bootstrap de tema. Sem 'unsafe-inline'.
//  - style-src: 'unsafe-inline' porque o React aplica estilos inline (style={{…}})
//    e libera fonts.googleapis.com, de onde vem o @import das fontes do site.
//    Injeção de estilo é risco baixo; travar scripts é o que importa.
//  - font-src: fonts.gstatic.com serve os arquivos de fonte (inclui a Great
//    Vibes da assinatura do certificado).
//  - img-src https:: capas e imagens embutidas nas aulas podem vir de qualquer host.
//  - media-src https:: aulas apontam vídeo/áudio direto; blob: é o áudio de narração.
//  - connect-src: a API é mesma origem; viacep é a busca de CEP no cadastro.
//  - frame-src: players de vídeo embutidos (YouTube/Vimeo).
//  - frame-ancestors 'none' + object-src 'none' + base-uri 'self': travas padrão.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `script-src 'self'${SCRIPT_HASHES.length ? ' ' + SCRIPT_HASHES.join(' ') : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://viacep.com.br",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://vimeo.com",
  "form-action 'self'",
].join('; ');

function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  // HSTS só tem efeito sobre HTTPS (o browser ignora em http/localhost). O proxy
  // do Replit serve o site em HTTPS, então é seguro enviar sempre.
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
}

module.exports = { securityHeaders };
