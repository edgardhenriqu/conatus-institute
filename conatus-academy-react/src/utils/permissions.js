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
};

export const ROLE_LABELS = {
  aluno:             'Aluno',
  conatus_employee:  'Funcionário Conatus',
  instrutor:         'Instrutor',
  admin:             'Administrador',
  superadmin:        'Super Administrador',
};

export const ROLE_COLORS = {
  aluno:             '#6c757d',
  conatus_employee:  '#0d6efd',
  instrutor:         '#059669',
  admin:             '#7c3aed',
  superadmin:        '#b91c1c',
};

export const VALID_ROLES = [ROLES.ALUNO, ROLES.EMPLOYEE, ROLES.INSTRUTOR, ROLES.ADMIN, ROLES.SUPERADMIN];

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

/** True para administradores (inclui o superadmin). */
export function isAdmin(user) {
  return user?.role === ROLES.ADMIN || user?.role === ROLES.SUPERADMIN;
}

/** True apenas para o superadmin — único que pode alterar cargos e gerenciar admins. */
export function isSuperAdmin(user) {
  return user?.role === ROLES.SUPERADMIN;
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
