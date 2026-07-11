/**
 * Indexação do conteúdo das aulas para o assistente RAG.
 *
 * Fluxo: HTML do Quill → texto puro → pedaços com sobreposição → embedding
 * (gemini-embedding-001) → linhas em aula_chunks. Reindexar uma aula apaga os
 * pedaços antigos primeiro, então a operação é idempotente e reflete edições.
 *
 * Só há texto para indexar em aulas com `descricao`/`conteudo`. Aulas puramente
 * de vídeo/PDF sem texto são ignoradas (buildChunks devolve []).
 */
const pool = require('../../db/connection');
const { embedDocument, toVectorLiteral } = require('./ragGemini');

// Remove marcação do Quill preservando as quebras de bloco, para o texto não
// virar uma "palavra" gigante. Decodifica as entidades mais comuns.
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;| /g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .trim();
}

// Quebra em pedaços de ~maxChars com sobreposição, preferindo cortar num limite
// de parágrafo/frase próximo ao fim para não partir ideias no meio.
function chunkText(text, { maxChars = 1200, overlap = 200 } = {}) {
  const clean = (text || '').trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const corte = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf('. '));
      if (corte > maxChars * 0.5) end = start + corte + 1;
    }
    const pedaco = clean.slice(start, end).trim();
    if (pedaco) chunks.push(pedaco);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

// aula: { id, titulo, descricao, conteudo }. Cada pedaço leva o título da aula
// no topo para chegar auto-contido ao modelo na hora de responder.
function buildChunks(aula) {
  const partes = [];
  if (aula.descricao) partes.push(aula.descricao.trim());
  if (aula.conteudo) partes.push(stripHtml(aula.conteudo));
  const corpo = partes.filter(Boolean).join('\n\n').trim();
  if (!corpo) return [];
  const header = `Aula: ${(aula.titulo || '').trim()}`.trim();
  return chunkText(corpo).map((c) => `${header}\n${c}`);
}

// Indexa uma aula já com curso_id resolvido: { id, curso_id, titulo, descricao, conteudo }.
async function indexAula(aula) {
  const chunks = buildChunks(aula);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM aula_chunks WHERE aula_id = $1', [aula.id]);
    for (let i = 0; i < chunks.length; i++) {
      const vec = await embedDocument(chunks[i]);
      await client.query(
        `INSERT INTO aula_chunks (aula_id, curso_id, ordem, texto, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)`,
        [aula.id, aula.curso_id, i, chunks[i], toVectorLiteral(vec)],
      );
    }
    await client.query('COMMIT');
    return chunks.length;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// Busca a aula (com o curso_id via módulo) e a indexa. Usar ao salvar/publicar.
async function indexAulaById(aulaId) {
  const { rows } = await pool.query(
    `SELECT a.id, a.titulo, a.descricao, a.conteudo, m.curso_id
       FROM aulas a JOIN modulos m ON m.id = a.modulo_id
      WHERE a.id = $1`,
    [aulaId],
  );
  if (!rows[0]) return 0;
  return indexAula(rows[0]);
}

async function removeAula(aulaId) {
  await pool.query('DELETE FROM aula_chunks WHERE aula_id = $1', [aulaId]);
}

module.exports = { indexAula, indexAulaById, removeAula, stripHtml, chunkText, buildChunks };
