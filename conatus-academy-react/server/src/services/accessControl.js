/**
 * Controle de acesso a cursos — FONTE ÚNICA DE VERDADE.
 *
 * Nenhuma rota deve reimplementar regras de acesso: importe daqui.
 * Um curso tem um modo (`acesso`) e, quando 'restrito', um conjunto de
 * regras CUMULATIVAS (união/OR). O usuário acessa se satisfizer QUALQUER regra.
 *
 *   acesso = 'publico'   → qualquer um
 *   acesso = 'pago'      → quem tem compra aprovada (curso_compras)
 *   acesso = 'restrito'  → funcionários Conatus  OU
 *                          pertence a uma empresa parceira liberada  OU
 *                          é um usuário liberado individualmente
 *
 * Admins/superadmins e o instrutor responsável sempre acessam.
 */
const pool = require('../../db/connection');
const { possuiCurso } = require('./payments/compras');

const STAFF_ROLES = ['admin', 'superadmin', 'diretor'];
const EMPLOYEE_ROLES = ['admin', 'superadmin', 'diretor', 'conatus_employee'];

// Domínios corporativos da Conatus (compatibilidade retroativa com contas
// antigas cujo perfil de funcionário só é inferível pelo e-mail corporativo).
const CONATUS_DOMINIOS = ['conatus.com', 'conatus.com.br'];

/** True se o e-mail pertence EXATAMENTE a um domínio Conatus (sem substring frouxa). */
function ehEmailConatus(email) {
  const dominio = String(email || '').toLowerCase().trim().split('@')[1] || '';
  return CONATUS_DOMINIOS.some(d => dominio === d || dominio.endsWith(`.${d}`));
}

/**
 * Carrega o contexto de acesso do usuário a partir do banco (role, empresa).
 * O token pode estar desatualizado, então a verdade vem sempre do banco.
 * Retorna null para usuário anônimo.
 */
async function carregarUsuario(alunoId) {
  if (!alunoId) return null;
  const r = await pool.query('SELECT id, role, email, empresa_id FROM alunos WHERE id = $1', [alunoId]);
  return r.rows[0] || null;
}

/** Regras de liberação de um curso restrito. */
async function carregarRegras(cursoId) {
  const r = await pool.query(
    'SELECT tipo, empresa_id, aluno_id FROM curso_acesso_regras WHERE curso_id = $1',
    [cursoId]
  );
  return r.rows;
}

/** O usuário satisfaz UMA regra? Ponto de extensão (Open/Closed). */
function satisfazRegra(regra, usuario) {
  switch (regra.tipo) {
    case 'funcionarios':
      return EMPLOYEE_ROLES.includes(usuario?.role) ||
             (Boolean(usuario) && ehEmailConatus(usuario.email));
    case 'empresa':
      return usuario?.empresa_id != null && usuario.empresa_id === regra.empresa_id;
    case 'usuario':
      return usuario?.id === regra.aluno_id;
    default:
      return false;
  }
}

/**
 * Decide se o usuário pode acessar o curso. Único ponto de decisão.
 * @param {string|null} alunoId  id do aluno logado (ou null se anônimo)
 * @param {object} curso         linha da tabela cursos (precisa de id, acesso, instrutor_id)
 * @returns {Promise<boolean>}
 */
async function podeAcessarCurso(alunoId, curso) {
  if (!curso) return false;
  const acesso = curso.acesso || 'publico';
  if (acesso === 'publico') return true;

  const usuario = await carregarUsuario(alunoId);

  // Staff e instrutor responsável sempre acessam (qualquer modo, inclusive 'pago')
  if (usuario && STAFF_ROLES.includes(usuario.role)) return true;
  if (usuario && curso.instrutor_id && usuario.id === curso.instrutor_id) return true;

  // 'pago' — precisa ter uma compra aprovada (services/payments/compras.js)
  if (acesso === 'pago') return usuario ? possuiCurso(usuario.id, curso.id) : false;

  // 'restrito' — precisa satisfazer ao menos uma regra
  if (!usuario) return false;
  const regras = await carregarRegras(curso.id);
  return regras.some(regra => satisfazRegra(regra, usuario));
}

/** Mensagem padrão quando o acesso é negado a um curso restrito. */
const MSG_ACESSO_NEGADO =
  'Este curso tem acesso restrito. Solicite liberação ao administrador.';

/** Mensagem padrão quando o acesso é negado a um curso pago. */
const MSG_CURSO_PAGO =
  'Este curso é pago. Adquira-o para acessar o conteúdo.';

module.exports = { podeAcessarCurso, MSG_ACESSO_NEGADO, MSG_CURSO_PAGO, EMPLOYEE_ROLES, STAFF_ROLES };
