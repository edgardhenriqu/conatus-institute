# Conatus Institute — Plataforma de Cursos

Plataforma de cursos e certificação (site institucional, catálogo de cursos,
sala de aula, avaliações, certificados, área administrativa). Importada de um
repositório GitHub existente; ver `README.md` para arquitetura completa.

- **Frontend:** React 19 + Vite + React Router (`conatus-academy-react/src`)
- **Backend:** Express 4 (CommonJS), serve a API em `/api` e o build do
  frontend (`conatus-academy-react/dist`) na mesma porta
  (`conatus-academy-react/server/server.js`)
- **Banco:** PostgreSQL

## Como roda no Replit

- Workflow **Start application**: `npm run build && npm start` (raiz do
  projeto), escutando em `0.0.0.0:$PORT`.
- **Node.js 20** (módulo `nodejs-20`) — o Vite 8 deste projeto exige Node
  ≥20; o `.replit` original vinha com Node 18.
- **Banco de dados (desenvolvimento):** usa o Postgres integrado do Replit.
  `conatus-academy-react/server/db/connection.js` foi ajustado para cair nas
  variáveis `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD` (injetadas
  automaticamente pelo Replit) quando `DB_HOST` não está definido — assim não
  é preciso duplicar credenciais como secret. Em produção, defina as
  variáveis `DB_*` do `.env.example` para apontar ao Supabase (já mapeadas em
  `[userenv.production]` no `.replit`, exceto `DB_PASSWORD`).
  Schema criado manualmente uma vez a partir de `server/db/init.sql`; o app
  aplica migrações incrementais idempotentes no boot
  (`server/db/ensureSchema.js`) e semeia o curso de exemplo
  (`server/db/seedMopCourse.js`).
- **`JWT_SECRET`**: gerado automaticamente e salvo como secret do Replit
  (ambiente shared). Não é necessário reconfigurar.
- **E-mail (SMTP), tutor de IA e narração das aulas**: configurados. Valores
  não sensíveis (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
  `MAIL_FROM`, `OPENROUTER_MODEL`, `ELEVENLABS_VOICE_ID`, `TTS_PROVIDER`) em
  env vars do ambiente `development`; credenciais (`SMTP_PASS`,
  `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `ELEVENLABS_API_KEY`) salvas como
  Secrets do Replit — nunca em arquivos versionados.

## User preferences

(Nenhuma preferência registrada ainda.)
