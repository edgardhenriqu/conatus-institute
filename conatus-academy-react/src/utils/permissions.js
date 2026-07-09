/**
 * Fonte única das regras de acesso da plataforma Conatus.
 * Importe daqui — não espalhe verificações de role pelo código.
 */

export const ROLES = {
  ALUNO:      'aluno',
  EMPLOYEE:   'conatus_employee',
  INSTRUTOR:  'instrutor',
  ADMIN:      'admin',
  SUPERADMIN: 'superadmin',
  DIRETOR:    'diretor',
};

export const ROLE_LABELS = {
  aluno:             'Aluno',
  conatus_employee:  'Funcionário Conatus',
  instrutor:         'Instrutor',
  admin:             'Administrador',
  superadmin:        'Super Administrador',
  diretor:           'Diretor',
};

export const ROLE_COLORS = {
  aluno:             '#6c757d',
  conatus_employee:  '#0d6efd',
  instrutor:         '#059669',
  admin:             '#7c3aed',
  superadmin:        '#b91c1c',
  diretor:           '#111827',
};

/**
 * Hierarquia (rank crescente = mais privilégio). Espelha server/src/utils/roles.js.
 * O diretor é o topo absoluto: mesmas autorizações do superadmin + poder sobre ele.
 */
export const ROLE_RANK = {
  aluno:            0,
  conatus_employee: 1,
  instrutor:        1,
  admin:            2,
  superadmin:       3,
  diretor:          4,
};

export const VALID_ROLES = [ROLES.ALUNO, ROLES.EMPLOYEE, ROLES.INSTRUTOR, ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DIRETOR];

/** Rank hierárquico de um papel (-1 se desconhecido). */
export function roleRank(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_RANK, role) ? ROLE_RANK[role] : -1;
}

/** Um ator pode gerenciar (editar/excluir/alterar cargo) um alvo? Só quem está abaixo. */
export function canManageRole(actorRole, targetRole) {
  return roleRank(actorRole) > roleRank(targetRole);
}

/** Papéis sigilosos: só visíveis para quem está no mesmo nível ou acima. */
export const HIDDEN_ROLES = [ROLES.SUPERADMIN];

/**
 * Um ator pode ver (listar / abrir o perfil de) um alvo? Todos, menos os
 * papéis sigilosos. Um admin enxerga os outros admins e o diretor — em modo
 * leitura, pois canManageRole é falso —, mas não o superadmin.
 */
export function canViewRole(actorRole, targetRole) {
  if (!HIDDEN_ROLES.includes(targetRole)) return true;
  return roleRank(actorRole) >= roleRank(targetRole);
}

/** Retorna true se o usuário pode acessar cursos internos (MOP). */
export function canAccessInternalCourse(user) {
  if (!user) return false;
  return (
    isAdmin(user) ||
    isInstrutor(user) ||
    user.role === ROLES.EMPLOYEE ||
    Boolean(user.email?.includes('@conatus'))  // compatibilidade retroativa
  );
}

/** True para administradores — inclui superadmin e diretor (acesso ao painel). */
export function isAdmin(user) {
  return user?.role === ROLES.ADMIN || user?.role === ROLES.SUPERADMIN || user?.role === ROLES.DIRETOR;
}

/** True para quem tem poderes de superadmin (alterar cargos, gerenciar admins): superadmin ou diretor. */
export function isSuperAdmin(user) {
  return user?.role === ROLES.SUPERADMIN || user?.role === ROLES.DIRETOR;
}

/** True apenas para o diretor — topo absoluto da hierarquia, acima do superadmin. */
export function isDiretor(user) {
  return user?.role === ROLES.DIRETOR;
}

/** True para instrutores — podem gerenciar conteúdo dos seus próprios cursos. */
export function isInstrutor(user) {
  return user?.role === ROLES.INSTRUTOR;
}

/** True para quem pode acessar o painel de gerenciamento (admin ou instrutor). */
export function isStaff(user) {
  return isAdmin(user) || isInstrutor(user);
}

/** True para funcionários Conatus (role ou email @conatus). */
export function isEmployee(user) {
  return user?.role === ROLES.EMPLOYEE || Boolean(user?.email?.includes('@conatus'));
}

/** True para o aluno comum sem permissões especiais. */
export function isRegularStudent(user) {
  return user?.role === ROLES.ALUNO && !user?.email?.includes('@conatus');
}

/** True se o curso deve aparecer na listagem para o usuário. */
export function canSeeCourse(user, course) {
  if (!course || course.acesso !== 'restrito') return true;
  return canAccessInternalCourse(user);
}
