require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./src/routes/auth");
const cursosRoutes = require("./src/routes/cursos");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas de autenticação
app.use("/api/auth", authRoutes);

// Rotas de cursos e matrículas
app.use("/api/cursos", cursosRoutes);

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

// Página inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Porta para local e Vercel
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Rodando na porta ${PORT}`);
});

module.exports = app;