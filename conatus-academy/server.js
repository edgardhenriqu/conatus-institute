require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./src/routes/auth");
const cursosRoutes = require("./src/routes/cursos");
const adminRoutes = require("./src/routes/admin");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas de autenticação
app.use("/api/auth", authRoutes);

// Rotas de cursos e matrículas
app.use("/api/cursos", cursosRoutes);

// Rotas de administração
app.use("/api/admin", adminRoutes);

// Arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, "public")));

// Rota de cursos (compatibilidade com frontend existente)
app.get("/cursos", async (req, res) => {
  try {
    const pool = require("./db/connection");
    const resultado = await pool.query('SELECT * FROM cursos ORDER BY id');
    res.json(resultado.rows);
  } catch (error) {
    console.error('Erro ao buscar cursos:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Redirecionamentos das rotas antigas para as novas (compatibilidade)
app.get("/dashboard", (req, res) => {
  res.redirect("/pages/aluno/dashboard.html");
});

app.get("/login", (req, res) => {
  res.redirect("/pages/auth/login.html");
});

app.get("/dashboard-admin", (req, res) => {
  res.redirect("/pages/admin/dashboard-admin.html");
});

app.get("/admin-alunos", (req, res) => {
  res.redirect("/pages/admin/admin-alunos.html");
});

app.get("/admin-cursos", (req, res) => {
  res.redirect("/pages/admin/admin-cursos.html");
});

app.get("/admin-certificados", (req, res) => {
  res.redirect("/pages/admin/admin-certificados.html");
});

app.get("/cursos-geracao", (req, res) => {
  res.redirect("/pages/cursos/geracao/curso-geracao.html");
});

// Página inicial (mantida na raiz)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Porta para local e Vercel
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Rodando na porta ${PORT}`);
});

module.exports = app;