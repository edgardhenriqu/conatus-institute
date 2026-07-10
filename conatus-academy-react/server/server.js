require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./src/routes/auth");
const cursosRoutes = require("./src/routes/cursos");
const adminRoutes = require("./src/routes/admin");
const noticiasRoutes = require("./src/routes/noticias");
const certificadosRoutes = require("./src/routes/certificados");

const app = express();

// Confia no proxy do Replit/Nginx para X-Forwarded-* (IP real, https).
app.set("trust proxy", 1);

// ── CORS ────────────────────────────────────────────────────────────────────
// Em produção no Replit o frontend é servido pelo próprio Express (mesma
// origem), então o CORS é irrelevante para o SPA. Ele só importa se a API for
// consumida por outra origem. CORS_ORIGIN aceita várias origens separadas por
// vírgula; sem valor, vale só o Vite em desenvolvimento.
//
// A origem NUNCA é refletida de volta: com `credentials: true`, devolver
// `Access-Control-Allow-Origin: <origem-do-atacante>` deixaria qualquer site
// ler respostas autenticadas do usuário logado. É uma allowlist explícita.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  // origin ausente = mesma origem, curl, health check do deploy: sem CORS envolvido.
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  credentials: true,
}));

// O padrão de 100 KB é apertado para o HTML de uma aula longa (e estourava com
// conteúdo antigo que trazia imagens embutidas em base64). Imagens novas sobem
// como multipart por /admin/upload/imagem, então 1 MB de JSON sobra.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Arquivos enviados pelo construtor de cursos (capas, imagens de aula, etc.)
// Ficam na tabela arquivos_upload — o disco do Replit é efêmero e não é
// compartilhado com o ambiente local, então uploads em disco quebravam no
// outro ambiente e sumiam no redeploy.
// Cabeçalhos de segurança: impedem o navegador de "sniffar" o conteúdo e de
// executar um arquivo forjado como HTML/script (defesa contra XSS armazenado).
const pool = require("./db/connection");
const setUploadHeaders = (res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.setHeader("Content-Disposition", "inline");
};
app.get("/api/uploads/courses/:nome", async (req, res, next) => {
  try {
    const r = await pool.query(
      "SELECT mime, dados FROM arquivos_upload WHERE nome = $1",
      [req.params.nome]
    );
    if (!r.rows.length) return next(); // cai no express.static (arquivos antigos em disco)
    setUploadHeaders(res);
    // O nome inclui timestamp, então o conteúdo nunca muda: cache imutável.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.type(r.rows[0].mime);
    res.send(r.rows[0].dados);
  } catch (err) {
    next(err);
  }
});
// Fallback em disco para instalações antigas que ainda tenham arquivos locais.
app.use("/api/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: setUploadHeaders,
}));

// Health check (usado por monitores/deploys do Replit)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/auth", authRoutes);
app.use("/api/cursos", cursosRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/noticias", noticiasRoutes);
app.use("/api/certificados", certificadosRoutes);

// ── Frontend (SPA) ───────────────────────────────────────────────────────────
// Em produção, o Express também serve o build do Vite (dist/), deixando API e
// site na MESMA porta/origem — modelo esperado pelo Replit. Em dev use
// `npm run dev` (Vite na 5173 faz proxy do /api para cá).
const distPath = path.join(__dirname, "..", "dist");
const hasBuild = fs.existsSync(path.join(distPath, "index.html"));

if (hasBuild) {
  app.use(express.static(distPath));
  // Fallback do SPA: qualquer rota que não seja /api devolve o index.html
  // para o React Router assumir o roteamento no cliente.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// 404 para rotas de API não encontradas (JSON, não HTML)
app.use("/api", (req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

// ── Tratamento global de erros ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Erro não tratado na requisição:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ erro: "Erro interno do servidor" });
});

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // aceita conexões externas (exigência do Replit)

// Avisos de configuração crítica antes de subir
if (!process.env.JWT_SECRET) {
  console.warn(
    "[AVISO] JWT_SECRET não definido. Configure-o nos Secrets do Replit " +
    "(ou no .env). Sem ele, login e autenticação não funcionam."
  );
}
if (!process.env.DB_HOST) {
  console.warn(
    "[AVISO] DB_HOST não definido. Configure as credenciais do banco nos " +
    "Secrets do Replit (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL)."
  );
}

const ensureSchema = require('./db/ensureSchema');
const seedMopCourse = require('./db/seedMopCourse');
const migrateUploads = require('./db/migrateUploads');

ensureSchema()
  .then(() => seedMopCourse())
  .then(() => migrateUploads())
  .catch(err => console.error('Aviso: não foi possível atualizar o schema/seed automaticamente:', err.message))
  .finally(() => {
    app.listen(PORT, HOST, () => {
      console.log("");
      console.log("🚀 Conatus Institute — servidor iniciado");
      console.log(`   Ambiente : ${process.env.NODE_ENV || "development"}`);
      console.log(`   Host     : ${HOST}`);
      console.log(`   Porta    : ${PORT}`);
      console.log(`   Frontend : ${hasBuild ? "servindo dist/ (build de produção)" : "NÃO compilado — rode 'npm run build'"}`);
      console.log("");
    });
  });

// ── Estabilidade: não derruba o processo por erros assíncronos não tratados ────
process.on("unhandledRejection", (reason) => {
  console.error("Promise rejeitada não tratada:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Exceção não capturada:", err);
});

module.exports = app;
