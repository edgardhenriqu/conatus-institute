# Reorganização de Estrutura - Conatus Academy

## Nova Estrutura de Pastas

```
conatus-academy/
├── server.js                    # Servidor Express principal
├── .env                         # Variáveis de ambiente
├── package.json                 # Dependências
├── db/
│   └── connection.js            # Pool PostgreSQL
├── src/
│   ├── routes/
│   │   ├── auth.js              # Rotas de autenticação
│   │   ├── cursos.js            # Rotas de cursos/matrículas
│   │   └── admin.js             # Rotas administrativas
│   └── middlewares/
│       └── auth.js              # Middleware de autenticação
├── public/                      # ← Arquivos estáticos servidos pelo Express
│   ├── index.html               # Página inicial (Landing Page)
│   │
│   ├── assets/
│   │   └── img/                 # Imagens do projeto
│   │       ├── Logo Institute.svg
│   │       ├── datacenter-hero.png
│   │       ├── institute-background.png
│   │       └── ... (imagens dos cursos)
│   │
│   ├── css/                     # Estilos CSS
│   │   ├── global.css           # Estilo global (era style.css)
│   │   └── curso-geracao.css    # Estilos do curso de geração
│   │
│   ├── js/                      # Scripts JavaScript
│   │   └── cursos/
│   │       └── curso-geracao.js # Lógica do curso de geração
│   │
│   └── pages/                   # Páginas HTML organizadas
│       ├── auth/                # Autenticação
│       │   └── login.html       # Login e cadastro
│       │
│       ├── aluno/               # Páginas do aluno
│       │   ├── dashboard.html   # Dashboard do aluno
│       │   ├── cursos.html      # Catálogo de cursos
│       │   ├── curso-detalhes.html # Detalhes de um curso
│       │   └── certificado.html # Visualização de certificado
│       │
│       ├── admin/               # Painel administrativo
│       │   ├── dashboard-admin.html # Dashboard admin
│       │   ├── admin-alunos.html    # Gerenciar alunos
│       │   ├── admin-cursos.html    # Gerenciar cursos
│       │   └── admin-certificados.html # Gerenciar certificados
│       │
│       └── cursos/              # Páginas de cursos
│           └── geracao/
│               └── curso-geracao.html # Curso de geração
│
└── api/                         # Legado (não utilizado)
```

## Arquivos Movidos

| Arquivo Original | Nova Localização |
|------------------|------------------|
| `public/style.css` | `public/css/global.css` |
| `public/cursos/geracao/curso-geracao.css` | `public/css/curso-geracao.css` |
| `public/cursos/geracao/curso-geracao.js` | `public/js/cursos/curso-geracao.js` |
| `public/login.html` | `public/pages/auth/login.html` |
| `public/dashboard.html` | `public/pages/aluno/dashboard.html` |
| `public/cursos.html` | `public/pages/aluno/cursos.html` |
| `public/curso-detalhes.html` | `public/pages/aluno/curso-detalhes.html` |
| `public/certificado.html` | `public/pages/aluno/certificado.html` |
| `public/dashboard-admin.html` | `public/pages/admin/dashboard-admin.html` |
| `public/admin-alunos.html` | `public/pages/admin/admin-alunos.html` |
| `public/admin-cursos.html` | `public/pages/admin/admin-cursos.html` |
| `public/admin-certificados.html` | `public/pages/admin/admin-certificados.html` |
| `public/cursos/geracao/curso-geracao.html` | `public/pages/cursos/geracao/curso-geracao.html` |

## Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `server.js` | Adicionados redirecionamentos das rotas antigas para as novas |
| Todos os HTML em `pages/` | Caminhos CSS, JS e imagens atualizados |
| `public/js/cursos/curso-geracao.js` | Caminho do certificado atualizado |

## Rotas de Compatibilidade

O `server.js` mantém redirecionamentos para as rotas antigas:

| Rota Antiga | Redireciona Para |
|-------------|------------------|
| `/dashboard` | `/pages/aluno/dashboard.html` |
| `/login` | `/pages/auth/login.html` |
| `/dashboard-admin` | `/pages/admin/dashboard-admin.html` |
| `/admin-alunos` | `/pages/admin/admin-alunos.html` |
| `/admin-cursos` | `/pages/admin/admin-cursos.html` |
| `/admin-certificados` | `/pages/admin/admin-certificados.html` |
| `/cursos-geracao` | `/pages/cursos/geracao/curso-geracao.html` |

