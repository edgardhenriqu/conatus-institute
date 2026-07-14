/**
 * PCM cru → MP3.
 *
 * O Gemini devolve a fala como PCM de 16 bits sem cabeçalho (audio/L16). Guardar
 * isso no banco custaria caro: um minuto de fala em PCM de 24 kHz são ~2,7 MB,
 * contra ~0,5 MB em MP3 de 64 kbps — e o aluno baixaria os mesmos 2,7 MB por
 * trecho. Comprimir aqui deixa o áudio do Gemini do mesmo tamanho do ElevenLabs.
 *
 * O encoder é JS puro (lamejs) de propósito: converter com ffmpeg exigiria um
 * binário instalado no Replit, e a plataforma não pode depender disso para narrar.
 *
 * 64 kbps mono é transparente para voz. Não faz sentido subir mais: a fonte é
 * 24 kHz, ou seja, já não tem nada acima de 12 kHz para preservar.
 */
const BITRATE_KBPS = 64;
const AMOSTRAS_POR_QUADRO = 1152;   // tamanho de quadro do MPEG1 Layer III

// lamejs é ESM e o servidor é CommonJS: só o import() dinâmico enxerga o pacote.
// Carregamos uma vez e guardamos — o import é assíncrono, mas o encoder não.
let encoderPromise;
function carregarEncoder() {
  if (!encoderPromise) encoderPromise = import('@breezystack/lamejs');
  return encoderPromise;
}

/**
 * `pcm` é um Buffer de amostras int16 little-endian, mono.
 * Devolve um Buffer com o MP3 pronto.
 */
async function pcmParaMp3(pcm, taxaAmostragem) {
  const { Mp3Encoder } = await carregarEncoder();

  // O Buffer do Node pode começar em qualquer byte de um ArrayBuffer maior, e o
  // Int16Array exige alinhamento em 2 bytes — daí a cópia quando o offset é ímpar.
  const alinhado = pcm.byteOffset % 2 === 0 ? pcm : Buffer.from(pcm);
  const amostras = new Int16Array(alinhado.buffer, alinhado.byteOffset, Math.floor(alinhado.length / 2));

  const encoder = new Mp3Encoder(1, taxaAmostragem, BITRATE_KBPS);
  const pedacos = [];

  for (let i = 0; i < amostras.length; i += AMOSTRAS_POR_QUADRO) {
    const quadro = encoder.encodeBuffer(amostras.subarray(i, i + AMOSTRAS_POR_QUADRO));
    if (quadro.length) pedacos.push(Buffer.from(quadro));
  }

  const resto = encoder.flush();   // último quadro, parcial
  if (resto.length) pedacos.push(Buffer.from(resto));

  const mp3 = Buffer.concat(pedacos);
  if (!mp3.length) throw new Error('Falha ao codificar o MP3 (saída vazia).');
  return mp3;
}

module.exports = { pcmParaMp3, BITRATE_KBPS };
