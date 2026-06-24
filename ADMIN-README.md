# Área Administrativa - Conatus Institute

## Resumo das Alterações

### Arquivos Criados:
1. **`conatus-academy-react/server/db/ensureSchema.js`** - Migrações idempotentes aplicadas no boot do servidor
2. **`conatus-academy/src/middlewares/auth.js`** - Middlewares de autenticação e autorização
3. **`conatus-academy/src/routes/admin.js`** - Rotas da API administrativa
4. **`conatus-academy/public/dashboard-admin.html`** - Painel administrativo principal
5. **`conatus-academy/public/admin-alunos.html`** - Página de gerenciamento de alunos
6. **`conatus-academy/public/admin-cursos.html`** - Página de gerenciamento de cursos
7. **`conatus-academy/public/admin-certificados.html`** - Página de gerenciamento de certificados

### Arquivos Alterados:
1. **`conatus-academy-react/server/db/init.sql`** - Schema canônico (banco novo); inclui `role` e `ativo` em `alunos`
2. **`conatus-academy/server.js`** - Adicionada rota `/api/admin`
3. **`conatus-academy/src/routes/auth.js`** - Atualizado para incluir campo `role` no JWT e retorno
4. **`conatus-academy/public/login.html`** - Atualizado para redirecionar admin para `dashboard-admin.html`

---

## Passo a Passo para Testar

### 1. Banco de Dados (automático)

Não é necessário rodar migração manual. O schema é aplicado sozinho:

- **Banco novo:** `server/db/init.sql` roda automaticamente na primeira inicialização do container Postgres (montado no `docker-compose.yml`).
- **Banco existente:** `server/db/ensureSchema.js` roda no boot do servidor e aplica de forma idempotente todas as colunas/tabelas faltantes.

Basta subir o Postgres e reiniciar o servidor.

### 2. Reiniciar o Servidor

```bash
cd conatus-academy
npm start
```

### 3. Fazer Login como Administrador

1. Acesse `http://localhost:3000/login.html`
2. Use as credenciais:
   - **Email:** admin@conatus.com
   - **Senha:** admin123
3. Você será redirecionado para o painel administrativo

### 4. Funcionalidades Disponíveis

#### Dashboard (`dashboard-admin.html`)
- Visualizar estatísticas gerais (alunos, cursos, matrículas, certificados)
- Acesso rápido a todas as áreas de gerenciamento
- Lista dos últimos alunos cadastrados

#### Gerenciar Alunos (`admin-alunos.html`)
- Visualizar lista completa de alunos
- Buscar aluno por nome ou email
- Ver detalhes de cada aluno (dados pessoais, matrículas, certificados)
- Editar dados do aluno
- Ativar/desativar aluno
- Excluir aluno

#### Gerenciar Cursos (`admin-cursos.html`)
- Visualizar todos os cursos cadastrados
- Criar novo curso
- Editar curso existente
- Excluir curso
- Visualizar número de matrículas por curso

#### Gerenciar Certificados (`admin-certificados.html`)
- Visualizar todos os certificados emitidos
- Filtrar por aluno, curso ou período
- Visualizar código de verificação
- Excluir certificado

---

## Rotas da API Admin

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/admin/dashboard` | Estatísticas gerais |
| GET | `/api/admin/alunos` | Listar alunos |
| GET | `/api/admin/alunos/:id` | Buscar aluno por ID |
| PUT | `/api/admin/alunos/:id` | Atualizar aluno |
| DELETE | `/api/admin/alunos/:id` | Excluir aluno |
| GET | `/api/admin/cursos` | Listar cursos |
| GET | `/api/admin/cursos/:id` | Buscar curso por ID |
| POST | `/api/admin/cursos` | Criar curso |
| PUT | `/api/admin/cursos/:id` | Atualizar curso |
| DELETE | `/api/admin/cursos/:id` | Excluir curso |
| GET | `/api/admin/certificados` | Listar certificados |
| GET | `/api/admin/certificados/validar/:codigo` | Validar certificado |
| DELETE | `/api/admin/certificados/:id` | Excluir certificado |

---

## Segurança

- Todas as rotas `/api/admin` são protegidas por middleware de admin
- Apenas usuários com `role: 'admin'` podem acessar
- Se um aluno tentar acessar, receberá erro 403 (Acesso Negado)
- O frontend também verifica a role antes de carregar as páginas admin

---

## Credenciais Iniciais

| Campo | Valor |
|-------|-------|
| Nome | Administrador |
| Email | admin@conatus.com |
| Senha | admin123 |
| CPF | 000.000.000-00 |
| Role | admin |
