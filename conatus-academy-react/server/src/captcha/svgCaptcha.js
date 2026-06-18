const crypto = require('crypto');

/*
 * Gerador de CAPTCHA em SVG — 100% JavaScript puro, sem dependências nativas.
 *
 * Produz uma imagem vetorial (SVG) com letras/números aleatórios, levemente
 * distorcidos (rotação/deslocamento), somada a linhas e pontos de ruído para
 * dificultar a leitura automática por bots/OCR.
 *
 * IMPORTANTE (segurança): este módulo apenas DESENHA o texto. A resposta correta
 * nunca é embutida no SVG — ela é devolvida separadamente para ser guardada
 * apenas no servidor (ver captchaStore.js). O navegador recebe somente a imagem.
 */

// Conjunto de caracteres "seguros": sem 0/O/1/I/l para evitar ambiguidade visual.
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Paleta alinhada à identidade visual da Conatus (azul escuro / cinza).
const TEXT_COLORS = ['#0b2545', '#13315c', '#1d4e89', '#134074', '#0a1f44'];
const NOISE_COLOR = '#9aa7b8';

/** Inteiro aleatório criptograficamente seguro no intervalo [min, max]. */
function randInt(min, max) {
  const range = max - min + 1;
  return min + (crypto.randomInt(range));
}

/** Float aleatório no intervalo [min, max). */
function randFloat(min, max) {
  return min + (crypto.randomInt(0, 100000) / 100000) * (max - min);
}

function pick(arr) {
  return arr[crypto.randomInt(arr.length)];
}

/** Gera um texto aleatório com o número de caracteres informado. */
function generateText(length = 5) {
  let text = '';
  for (let i = 0; i < length; i++) {
    text += CHARS[crypto.randomInt(CHARS.length)];
  }
  return text;
}

/**
 * Gera o SVG da imagem do CAPTCHA para um texto dado.
 * @param {string} text  Texto que será desenhado na imagem.
 * @returns {string} markup SVG completo.
 */
function renderSvg(text) {
  const width = 200;
  const height = 70;
  const fontSize = 38;
  const step = width / (text.length + 1);

  const parts = [];

  // Fundo cinza-claro (padrão visual da plataforma).
  parts.push(
    `<rect width="${width}" height="${height}" rx="8" fill="#f1f4f8"/>`
  );

  // Linhas de ruído atravessando a imagem (curvas suaves).
  for (let i = 0; i < 4; i++) {
    const x1 = 0;
    const y1 = randInt(10, height - 10);
    const cx = randInt(40, width - 40);
    const cy = randInt(0, height);
    const x2 = width;
    const y2 = randInt(10, height - 10);
    parts.push(
      `<path d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}" stroke="${NOISE_COLOR}" ` +
        `stroke-width="${randFloat(0.8, 1.6).toFixed(2)}" fill="none" opacity="0.5"/>`
    );
  }

  // Cada caractere é desenhado com rotação e deslocamento próprios (distorção leve).
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const x = step * (i + 1);
    const y = height / 2 + randInt(-4, 6);
    const rotate = randInt(-28, 28);
    const color = pick(TEXT_COLORS);
    parts.push(
      `<text x="${x.toFixed(1)}" y="${y}" font-family="'Courier New',monospace" ` +
        `font-size="${fontSize + randInt(-4, 4)}" font-weight="700" fill="${color}" ` +
        `text-anchor="middle" dominant-baseline="middle" ` +
        `transform="rotate(${rotate} ${x.toFixed(1)} ${y})">${ch}</text>`
    );
  }

  // Pontos de ruído espalhados sobre o texto.
  for (let i = 0; i < 60; i++) {
    const cx = randInt(0, width);
    const cy = randInt(0, height);
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${randFloat(0.5, 1.4).toFixed(2)}" ` +
        `fill="${NOISE_COLOR}" opacity="${randFloat(0.3, 0.7).toFixed(2)}"/>`
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" role="img" aria-label="Imagem de verificação">` +
    parts.join('') +
    `</svg>`
  );
}

/**
 * Cria um novo desafio CAPTCHA.
 * @returns {{ text: string, image: string }} texto (resposta) e SVG (imagem).
 */
function createCaptcha(length = 5) {
  const text = generateText(length);
  return { text, image: renderSvg(text) };
}

module.exports = { createCaptcha };
