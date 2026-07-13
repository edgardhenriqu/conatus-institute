/**
 * Geração da resposta do tutor virtual — a metade "conversa" do RAG.
 *
 * Fica separada do Gemini de propósito. Os *embeddings* continuam no Gemini
 * (ragGemini.js) porque trocar o modelo de embedding invalidaria todos os
 * vetores já gravados em aula_chunks: vetores de modelos diferentes não são
 * comparáveis, e a coluna é vector(768). Já a *geração* não guarda estado, então
 * pode vir de qualquer provedor — e vem do OpenRouter, que fala o formato da
 * OpenAI e evita a quota gratuita do Gemini (em 2026-07-13 os IDs flash da conta
 * devolviam 429/503 e o tutor parava de responder).
 *
 * Só usamos modelos gratuitos (sufixo ":free"), e é por isso que a geração é uma
 * CASCATA e não um modelo único: no tier gratuito o provedor derruba modelos com
 * 429 ("temporarily rate-limited") a qualquer momento — em 2026-07-13, três dos
 * cinco candidatos estavam nesse estado ao mesmo tempo. Com a lista, o tutor só
 * fica mudo se TODOS caírem juntos.
 *
 * Configuração: OPENROUTER_MODEL no .env aceita uma lista separada por vírgula.
 * Sem OPENROUTER_API_KEY, a geração cai na cascata do Gemini — configuração
 * incompleta degrada, não derruba o tutor.
 */
const { generate: generateGemini, withRetry } = require('./ragGemini');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 60000;   // modelos gratuitos são lentos (5–10s é o normal)

// Verificados contra esta conta em 2026-07-13, respondendo em pt-BR e aderindo
// à instrução de responder só com base no material.
const DEFAULT_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',   // mais rápido dos testados (~5s)
  'openai/gpt-oss-120b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
];

function modelos() {
  const bruto = (process.env.OPENROUTER_MODEL || '').trim();
  if (!bruto) return DEFAULT_MODELS;
  const lista = bruto.split(',').map((m) => m.trim()).filter(Boolean);
  return lista.length ? lista : DEFAULT_MODELS;
}

// Erros do modelo, não da pergunta: 402 (sem crédito), 404 (aposentado),
// 429 (limite do tier gratuito) e 5xx (fora do ar). Qualquer um justifica
// tentar o próximo da lista.
const MODELO_INDISPONIVEL = new Set([402, 404, 429, 500, 502, 503]);

async function chamar(model, { system, prompt }) {
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      // Opcionais do OpenRouter: identificam o app no painel de uso da conta.
      'HTTP-Referer': process.env.APP_URL || 'https://conatus.institute',
      'X-Title': 'Conatus Academy',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!r.ok) {
    const corpo = await r.text().catch(() => '');
    // `status` no erro é o que withRetry e a cascata leem para decidir.
    const erro = new Error(`OpenRouter ${r.status} em ${model}: ${corpo.slice(0, 200)}`);
    erro.status = r.status;
    throw erro;
  }

  const json = await r.json();
  const texto = json.choices?.[0]?.message?.content;
  if (!texto) throw new Error(`Resposta vazia do OpenRouter (modelo ${model}).`);
  return texto;
}

async function generateOpenRouter({ system, prompt }) {
  let ultimoErro;
  for (const model of modelos()) {
    try {
      // Só uma retentativa por modelo: insistir num modelo gratuito limitado
      // atrasa a resposta ao aluno — quem resolve é o próximo da lista.
      return await withRetry(() => chamar(model, { system, prompt }), { tentativas: 2, base: 600 });
    } catch (e) {
      const status = e?.status || e?.code;
      if (!MODELO_INDISPONIVEL.has(status)) throw e;   // erro real: não mascarar
      console.warn(`OpenRouter indisponível em ${model} (${status}); tentando o próximo modelo.`);
      ultimoErro = e;
    }
  }
  throw ultimoErro;
}

async function generate({ system, prompt }) {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY ausente — tutor respondendo pelo Gemini.');
    return generateGemini({ system, prompt });
  }
  return generateOpenRouter({ system, prompt });
}

module.exports = { generate, DEFAULT_MODELS };
