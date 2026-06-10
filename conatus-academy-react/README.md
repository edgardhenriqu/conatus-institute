# Conatus Institute - Plataforma de Ensino

Plataforma de ensino online para cursos de infraestrutura de Data Centers, desenvolvida com React + Vite (frontend) e Node.js + Express + PostgreSQL (backend).

## Estrutura do Projeto

```
conatus-academy-react/
│
├── public/
│   ├── images/
│   │   ├── courses/          # Imagens dos cursos
│   │   ├── datacenter-hero.png
│   │   ├── institute-background.png
│   │   └── logo-institute.svg
│   ├── favicon.svg
│   └── icons.svg
│
├── server/
│   ├── db/
│   │   └── connection.js     # Conexão com PostgreSQL
│   ├── src/
│   │   ├── middlewares/
│   │   │   └── auth.js       # Middlewares de autenticação
│   │   └── routes/
│   │       ├── admin.js      # Rotas administrativas
│   │       ├── auth.js       # Rotas de autenticação
│   │       └── cursos.js     # Rotas de cursos
│   ├── server.js             # Servidor Express
│   ├── package.json
│   └── package-lock.json
│
├── src/
│   ├── assets/
│   │   └── hero.png          # Imagem do hero
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   └── Footer.jsx
│   │   ├── sections/
│   │   │   ├── HeroSection.jsx
│   │   │   ├── StatsSection.jsx
│   │   │   ├── ProgramsSection.jsx
│   │   │   ├── FreeCoursesCTA.jsx
│   │   │   └── NewsSection.jsx
│   │   └── ui/
│   │       ├── Badge.jsx
│   │       ├── Button.jsx
│   │       ├── Carousel.jsx
│   │       ├── CourseCard.jsx
│   │       └── ProtectedRoute.jsx
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx   # Contexto de autenticação
│   │
│   ├── data/
│   │   ├── courses.js        # Dados estáticos de cursos
│   │   └── mopCourseContent.js # Conteúdo do curso MOP
│   │
│   ├── hooks/                # Hooks personalizados
│   │
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Courses.jsx
│   │   ├── CourseDetails.jsx
│   │   ├── CourseViewer.jsx
│   │   ├── Dashboard.jsx
│   │   └── admin/
│   │       └── AdminDashboard.jsx
│   │
│   ├── services/
│   │   └── api.js            # Serviços de API
│   │
│   ├── styles/
│   │   ├── global.css        # Estilos globais
│   │   ├── variables.css     # Variáveis de design
│   │   └── animations.css    # Animações
│   │
│   ├── App.jsx               # Componente principal
│   └── main.jsx              # Entry point
│
├── _backup/                  # Arquivos antigos/não utilizados
│   ├── App.css
│   ├── index.css
│   ├── react.svg
│   └── vite.svg
│
├── .env                      # Variáveis de ambiente (não commitar)
├── .gitignore
├── package.json
├── package-lock.json
└── vite.config.js
```

## Funcionalidades

- **Área do Aluno:** Login, cadastro, dashboard com progresso dos cursos
- **Catálogo de Cursos:** Listagem, detalhes e matrícula
- **Sala de Aula:** Visualização de conteúdos do curso MOP
- **Painel Admin:** Gestão de alunos, cursos e certificados
- **Sistema de Certificados:** Emissão e validação

## Tecnologias

### Frontend
- React 19
- React Router DOM 7
- Vite 8

### Backend
- Node.js
- Express
- PostgreSQL (via pg)
- JWT (autenticação)
- Bcrypt (senhas)

## Como Rodar

### Pré-requisitos
- Node.js 18+
- PostgreSQL

### Instalação

```bash
# Instalar dependências do frontend
npm install

# Instalar dependências do backend
cd server
npm install
cd ..
```

### Configuração

Crie um arquivo `.env` na raiz com as seguintes variáveis:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=conatus_db
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
JWT_SECRET=sua_chave_secreta
JWT_EXPIRES_IN=24h
```

### Executar

```bash
# Rodar frontend e backend simultaneamente
npm run dev

# Ou separadamente:
npm run dev:client    # Frontend (Vite) - porta 5173
npm run dev:server    # Backend (Express) - porta 3000
```

## Rotas da API

### Autenticação
- `POST /api/auth/cadastrar` - Cadastrar novo aluno
- `POST /api/auth/login` - Login
- `GET /api/auth/perfil` - Obter perfil (requer token)
- `PUT /api/auth/perfil` - Atualizar perfil (requer token)

### Cursos
- `GET /api/cursos` - Listar cursos
- `GET /api/cursos/:id` - Obter curso por ID
- `POST /api/cursos/:cursoId/matricular` - Matricular (requer token)
- `GET /api/cursos/aluno/matriculas` - Listar matrículas do aluno (requer token)

### Admin (requer token de admin)
- `GET /api/admin/dashboard` - Estatísticas
- `GET /api/admin/alunos` - Listar alunos
- `GET /api/admin/cursos` - Listar cursos
- `POST /api/admin/cursos` - Criar curso
- `PUT /api/admin/cursos/:id` - Atualizar curso
- `DELETE /api/admin/cursos/:id` - Excluir curso

## Arquivos Backup

A pasta `_backup/` contém arquivos que não estão sendo utilizados no projeto:
- `App.css` - Estilos do template Vite (não importado)
- `index.css` - Estilos do template Vite (não importado)
- `react.svg` - Logo do React (template Vite)
- `vite.svg` - Logo do Vite (template)
