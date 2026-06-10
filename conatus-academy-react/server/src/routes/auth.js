const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../db/connection');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function isValidCpf(cpf) {
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +n[i] * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== +n[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += +n[i] * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === +n[10];
}

function isValidPhone(phone) {
  const n = phone.replace(/\D/g, '');
  if (n.length < 10 || n.length > 11) return false;
  const ddd = parseInt(n.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (n.length === 11 && n[2] !== '9') return false;
  return true;
}

router.post('/cadastrar', async (req, res) => {
  try {
    const { nome, email, senha, cpf, data_nascimento, telefone, endereco, cidade, estado } = req.body;

    if (!nome || !email || !senha || !cpf || !data_nascimento || !telefone || !endereco || !cidade || !estado) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    const pwdOk = senha.length >= 8
      && /[A-Z]/.test(senha)
      && /[a-z]/.test(senha)
      && /[0-9]/.test(senha)
      && /[^A-Za-z0-9]/.test(senha);
    if (!pwdOk) {
      return res.status(400).json({ erro: 'A senha deve ter no mínimo 8 caracteres, letra maiúscula, minúscula, número e caractere especial.' });
    }

    if (!isValidCpf(cpf)) {
      return res.status(400).json({ erro: 'CPF inválido. Verifique os dígitos informados.' });
    }

    if (!isValidPhone(telefone)) {
      return res.status(400).json({ erro: 'Telefone inválido. Informe o DDD + número no formato brasileiro.' });
    }

    const existeEmail = await pool.query('SELECT id FROM alunos WHERE email = $1', [email]);
    if (existeEmail.rows.length > 0) {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }

    const existeCpf = await pool.query('SELECT id FROM alunos WHERE cpf = $1', [cpf]);
    if (existeCpf.rows.length > 0) {
      return res.status(409).json({ erro: 'CPF já cadastrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const resultado = await pool.query(
      `INSERT INTO alunos (nome, email, senha, cpf, data_nascimento, telefone, endereco, cidade, estado, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'aluno')
       RETURNING id, nome, email, cpf, data_nascimento, telefone, endereco, cidade, estado, role, created_at`,
      [nome, email, senhaHash, cpf, data_nascimento, telefone, endereco, cidade, estado]
    );

    const aluno = resultado.rows[0];

    const token = jwt.sign({ id: aluno.id, role: aluno.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({ aluno, token });
  } catch (error) {
    console.error('Erro ao cadastrar aluno:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    // Ensure JWT secret is configured
    if (!JWT_SECRET) {
      console.error('JWT_SECRET não definido');
      return res.status(500).json({ erro: 'Erro interno do servidor' });
    }

    const resultado = await pool.query('SELECT * FROM alunos WHERE email = $1', [email]);
    if (resultado.rows.length === 0) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const aluno = resultado.rows[0];
    const senhaValida = await bcrypt.compare(senha, aluno.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    if (!aluno.ativo) {
      return res.status(403).json({ erro: 'Conta desativada. Entre em contato com o administrador.' });
    }

    const token = jwt.sign({ id: aluno.id, role: aluno.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const { senha: _, ...alunoSemSenha } = aluno;
    res.json({ aluno: alunoSemSenha, token });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, nome, email, cpf, data_nascimento, telefone, endereco, cidade, estado, created_at FROM alunos WHERE id = $1',
      [req.alunoId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }

    res.json({ aluno: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.put('/perfil', authMiddleware, async (req, res) => {
  try {
    const { nome, telefone, endereco, cidade, estado } = req.body;

    const resultado = await pool.query(
      `UPDATE alunos
       SET nome = COALESCE($1, nome),
           telefone = COALESCE($2, telefone),
           endereco = COALESCE($3, endereco),
           cidade = COALESCE($4, cidade),
           estado = COALESCE($5, estado),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, nome, email, cpf, data_nascimento, telefone, endereco, cidade, estado, created_at, updated_at`,
      [nome || null, telefone || null, endereco || null, cidade || null, estado || null, req.alunoId]
    );

    res.json({ aluno: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;
