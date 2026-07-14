/**
 * Voz da narração pelo Gemini — o provedor padrão.
 *
 * É a mesma tecnologia (e a mesma voz, "Charon") do assistente Jarvis do Edgard,
 * mas pela API de TTS, não pela Live API: a Live abre uma sessão de conversa por
 * WebSocket e toca o áudio na caixa de som de quem está com o app aberto. Aqui
 * precisamos do contrário — um arquivo, gerado uma vez no servidor, guardado no
 * banco e servido a muitos alunos.
 *
 * Usa a GEMINI_API_KEY que já indexa o RAG, e o modelo flash-tts é gratuito.
 *
 * A COTA GRATUITA É DE 10 SÍNTESES POR DIA, por projeto (não por minuto —
 * medido em 2026-07-14). O withRetry abaixo cobre o 429 passageiro, mas contra o
 * limite diário não há retentativa que resolva: os trechos que sobrarem ficam sem
 * áudio até o dia seguinte, e a narração deles cai na voz do navegador. Ativar o
 * faturamento no projeto do Google AI remove o teto.
 *
 * O modelo é PREVIEW: o Google pode mudá-lo ou aposentá-lo (já aconteceu com
 * outros IDs — ver ragGemini.js). Se ele sumir, a síntese passa a falhar, os
 * trechos ficam sem áudio e a narração cai na voz do navegador; troque o ID em
 * GEMINI_TTS_MODEL ou vire a chave TTS_PROVIDER para elevenlabs.
 */
const { ai, withRetry } = require('../ragGemini');
const { pcmParaMp3 } = require('./mp3');

const MODELO = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';

// 30 vozes prontas (Zephyr, Puck, Kore, Aoede…). "Charon" é a do Jarvis.
const VOZ = process.env.GEMINI_TTS_VOICE || 'Charon';

const MAX_CHARS = 5000;   // o roteiro de um bloco é curto; acima disso é bug

// O Gemini anuncia o formato no mimeType: "audio/L16;codec=pcm;rate=24000".
// Lemos a taxa de lá em vez de fixar 24000 — se o modelo mudar, o MP3 sairia
// com a velocidade errada (voz de esquilo) sem ninguém entender por quê.
function taxaDo(mimeType) {
  const m = /rate=(\d+)/.exec(mimeType || '');
  const taxa = m ? Number(m[1]) : 24000;
  if (!Number.isInteger(taxa) || taxa < 8000) {
    throw new Error(`Taxa de amostragem inesperada do Gemini: "${mimeType}"`);
  }
  return taxa;
}

const ativo = () => Boolean(process.env.GEMINI_API_KEY);

const assinatura = () => `${MODELO}:${VOZ}:mp3`;

async function sintetizar(roteiro) {
  if (roteiro.length > MAX_CHARS) {
    throw new Error(`Roteiro longo demais para síntese (${roteiro.length} caracteres).`);
  }

  // withRetry cobre o 429 da quota gratuita, que aparece quando o backfill
  // dispara dezenas de trechos em sequência.
  const r = await withRetry(() => ai().models.generateContent({
    model: MODELO,
    contents: [{ parts: [{ text: roteiro }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: VOZ } },
      },
    },
  }));

  const audio = r.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!audio?.data) throw new Error('Gemini não devolveu áudio para o roteiro.');

  const pcm = Buffer.from(audio.data, 'base64');
  const dados = await pcmParaMp3(pcm, taxaDo(audio.mimeType));

  return { dados, mime: 'audio/mpeg' };
}

module.exports = { nome: 'gemini', ativo, assinatura, sintetizar };
