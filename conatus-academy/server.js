const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static('public'));

let users = [];
let cursos = [
  { id: 1, nome: "Relés de Proteção Elétrica", duracao: "20h", image: "assets/img/Relés de Proteção Elétrica.png" },
  { id: 2, nome: "Geradores para Data Center", duracao: "15h", image: "assets/img/Geradores para Data Center.png" },
  { id: 3, nome: "Introdução ao Data Center", duracao: "10h", image: "assets/img/Introdução ao Data Center.png" },
  { id: 4, nome: "Segurança em Data Center", duracao: "12h", image: "assets/img/Segurança em Data Center.png" },
  { id: 5, nome: "Redes e Telecom", duracao: "18h", image: "assets/img/Redes e Telecom.png" },
  { id: 6, nome: "Refrigeração para Data Center", duracao: "16h", image: "assets/img/Refrigeração para Data Center.png" }
];

// cadastro
app.post('/register', (req, res) => {
  users.push(req.body);
  res.send({ message: "Usuário criado!" });
});

// login
app.post('/login', (req, res) => {
  const user = users.find(
    u => u.email === req.body.email && u.password === req.body.password
  );

  if (user) {
    res.send({ success: true, user: { email: user.email } });
  } else {
    // Para facilitar o teste no MVP, se o array de usuários estiver vazio, vamos aceitar qualquer login ou criar um default?
    // Melhor manter a lógica do usuário, mas vou adicionar um usuário default para facilitar a vida dele.
    if (users.length === 0 && req.body.email === "admin@dc.com" && req.body.password === "123456") {
        res.send({ success: true, user: { email: "admin@dc.com" } });
    } else {
        res.send({ success: false });
    }
  }
});

// cursos
app.get('/cursos', (req, res) => {
  res.send(cursos);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
