---
name: docker-deploy
description: Infra, banco de dados, variáveis de ambiente e deploy da Conatus Academy. Use ao mexer em docker-compose, schema/migrações, .env, configuração de boot do servidor, CORS, SMTP ou ao preparar build/deploy.
---

# Docker e Deploy

## Quando usar
- Subir/configurar o banco via Docker.
- Alterar schema, migrações ou seeds.
- Mexer em `.env`, CORS, SMTP ou na sequência de boot do servidor.
- Preparar build de produção ou deploy.

## Regras do projeto
- **Banco via Docker:** `docker-compose.yml` na raiz sobe `postgres:16-alpine` (container `conatus-postgres`), DB `conatus_db`, porta 5432, encoding UTF-8/pt_BR, volume `postgres_data`, healthcheck `pg_isready`. NÃO comite senhas reais de produção aqui.
- **Schema é idempotente e roda no boot:** `server.js` chama `ensureSchema()` → depois `seedMopCourse()` → só então `app.listen()`. Migrações vão em `server/db/ensureSchema.js` (e SQL relacionado). Toda mudança de schema deve ser **idempotente** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) para não quebrar bancos existentes.
  - Ao adicionar coluna `NOT NULL`/com default que afete contas antigas, siga o padrão usado em `email_verificado`: aplicar com default seguro e depois ajustar (`SET DEFAULT`) para não bloquear dados legados.
- **Backend é CommonJS** (`require`). Sem hot-reload: `node server/server.js` precisa ser **reiniciado** ao mudar código ou `.env`. (Pendência conhecida: adicionar `nodemon` ao dev.)
- **Variáveis de ambiente (.env, NÃO commitado):**
  - DB: conexão Postgres (ver `server/db/connection.js`; `dotenv` é carregado uma vez no boot).
  - `CORS_ORIGIN` — origem permitida (default `http://localhost:5173`). Em produção, restrinja ao domínio real.
  - `SMTP_*` — e-mail via nodemailer (`SMTP_PASS` é senha de app do Gmail). Sem SMTP, o mailer só loga o link e lança erro.
  - JWT secret, etc. Mantenha `.env.example` atualizado com placeholders seguros.
- **`.gitignore`:** garanta que `.env` está ignorado (já corrigido — credenciais não devem ser commitadas).
- **Build do front:** Vite 8 → `npm run build` gera `dist/`.

## Pendências de hardening (aplicar quando relevante)
- `express-rate-limit` em `/api/auth/*`.
- Forçar troca da senha admin padrão (`admin123`) no primeiro login.
- Paginação nos endpoints de listagem.

## Checklist de implementação
- [ ] Mudança de schema é idempotente e está em `ensureSchema.js`?
- [ ] Colunas novas não bloqueiam contas/dados antigos?
- [ ] `.env` continua fora do git; `.env.example` atualizado?
- [ ] `CORS_ORIGIN` restrito ao domínio correto em produção?
- [ ] Reiniciei o servidor após mudar código/.env (sem hot-reload)?
- [ ] Backend permaneceu em CommonJS?
- [ ] Healthcheck e volume do Postgres preservados?

## Critérios de qualidade
- `docker compose up` sobe o Postgres saudável; servidor conecta e cria schema sem erro em banco novo E existente.
- Nenhum segredo commitado.
- CORS não permite origens arbitrárias em produção.
- Boot determinístico: schema → seed → listen.

## Comandos de teste/verificação
```bash
# Subir o banco
docker compose up -d
docker compose ps              # conatus-postgres deve estar healthy
docker compose logs postgres

# Subir a aplicação
cd conatus-academy-react
npm run dev:server             # observe ensureSchema + seedMopCourse sem erro
npm run build                  # build de produção limpo

# Reset do banco (CUIDADO — apaga dados):
# docker compose down -v && docker compose up -d
```
