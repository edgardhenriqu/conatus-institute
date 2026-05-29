const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, "public")));

let users = [];

let cursos = [
  { id: 1, nome: "Introdução a Sistemas de Geração para Data Centers", duracao: "20h", image: "assets/img/Geradores para Data Center.png" },
  { id: 2, nome: "Introdução a Sistemas de UPS para Data Centers", duracao: "15h", image: "assets/img/Introdução ao Data Center.png" },
  { id: 3, nome: "Fundamentos de Procedimentos Operacionais em Data Centers", duracao: "10h", image: "assets/img/Relés de Proteção Elétrica.png" },
];

// Página inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Cadastro
app.post("/register", (req, res) => {
  users.push(req.body);
  res.send({ success: true, message: "Usuário criado!" });
});

// Login
app.post("/login", (req, res) => {
  const user = users.find(
    u => u.email === req.body.email && u.password === req.body.password
  );

  if (user) {
    res.send({ success: true, user: { email: user.email } });
    return;
  }

  if (
    users.length === 0 &&
    req.body.email === "admin@dc.com" &&
    req.body.password === "123456"
  ) {
    res.send({ success: true, user: { email: "admin@dc.com" } });
    return;
  }

  res.send({ success: false });
});

// Cursos
app.get("/cursos", (req, res) => {
  res.send(cursos);
});

// Porta para local e Vercel
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Rodando na porta ${PORT}`);
});

module.exports = app;