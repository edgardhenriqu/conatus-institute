/**
 * "Tenho interesse" — mede a demanda por cursos ainda não publicados
 * (status = 'em_breve'). Fonte única das operações sobre curso_interesses.
 *
 * Uma manifestação por aluno/curso (garantido pelo UNIQUE da tabela): a
 * contagem reflete PESSOAS distintas, não cliques.
 */
const pool = require('../../db/connection');

/** Registra o interesse do aluno. Idempotente (não duplica). */
async function registrarInteresse(alunoId, cursoId) {
  await pool.query(
    `INSERT INTO curso_interesses (curso_id, aluno_id) VALUES ($1, $2)
     ON CONFLICT (curso_id, aluno_id) DO NOTHING`,
    [cursoId, alunoId]
  );
}

/** Remove o interesse do aluno (permite desmarcar). */
async function removerInteresse(alunoId, cursoId) {
  await pool.query(
    'DELETE FROM curso_interesses WHERE curso_id = $1 AND aluno_id = $2',
    [cursoId, alunoId]
  );
}

/** Quantas pessoas manifestaram interesse no curso. */
async function contarInteresse(cursoId) {
  const r = await pool.query(
    'SELECT COUNT(*)::int AS total FROM curso_interesses WHERE curso_id = $1',
    [cursoId]
  );
  return r.rows[0].total;
}

/** Resumo para a UI: { total_interesse, interesse_registrado }. */
async function infoInteresse(cursoId, alunoId) {
  const total = await contarInteresse(cursoId);
  let registrado = false;
  if (alunoId) {
    const r = await pool.query(
      'SELECT 1 FROM curso_interesses WHERE curso_id = $1 AND aluno_id = $2 LIMIT 1',
      [cursoId, alunoId]
    );
    registrado = r.rows.length > 0;
  }
  return { total_interesse: total, interesse_registrado: registrado };
}

/**
 * Contagem e "registrado pelo aluno" para VÁRIOS cursos de uma vez (catálogo).
 * Evita N+1: duas queries no total.
 * @returns {Promise<Map<number, {total_interesse:number, interesse_registrado:boolean}>>}
 */
async function infoInteresseEmLote(cursoIds, alunoId) {
  const mapa = new Map();
  if (!cursoIds || cursoIds.length === 0) return mapa;

  const counts = await pool.query(
    `SELECT curso_id, COUNT(*)::int AS total
       FROM curso_interesses WHERE curso_id = ANY($1) GROUP BY curso_id`,
    [cursoIds]
  );
  const meus = alunoId
    ? await pool.query(
        'SELECT curso_id FROM curso_interesses WHERE curso_id = ANY($1) AND aluno_id = $2',
        [cursoIds, alunoId]
      )
    : { rows: [] };

  const countMap = new Map(counts.rows.map(r => [r.curso_id, r.total]));
  const meusSet = new Set(meus.rows.map(r => r.curso_id));
  for (const id of cursoIds) {
    mapa.set(id, {
      total_interesse: countMap.get(id) || 0,
      interesse_registrado: meusSet.has(id),
    });
  }
  return mapa;
}

/** Lista as pessoas interessadas (para o admin contatar/exportar). */
async function listarInteressados(cursoId) {
  const r = await pool.query(
    `SELECT a.id, a.nome, a.email, ci.created_at AS interesse_em
       FROM curso_interesses ci
       JOIN alunos a ON a.id = ci.aluno_id
      WHERE ci.curso_id = $1
      ORDER BY ci.created_at DESC`,
    [cursoId]
  );
  return r.rows;
}

module.exports = {
  registrarInteresse,
  removerInteresse,
  contarInteresse,
  infoInteresse,
  infoInteresseEmLote,
  listarInteressados,
};
