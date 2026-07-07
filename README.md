# Conatus Institute — Plataforma de Cursos

Plataforma web de cursos e certificação da **Conatus Institute**. Inclui site
institucional, catálogo de cursos, sala de aula, avaliações com emissão de
certificado, área administrativa e autenticação com confirmação de e-mail.

## Arquitetura

```
conatus-institute/                ← raiz do repositório (importada no Replit)
├── package.json                  ← scripts que orquestram build/execução
├── .replit                       ← configuração de execução e deploy no Replit
└── conatus-academy-react/        ← aplicação
    ├── src/                      ← frontend React (Vite)
    ├── server/                   ← backend Express (API + serve o build)
    │   ├── server.js             ← ponto de entrada
    │   ├── db/                   ← conexão, schema e seed do PostgreSQL
    │   └── src/                  ← rotas, middlewares, e-mail, captcha
    └── dist/                     ← build de produção (gerado por `npm run build`)
```

- **Frontend:** React 19 + Vite + React Router.
- **Backend:** Express 4 (CommonJS). Serve a API em `/api` e, em produção, também
  serve o build do frontend (`dist/`) — **tudo na mesma porta/origem**.
- **Banco:** PostgreSQL (Supabase em produção; PostgreSQL local em dev).
- **Auth:** JWT (enviado no header `Authorization`), com confirmação de e-mail e
  redefinição de senha via SMTP.

## Requisitos

- Node.js **18+**
- PostgreSQL (local ou uma instância gerenciada como o Supabase)

## Variáveis de ambiente

Copie `conatus-academy-react/.env.example` para `conatus-academy-react/.env` e
preencha os valores. No **Replit**, cadastre cada uma em **Secrets** (não use
arquivo `.env`).

| Variável            | Obrigatória | Descrição                                                        |
|---------------------|-------------|------------------------------------------------------------------|
| `DB_HOST`           | ✅          | Host do PostgreSQL                                               |
| `DB_PORT`           | ✅          | Porta (ex.: 5432)                                               |
| `DB_NAME`           | ✅          | Nome do banco                                                    |
| `DB_USER`           | ✅          | Usuário                                                          |
| `DB_PASSWORD`       | ✅          | Senha                                                            |
| `DB_SSL`            | ➖          | `true` em bancos gerenciados (Supabase)                          |
| `DB_SSL_CA`         | ➖          | Caminho do certificado CA (recomendado com `DB_SSL=true`)        |
| `DB_SSL_NO_VERIFY`  | ➖          | `true` pula a verificação do certificado (inseguro)             |
| `JWT_SECRET`        | ✅          | Chave secreta longa (≥ 32 caracteres) para assinar os tokens     |
| `JWT_EXPIRES_IN`    | ➖          | Validade do token (padrão `24h`)                                 |
| `PORT`              | ➖          | Porta do servidor (o Replit injeta automaticamente)             |
| `NODE_ENV`          | ➖          | `production` no deploy                                           |
| `CORS_ORIGIN`       | ➖          | Origens permitidas (vazio = mesma origem; ok no Replit)         |
| `APP_URL`           | ✅¹         | URL pública do site (links de e-mail). No Replit, a URL do Repl |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS`/`MAIL_FROM` | ➖² | Envio de e-mails transacionais |

¹ Necessária para os links de confirmação/redefinição funcionarem.
² Sem SMTP configurado, o app não trava: registra o link no console.

## Executar localmente

```bash
# 1. Instale as dependências e prepare o banco
cd conatus-academy-react
cp .env.example .env        # edite com suas credenciais
npm install

# 2a. Modo desenvolvimento (Vite na 5173 + API na 3000, com hot reload)
npm run dev

# 2b. Modo produção local (build + servidor único servindo tudo)
npm run build
npm start                   # http://localhost:3000
```

> Para desenvolvimento local você precisa de um PostgreSQL acessível (instância
> local ou a mesma do Supabase). Ajuste as credenciais no `.env`.

O schema é criado/atualizado automaticamente na inicialização do servidor
(`server/db/ensureSchema.js`), e um curso de exemplo é semeado
(`server/db/seedMopCourse.js`). Não é necessário rodar migrações manualmente.

## Executar / fazer deploy no Replit

1. **Importe o repositório** no Replit (Create → Import from GitHub).
2. Em **Secrets**, cadastre as variáveis de ambiente da tabela acima
   (no mínimo as de banco, `JWT_SECRET` e `APP_URL` com a URL do seu Repl).
3. Clique em **Run**. O Replit executa `npm run build && npm start`: compila o
   frontend e sobe o Express servindo API + site na mesma porta.
4. Para publicar, use **Deploy** (Autoscale). O `.replit` já define os passos de
   `build` e `run` do deploy.

O servidor escuta em `0.0.0.0` e na porta de `process.env.PORT` — compatível com
o roteamento do Replit sem ajustes.

## Notas

- Os **uploads** (capas de curso) são gravados em
  `conatus-academy-react/server/uploads/`. No Replit, o sistema de arquivos de
  deploys Autoscale é efêmero — para uploads persistentes use um bucket de
  storage (ex.: Supabase Storage) ou um Reserved VM Deployment.
- As credenciais **nunca** são versionadas: `.env` e `*.bak` estão no
  `.gitignore`; apenas `.env.example` é commitado.
