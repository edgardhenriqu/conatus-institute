---
name: permissoes-perfil
description: Aplicar regras de acesso por perfil (aluno, conatus_employee, instrutor, admin, superadmin) na Conatus Academy. Use ao proteger rotas, esconder/mostrar UI por papel, autorizar cursos internos ou mexer em auth/middlewares.
---

# Permissões por Perfil

## Quando usar
- Proteger rotas (front ou back) por papel.
- Mostrar/esconder elementos da UI conforme o usuário.
- Autorizar acesso a cursos internos (MOP / tipo `interno`).
- Mexer em `AuthContext`, `ProtectedRoute`, `middlewares/auth.js` ou em qualquer checagem de role.

## Regras do projeto — FONTE ÚNICA
**Toda regra de acesso vem de `src/utils/permissions.js`.** NUNCA espalhe `user.role === 'admin'` solto pelo código — importe os helpers.

Papéis (`ROLES`): `aluno`, `conatus_employee`, `instrutor`, `admin`, `superadmin`.

Helpers (use-os, não reimplemente):
- `isAdmin(user)` — admin **ou** superadmin.
- `isSuperAdmin(user)` — único que pode alterar cargos e gerenciar admins.
- `isInstrutor(user)` — gerencia conteúdo dos próprios cursos.
- `isStaff(user)` — acessa o painel (admin ou instrutor).
- `isEmployee(user)` — funcionário (role `conatus_employee` ou e-mail `@conatus`).
- `canAccessInternalCourse(user)` — admin OU instrutor OU employee OU e-mail `@conatus` (retrocompat).
- `canSeeCourse(user, course)` — curso não-interno: todos; interno: só quem pode acessar.

No backend, `podeAcessarInterno` (em `cursos.js`) replica a regra para o servidor: role admin/conatus_employee, OU registro em `curso_autorizacoes`, OU role no DB. Acesso interno pode ser liberado manualmente por e-mail via autorizações no admin.

## Princípios
- **Defesa no servidor é obrigatória.** Esconder no front é UX, não segurança — toda rota sensível revalida o papel no back (`middlewares/auth.js` + checagem de role).
- **Front:** `ProtectedRoute` aceita `requireAdmin` e `requireStaff`. `AuthContext` expõe `user`, `isAdmin`, `isStaff`.
- **Hierarquia:** superadmin ⊃ admin ⊃ (instrutor | employee) ⊃ aluno. Só superadmin altera cargos.
- Labels/cores de papel: `ROLE_LABELS` e `ROLE_COLORS` (use nos badges, não hardcode).

## Checklist de implementação
- [ ] Usei helpers de `permissions.js` (zero `role === '...'` solto)?
- [ ] A rota tem checagem de role NO SERVIDOR, não só no front?
- [ ] Curso interno filtrado por `canSeeCourse`/`podeAcessarInterno`?
- [ ] Ações de gestão de cargo restritas a `isSuperAdmin`?
- [ ] Badge de papel usa `ROLE_LABELS`/`ROLE_COLORS`?
- [ ] Mensagem de acesso negado é a padrão da plataforma?

## Critérios de qualidade
- Mesma regra de acesso no front e no back (sem divergência).
- Nenhum endpoint sensível confia apenas na ocultação de UI.
- Escalonamento de privilégio impossível (aluno não vira instrutor/admin por chamada direta).
- Cursos internos invisíveis e inacessíveis a quem não tem direito.

## Comandos de teste/verificação
```bash
cd conatus-academy-react
# Sem token de admin deve dar 401/403:
curl -i http://localhost:3000/api/admin/alunos
# Aluno comum não deve enxergar curso interno no catálogo:
curl -s http://localhost:3000/api/cursos | grep -i interno   # não deve listar para não autorizado
npm run lint && npm run build
```
