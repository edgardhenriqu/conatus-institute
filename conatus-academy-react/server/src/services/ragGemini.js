/**
 * Cliente fino do Gemini para o assistente RAG dos cursos.
 * Centraliza os IDs de modelo num único lugar — se o Google aposentar um ID
 * (como aconteceu com gemini-2.5-flash para contas novas), troca-se aqui.
 *
 * Modelos verificados contra esta conta em 2026-07-11:
 *   - Embeddings: gemini-embedding-001 (outputDimensionality 768).
 *   - Geração:    gemini-flash-latest (alias que acompanha o flash atual).
 */
const { GoogleGenAI } = require('@google/genai');

const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIMS = 768;                 // casa com aula_chunks.embedding vector(768)
const GEN_MODEL = 'gemini-flash-latest';

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

async function generate({ system, prompt }) {
  return withRetry(async () => {
    const r = await ai().models.generateContent({
      model: GEN_MODEL,
      contents: prompt,
      config: { systemInstruction: system },
    });
    return r.text || '';
  });
}

// pgvector aceita o literal textual '[a,b,c]' e o cast ::vector faz o resto.
const toVectorLiteral = (arr) => `[${arr.join(',')}]`;

module.exports = {
  EMBED_MODEL, EMBED_DIMS, GEN_MODEL,
  embedDocument, embedQuery, generate, toVectorLiteral,
};
