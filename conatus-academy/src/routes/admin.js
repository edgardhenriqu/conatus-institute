const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../../db/connection');
const { adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

// Todas as rotas admin requerem autenticação de admin
router.use(adminMiddleware);

// Dashboard - Estatísticas gerais
router.get('/dashboard', async (req, res) => {
  try {
    const [alunos, cursos, matriculas, certificados] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM alunos WHERE role != \'admin\''),
      pool.query('SELECT COUNT(*) as total FROM cursos'),
      pool.query('SELECT COUNT(*) as total FROM matriculas'),
      pool.query('SELECT COUNT(*) as total FROM certificados')
    ]);

    const ultimosAlunos = await pool.query(
      'SELECT id, nome, email, created_at FROM alunos WHERE role != \'admin\' ORDER BY created_at DESC LIMIT 5'
    );

    res.json({
      totalAlunos: parseInt(alunos.rows[0].total),
      totalCursos: parseInt(cursos.rows[0].total),
      totalMatriculas: parseInt(matriculas.rows[0].total),
      totalCertificados: parseInt(certificados.rows[0].total),
      ultimosAlunos: ultimosAlunos.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Listar todos os alunos
router.get('/alunos', async (req, res) => {
  try {
    const { busca } = req.query;
    let query = `
      SELECT a.id, a.nome, a.email, a.cpf, a.data_nascimento, a.telefone, a.cidade, a.estado, a.role, a.ativo, a.created_at,
        (SELECT COUNT(*) FROM matriculas m WHERE m.aluno_id = a.id) as total_matriculas,
        (SELECT COUNT(*) FROM certificados c WHERE c.aluno_id = a.id) as total_certificados
      FROM alunos a
      WHERE a.role != 'admin'
    `;
    const params = [];

    if (busca) {
      params.push(`%${busca}%`);
      query += ` AND (a.nome ILIKE $1 OR a.email ILIKE $1)`;
    }

    query += ' ORDER BY a.created_at DESC';

    const resultado = await pool.query(query, params);
    res.json({ alunos: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar alunos:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Buscar aluno por ID
router.get('/alunos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const aluno = await pool.query(
      `SELECT id, nome, email, cpf, data_nascimento, telefone, endereco, cidade, estado, role, ativo, created_at
       FROM alunos WHERE id = $1`,
      [id]
    );

    if (aluno.rows.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }

    const matriculas = await pool.query(
      `SELECT m.*, c.nome as curso_nome, c.duracao
       FROM matriculas m
       JOIN cursos c ON c.id = m.curso_id
       WHERE m.aluno_id = $1
       ORDER BY m.created_at DESC`,
      [id]
    );

    const certificados = await pool.query(
      `SELECT cert.*, c.nome as curso_nome
       FROM certificados cert
       JOIN cursos c ON c.id = cert.curso_id
       WHERE cert.aluno_id = $1
       ORDER BY cert.data_emissao DESC`,
      [id]
    );

    res.json({
      aluno: aluno.rows[0],
      matriculas: matriculas.rows,
      certificados: certificados.rows
    });
  } catch (error) {
    console.error('Erro ao buscar aluno:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Atualizar aluno
router.put('/alunos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, endereco, cidade, estado, ativo } = req.body;

    const resultado = await pool.query(
      `UPDATE alunos
       SET nome = COALESCE($1, nome),
           email = COALESCE($2, email),
           telefone = COALESCE($3, telefone),
           endereco = COALESCE($4, endereco),
           cidade = COALESCE($5, cidade),
           estado = COALESCE($6, estado),
           ativo = COALESCE($7, ativo),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, nome, email, cpf, data_nascimento, telefone, endereco, cidade, estado, role, ativo, created_at, updated_at`,
      [nome, email, telefone, endereco, cidade, estado, ativo, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }

    res.json({ aluno: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar aluno:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Excluir aluno
router.delete('/alunos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      'DELETE FROM alunos WHERE id = $1 RETURNING id',
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }

    res.json({ mensagem: 'Aluno excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir aluno:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Listar todos os cursos
router.get('/cursos', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM matriculas m WHERE m.curso_id = c.id) as total_matriculas
       FROM cursos c
       ORDER BY c.id`
    );
    res.json({ cursos: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Buscar curso por ID
router.get('/cursos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const curso = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM matriculas m WHERE m.curso_id = c.id) as total_matriculas
       FROM cursos c
       WHERE c.id = $1`,
      [id]
    );

    if (curso.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }

    res.json({ curso: curso.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Criar novo curso
router.post('/cursos', async (req, res) => {
  try {
    const {
      nome, duracao, image, descricao, oque_aprender,
      mercado_trabalho, areas_atuacao, diferenciais,
      infraestrutura, coordenacao, informacoes_complementares,
      matriz_curricular
    } = req.body;

    if (!nome || !duracao) {
      return res.status(400).json({ erro: 'Campos obrigatórios: nome, duracao' });
    }

    const resultado = await pool.query(
      `INSERT INTO cursos (nome, duracao, image, descricao, oque_aprender, mercado_trabalho, areas_atuacao, diferenciais, infraestrutura, coordenacao, informacoes_complementares, matriz_curricular)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [nome, duracao, image || null, descricao || null, oque_aprender || null,
       mercado_trabalho || null, areas_atuacao || null, diferenciais || null,
       infraestrutura || null, coordenacao || null, informacoes_complementares || null,
       matriz_curricular || null]
    );

    res.status(201).json({ curso: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao criar curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Atualizar curso
router.put('/cursos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome, duracao, image, descricao, oque_aprender,
      mercado_trabalho, areas_atuacao, diferenciais,
      infraestrutura, coordenacao, informacoes_complementares,
      matriz_curricular
    } = req.body;

    const resultado = await pool.query(
      `UPDATE cursos
       SET nome = COALESCE($1, nome),
           duracao = COALESCE($2, duracao),
           image = COALESCE($3, image),
           descricao = COALESCE($4, descricao),
           oque_aprender = COALESCE($5, oque_aprender),
           mercado_trabalho = COALESCE($6, mercado_trabalho),
           areas_atuacao = COALESCE($7, areas_atuacao),
           diferenciais = COALESCE($8, diferenciais),
           infraestrutura = COALESCE($9, infraestrutura),
           coordenacao = COALESCE($10, coordenacao),
           informacoes_complementares = COALESCE($11, informacoes_complementares),
           matriz_curricular = COALESCE($12, matriz_curricular)
       WHERE id = $13
       RETURNING *`,
      [nome, duracao, image, descricao, oque_aprender, mercado_trabalho,
       areas_atuacao, diferenciais, infraestrutura, coordenacao,
       informacoes_complementares, matriz_curricular, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }

    res.json({ curso: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Excluir curso
router.delete('/cursos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      'DELETE FROM cursos WHERE id = $1 RETURNING id',
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }

    res.json({ mensagem: 'Curso excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Listar todos os certificados
router.get('/certificados', async (req, res) => {
  try {
    const { aluno_id, curso_id, data_inicio, data_fim } = req.query;
    let query = `
      SELECT cert.*,
        a.nome as aluno_nome, a.email as aluno_email,
        c.nome as curso_nome, c.duracao as curso_duracao
      FROM certificados cert
      JOIN alunos a ON a.id = cert.aluno_id
      JOIN cursos c ON c.id = cert.curso_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (aluno_id) {
      query += ` AND cert.aluno_id = $${paramIndex}`;
      params.push(aluno_id);
      paramIndex++;
    }

    if (curso_id) {
      query += ` AND cert.curso_id = $${paramIndex}`;
      params.push(curso_id);
      paramIndex++;
    }

    if (data_inicio) {
      query += ` AND cert.data_emissao >= $${paramIndex}`;
      params.push(data_inicio);
      paramIndex++;
    }

    if (data_fim) {
      query += ` AND cert.data_emissao <= $${paramIndex}`;
      params.push(data_fim);
      paramIndex++;
    }

    query += ' ORDER BY cert.data_emissao DESC';

    const resultado = await pool.query(query, params);
    res.json({ certificados: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar certificados:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Buscar certificado por código
router.get('/certificados/validar/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    const resultado = await pool.query(
      `SELECT cert.*,
        a.nome as aluno_nome, a.email as aluno_email,
        c.nome as curso_nome, c.duracao as curso_duracao
       FROM certificados cert
       JOIN alunos a ON a.id = cert.aluno_id
       JOIN cursos c ON c.id = cert.curso_id
       WHERE cert.codigo = $1`,
      [codigo]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Certificado não encontrado' });
    }

    res.json({ certificado: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao validar certificado:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Excluir certificado
router.delete('/certificados/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      'DELETE FROM certificados WHERE id = $1 RETURNING id',
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Certificado não encontrado' });
    }

    res.json({ mensagem: 'Certificado excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir certificado:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;
