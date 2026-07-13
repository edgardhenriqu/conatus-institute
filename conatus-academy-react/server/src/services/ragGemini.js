/**
 * Cliente fino do Gemini para o assistente RAG dos cursos.
 * Centraliza os IDs de modelo num único lugar — se o Google aposentar um ID
 * (como aconteceu com gemini-2.5-flash), troca-se aqui.
 *
 * Modelos verificados contra esta conta em 2026-07-13:
 *   - Embeddings: gemini-embedding-001 (outputDimensionality 768). É o caminho
 *     principal e não deve mudar de provedor sem reindexar aula_chunks.
 *   - Geração:    ver GEN_MODELS — hoje apenas RESERVA. Quem responde ao aluno
 *     é o OpenRouter (ragChat.js); esta cascata só entra em cena sem
 *     OPENROUTER_API_KEY. Cada ID do Gemini tem quota própria: em 2026-07-13
 *     gemini-flash-latest e a família 2.0-flash devolviam 429 (quota estourada)
 *     enquanto o lite respondia — daí a cascata em vez de um modelo único.
 */
const { GoogleGenAI } = require('@google/genai');

const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIMS = 768;                 // casa com aula_chunks.embedding vector(768)
const GEN_MODELS = [
  'gemini-flash-lite-latest',  // primário: é o que tem quota nesta conta
  'gemini-flash-latest',       // melhor resposta quando há quota disponível
  'gemini-3-flash-preview',
];

let client;
function ai() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY ausente no .env — assistente indisponível.');
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Rede/quota do Gemini falham de vez em quando (429/5xx). Uma retentativa com
// backoff cobre a maioria dos casos sem travar a indexação.
async function withRetry(fn, { tentativas = 4, base = 800 } = {}) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      const status = e?.status || e?.code;
      const recuperavel = status === 429 || status === 503 || status === 500;
      ultimoErro = e;
      if (!recuperavel || i === tentativas - 1) throw e;
      await sleep(base * 2 ** i);   // 0.8s, 1.6s, 3.2s…
    }
  }
  throw ultimoErro;
}

// Cosseno é invariante à escala, então não normalizamos o vetor truncado —
// vector_cosine_ops já ignora a magnitude.
async function embed(text, taskType) {
  return withRetry(async () => {
    const r = await ai().models.embedContent({
      model: EMBED_MODEL,
      contents: text,
      config: { taskType, outputDimensionality: EMBED_DIMS },
    });
    const values = r.embeddings?.[0]?.values;
    if (!values) throw new Error('Embedding vazio retornado pelo Gemini.');
    return values;
  });
}

const embedDocument = (text) => embed(text, 'RETRIEVAL_DOCUMENT'); // ao indexar
const embedQuery = (text) => embed(text, 'RETRIEVAL_QUERY');      // ao perguntar

// Erros do modelo, não da pergunta: aposentadoria (404), quota (429) e
// sobrecarga (500/503). Qualquer um deles justifica tentar o próximo ID.
const MODELO_INDISPONIVEL = new Set([404, 429, 500, 503]);

async function generate({ system, prompt }) {
  let ultimoErro;
  for (const model of GEN_MODELS) {
    try {
      // Poucas tentativas por modelo: insistir num ID sem quota só atrasa a
      // resposta ao aluno — a cascata é que resolve.
      return await withRetry(async () => {
        const r = await ai().models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction: system },
        });
        return r.text || '';
      }, { tentativas: 2, base: 700 });
    } catch (e) {
      const status = e?.status || e?.code;
      if (!MODELO_INDISPONIVEL.has(status)) throw e;   // erro real: não mascarar
      console.warn(`Gemini indisponível em ${model} (${status}); tentando o próximo modelo.`);
      ultimoErro = e;
    }
  }
  throw ultimoErro;
}

// pgvector aceita o literal textual '[a,b,c]' e o cast ::vector faz o resto.
const toVectorLiteral = (arr) => `[${arr.join(',')}]`;

module.exports = {
  EMBED_MODEL, EMBED_DIMS, GEN_MODELS,
  embedDocument, embedQuery, generate, toVectorLiteral, withRetry,
};
