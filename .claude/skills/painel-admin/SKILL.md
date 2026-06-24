---
name: painel-admin
description: Trabalhar no painel administrativo da Conatus Academy — gestão de cursos, alunos, matrículas, certificados e avaliações via rotas /admin e adminApi. Use ao mexer em telas pages/admin/, AdminLayout ou nas rotas server/src/routes/admin.js.
---

# Painel Administrativo

## Quando usar
- Criar ou editar telas em `src/pages/admin/` (`AdminDashboard`, `AdminCursos`, `AdminAlunos`, `AdminCertificados`, `AdminAvaliacoes`, `CourseEditor`).
- Adicionar/alterar endpoints administrativos em `server/src/routes/admin.js`.
- Mexer em matrícula/desmatrícula, autorizações de cursos internos ou relatórios de progresso.

## Regras do projeto
- **Backend é CommonJS** (`require`/`module.exports`) — NÃO use `import/export` no `server/`. O frontend é ESM.
- **Acesso ao painel:** rotas admin protegidas por `ProtectedRoute requireStaff`/`requireAdmin` no front e por middleware de role no back. Veja a skill `permissoes-perfil` para a matriz de papéis. `AdminLayout.jsx` usa `NavLink` com estado ativo.
- **API admin:** consuma via `src/services/adminApi.js` (export **nomeado**, não default). Ele reusa `httpClient.js` (`getHeaders()`/`request()`). NÃO duplique lógica de fetch/headers.
- **CRUD de cursos:** `admin.js` usa `CURSO_FIELDS` dinâmico. Ao adicionar coluna no curso, atualize `CURSO_FIELDS` e o editor.
- **Operações transacionais (use transação Postgres):**
  - `POST /cursos/:id/duplicar` — copia módulos + aulas + avaliação + questões.
  - `DELETE /admin/cursos/:id/matriculados/:alunoId` — remove matrícula + progresso + tentativas, **preserva certificados**.
- **Matriculados:** `GET /cursos/:id/matriculados` traz progresso + melhor nota + certificado.
- **Status do curso:** `PUT /cursos/:id/status` (rascunho/publicado/inativo). Curso não publicado não aparece no catálogo do aluno.

## Checklist de implementação
- [ ] Backend em CommonJS (`require`), sem `import`?
- [ ] Rota protegida por role no servidor (não confie só no front)?
- [ ] Reusei `adminApi.js`/`httpClient.js` em vez de novo fetch?
- [ ] Operações multi-tabela dentro de transação (`BEGIN`/`COMMIT`/`ROLLBACK`)?
- [ ] Coluna nova refletida em `CURSO_FIELDS` e no `CourseEditor`?
- [ ] Desmatrícula preserva certificados emitidos?
- [ ] Queries parametrizadas (`$1`, `$2`) — sem SQL concatenado?

## Critérios de qualidade
- Nenhum endpoint admin acessível sem verificação de role no servidor.
- Falha em uma etapa de operação composta faz rollback completo.
- Listagens com contagens corretas (matriculados, módulos, aulas).
- Erros retornam JSON `{ erro: '...' }` com status HTTP adequado.

## Comandos de teste/verificação
```bash
cd conatus-academy-react
npm run dev:server    # node server/server.js (sem hot-reload — reinicie ao mudar código)
# Confirme que rota admin retorna 401/403 sem token de admin:
curl -i http://localhost:3000/api/admin/cursos
# Fluxo: login admin → criar curso → publicar → ver matriculados → desmatricular
npm run lint && npm run build
```
