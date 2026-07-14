/**
 * Voz da narração pelo ElevenLabs — provedor alternativo (TTS_PROVIDER=elevenlabs).
 *
 * Melhor qualidade e vozes pt-BR nativas na Voice Library, mas exige assinatura:
 * no plano gratuito a API recusa vozes da Library (402) e a cota de 10 mil
 * caracteres/mês não cobre nem a carga inicial de um curso. O padrão da
 * plataforma é o Gemini, que sai de graça — ver ./gemini.js.
 */
const URL_TTS = 'https://api.elevenlabs.io/v1/text-to-speech';

const VOZ = (process.env.ELEVENLABS_VOICE_ID || '').trim();
const MODELO = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

// 64 kbps mono é o ponto de equilíbrio para VOZ: indistinguível de 128 kbps num
// fone comum, e metade do peso no banco (~480 KB por minuto de fala).
const FORMATO = process.env.ELEVENLABS_FORMAT || 'mp3_44100_64';

const TIMEOUT_MS = 60000;   // a síntese roda em segundo plano; pode demorar
const MAX_CHARS = 5000;

// Ritmo e expressividade da leitura. `speed` abaixo de 1 dá o passo de instrutor.
const AJUSTES_VOZ = {
  stability: 0.5,
  similarity_boost: 0.75,
  speed: 0.95,
};

const MIMES = { mp3: 'audio/mpeg', opus: 'audio/ogg', wav: 'audio/wav' };
const mimeDoFormato = () => MIMES[FORMATO.split('_')[0]] || 'audio/mpeg';

// Sem voz escolhida não há o que sintetizar: a API exige um voice_id na URL.
const ativo = () => Boolean(process.env.ELEVENLABS_API_KEY && VOZ);

const assinatura = () => `${MODELO}:${VOZ}:${FORMATO}`;

async function sintetizar(roteiro) {
  if (roteiro.length > MAX_CHARS) {
    throw new Error(`Roteiro longo demais para síntese (${roteiro.length} caracteres).`);
  }

  const resposta = await fetch(`${URL_TTS}/${VOZ}?output_format=${FORMATO}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: roteiro,
      model_id: MODELO,
      // Sem language_code o modelo adivinha o idioma pelo texto — e um roteiro
      // recheado de termos técnicos em inglês às vezes é lido como inglês.
      language_code: 'pt',
      voice_settings: AJUSTES_VOZ,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(`ElevenLabs ${resposta.status}: ${detalhe.slice(0, 300)}`);
  }

  const dados = Buffer.from(await resposta.arrayBuffer());
  if (!dados.length) throw new Error('ElevenLabs devolveu áudio vazio.');

  return { dados, mime: mimeDoFormato() };
}

module.exports = { nome: 'elevenlabs', ativo, assinatura, sintetizar };
