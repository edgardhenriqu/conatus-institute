const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../db/connection');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.alunoId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

router.post('/cadastrar', async (req, res) => {
  try {
    const { nome, email, senha, cpf, data_nascimento, telefone, endereco, cidade, estado } = req.body;

    if (!nome || !email || !senha || !cpf || !data_nascimento) {
      return res.status(400).json({ erro: 'Campos obrigatórios: nome, email, senha, cpf, data_nascimento' });
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
      `INSERT INTO alunos (nome, email, senha, cpf, data_nascimento, telefone, endereco, cidade, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, nome, email, cpf, data_nascimento, telefone, endereco, cidade, estado, role, created_at`,
      [nome, email, senhaHash, cpf, data_nascimento, telefone || null, endereco || null, cidade || null, estado || null]
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