## URLs das Páginas

| Página | URL |
|--------|-----|
| Página Inicial | `http://localhost:3000/` |
| Login | `http://localhost:3000/pages/auth/login.html` |
| Dashboard Aluno | `http://localhost:3000/pages/aluno/dashboard.html` |
| Cursos | `http://localhost:3000/pages/aluno/cursos.html` |
| Curso Detalhes | `http://localhost:3000/pages/aluno/curso-detalhes.html?id=1` |
| Certificado | `http://localhost:3000/pages/aluno/certificado.html?curso_id=1` |
| Dashboard Admin | `http://localhost:3000/pages/admin/dashboard-admin.html` |
| Admin Alunos | `http://localhost:3000/pages/admin/admin-alunos.html` |
| Admin Cursos | `http://localhost:3000/pages/admin/admin-cursos.html` |
| Admin Certificados | `http://localhost:3000/pages/admin/admin-certificados.html` |
| Curso Geração | `http://localhost:3000/pages/cursos/geracao/curso-geracao.html` |

## Passo a Passo para Testar

### 1. Reiniciar o Servidor

```bash
cd conatus-academy
npm start
```

### 2. Testar Cada Página

#### Página Inicial
- Acesse `http://localhost:3000/`
- Verifique se a landing page carrega corretamente
- Verifique se o carrossel de cursos funciona

#### Login
- Acesse `http://localhost:3000/pages/auth/login.html`
- Faça login com um aluno existente
- Verifique se redireciona para o dashboard

#### Dashboard do Aluno
- Acesse `http://localhost:3000/pages/aluno/dashboard.html`
- Verifique se os cursos matriculados aparecem
- Verifique se o progresso é exibido corretamente

#### Catálogo de Cursos
- Acesse `http://localhost:3000/pages/aluno/cursos.html`
- Verifique se os cursos são carregados da API
- Teste a função de matrícula

#### Detalhes do Curso
- Acesse `http://localhost:3000/pages/aluno/curso-detalhes.html?id=1`
- Verifique se os dados do curso são exibidos
- Teste o botão de matrícula

#### Certificado
- Acesse `http://localhost:3000/pages/aluno/certificado.html?curso_id=1`
- Verifique se o certificado é exibido (se elegível)
- Teste o botão de imprimir

#### Dashboard Admin
- Acesse `http://localhost:3000/pages/admin/dashboard-admin.html`
- Faça login com admin@conatus.com / admin123
- Verifique se as estatísticas são exibidas

#### Gerenciar Alunos (Admin)
- Acesse `http://localhost:3000/pages/admin/admin-alunos.html`
- Verifique a lista de alunos
- Teste busca, edição e exclusão

#### Gerenciar Cursos (Admin)
- Acesse `http://localhost:3000/pages/admin/admin-cursos.html`
- Verifique a lista de cursos
- Teste criação, edição e exclusão

#### Gerenciar Certificados (Admin)
- Acesse `http://localhost:3000/pages/admin/admin-certificados.html`
- Verifique a lista de certificados
- Teste filtros e exclusão

#### Curso de Geração
- Acesse `http://localhost:3000/pages/cursos/geracao/curso-geracao.html`
- Faça login primeiro
- Verifique se o conteúdo do curso carrega
- Teste o progresso e o quiz

### 3. Verificar Compatibilidade

Teste as rotas antigas para garantir que os redirecionamentos funcionam:

- `http://localhost:3000/dashboard` → Deve redirecionar para o dashboard do aluno
- `http://localhost:3000/login` → Deve redirecionar para o login
- `http://localhost:3000/dashboard-admin` → Deve redirecionar para o dashboard admin

## Credenciais de Teste

### Aluno
- Email: (use um aluno já cadastrado)
- Senha: (use a senha do aluno)

### Administrador
- Email: admin@conatus.com
- Senha: admin123

## Notas Técnicas

1. **Compatibilidade**: Todas as rotas antigas continuam funcionando via redirecionamentos
2. **Express Static**: O Express continua servindo a pasta `public/` como arquivos estáticos
3. **API**: Todas as rotas de API continuam inalteradas (`/api/auth/*`, `/api/cursos/*`, `/api/admin/*`)
4. **Autenticação**: O sistema de login/logout continua funcionando normalmente
5. **Banco de Dados**: Nenhuma alteração foi feita no banco de dados
