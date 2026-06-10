/**
 * Fonte única das regras de acesso da plataforma Conatus.
 * Importe daqui — não espalhe verificações de role pelo código.
 */

export const ROLES = {
  ALUNO:    'aluno',
  EMPLOYEE: 'conatus_employee',
  ADMIN:    'admin',
};

export const ROLE_LABELS = {
  aluno:             'Aluno',
  conatus_employee:  'Funcionário Conatus',
  admin:             'Administrador',
};

export const ROLE_COLORS = {
  aluno:             '#6c757d',
  conatus_employee:  '#0d6efd',
  admin:             '#7c3aed',
};

export const VALID_ROLES = [ROLES.ALUNO, ROLES.EMPLOYEE, ROLES.ADMIN];

/** Retorna true se o usuário pode acessar cursos internos (MOP). */
export function canAccessInternalCourse(user) {
  if (!user) return false;
  return (
    user.role === ROLES.ADMIN ||
    user.role === ROLES.EMPLOYEE ||
    Boolean(user.email?.includes('@conatus'))  // compatibilidade retroativa
  );
}

/** True apenas para administradores. */
export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
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
  if (!course || course.tipo !== 'interno') return true;
  return canAccessInternalCourse(user);
}
