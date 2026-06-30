require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require("path");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./src/routes/auth");
const cursosRoutes = require("./src/routes/cursos");
const adminRoutes = require("./src/routes/admin");
const noticiasRoutes = require("./src/routes/noticias");
const certificadosRoutes = require("./src/routes/certificados");

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos enviados pelo construtor de cursos (capas, etc.)
// Cabeçalhos de segurança: impedem o navegador de "sniffar" o conteúdo e de
// executar um arquivo forjado como HTML/script (defesa contra XSS armazenado).
app.use("/api/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("Content-Disposition", "inline");
  },
}));

app.use("/api/auth", authRoutes);
app.use("/api/cursos", cursosRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/noticias", noticiasRoutes);
app.use("/api/certificados", certificadosRoutes);

const PORT = process.env.PORT || 3000;

const ensureSchema = require('./db/ensureSchema');
const seedMopCourse = require('./db/seedMopCourse');

ensureSchema()
  .then(() => seedMopCourse())
  .catch(err => console.error('Aviso: não foi possível atualizar o schema/seed automaticamente:', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Backend rodando na porta ${PORT}`);
    });
  });

module.exports = app;
