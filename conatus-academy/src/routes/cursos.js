const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../../db/connection');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

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

router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM cursos ORDER BY id');
    res.json(resultado.rows);
  } catch (error) {
    console.error('Erro ao buscar cursos:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query('SELECT * FROM cursos WHERE id = $1', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/:cursoId/matricular', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;

    const cursoExiste = await pool.query('SELECT id FROM cursos WHERE id = $1', [cursoId]);
    if (cursoExiste.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }

    const matriculaExiste = await pool.query(
      'SELECT id FROM matriculas WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, cursoId]
    );

    if (matriculaExiste.rows.length > 0) {
      return res.status(409).json({ erro: 'Você já está matriculado neste curso' });
    }

    const resultado = await pool.query(
      `INSERT INTO matriculas (aluno_id, curso_id)
       VALUES ($1, $2)
       RETURNING id, curso_id, status, progresso, created_at`,
      [alunoId, cursoId]
    );

    res.status(201).json({ matricula: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao matricular:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.get('/aluno/matriculas', authMiddleware, async (req, res) => {
  try {
    const alunoId = req.alunoId;

    const resultado = await pool.query(
      `SELECT m.id, m.status, m.progresso, m.created_at as data_matricula,
              c.id as curso_id, c.nome, c.duracao, c.image
       FROM matriculas m
       JOIN cursos c ON m.curso_id = c.id
       WHERE m.aluno_id = $1
       ORDER BY m.created_at DESC`,
      [alunoId]
    );

    res.json({ matriculas: resultado.rows });
  } catch (error) {
    console.error('Erro ao buscar matrículas:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;
