/**
 * Papéis e hierarquia — FONTE ÚNICA DE VERDADE no servidor.
 *
 * Não espalhe comparações de role (`req.userRole === 'superadmin'`) pelas
 * rotas: use os conjuntos e helpers daqui. O espelho no front é
 * `src/utils/permissions.js` — mantenha os dois em sincronia.
 *
 * Hierarquia (rank crescente = mais privilégio):
 *   diretor ⊃ superadmin ⊃ admin ⊃ (instrutor | conatus_employee) ⊃ aluno
 *
 * O "diretor" é o topo absoluto: tem as mesmas autorizações do superadmin e,
 * além disso, pode gerenciar superadmins/admins — e ninguém pode editá-lo,
 * rebaixá-lo ou excluí-lo. É exclusivo (fixado por e-mail no boot).
 */
const ROLES = {
  ALUNO:      'aluno',
  EMPLOYEE:   'conatus_employee',
  INSTRUTOR:  'instrutor',
  ADMIN:      'admin',
  SUPERADMIN: 'superadmin',
  DIRETOR:    'diretor',
};

const ROLE_RANK = {
  aluno:            0,
  conatus_employee: 1,
  instrutor:        1,
  admin:            2,
  superadmin:       3,
  diretor:          4,
};

// Acesso ao painel administrativo / gestão geral.
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DIRETOR];
// Gestão de conteúdo (cursos, módulos, aulas): admin-tier + instrutor.
const CONTENT_ROLES = [ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DIRETOR, ROLES.INSTRUTOR];
// Poderes de superadmin: alterar cargos, gerenciar admins, etc.
const SUPERADMIN_ROLES = [ROLES.SUPERADMIN, ROLES.DIRETOR];

/** Rank hierárquico do papel (-1 se desconhecido). */
function rank(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_RANK, role) ? ROLE_RANK[role] : -1;
}

/** Tem acesso ao painel administrativo? */
function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

/** Tem poderes de superadmin (alterar cargos, gerenciar admins)? */
function hasSuperPowers(role) {
  return SUPERADMIN_ROLES.includes(role);
}

/**
 * Um ator pode gerenciar (editar / excluir / alterar cargo) um alvo?
 * Regra única: só é possível agir sobre quem está ESTRITAMENTE abaixo na
 * hierarquia. Assim, o diretor gerencia todos, ninguém gerencia o diretor,
 * e superadmins não gerenciam outros superadmins.
 */
function canManage(actorRole, targetRole) {
  return rank(actorRole) > rank(targetRole);
}

/** Papéis com rank >= o do ator — usados para ocultar pares/superiores em listas. */
function rolesAtOrAbove(role) {
  const min = rank(role);
  return Object.keys(ROLE_RANK).filter(r => rank(r) >= min);
}

module.exports = {
  ROLES,
  ROLE_RANK,
  ADMIN_ROLES,
  CONTENT_ROLES,
  SUPERADMIN_ROLES,
  rank,
  isAdminRole,
  hasSuperPowers,
  canManage,
  rolesAtOrAbove,
};
