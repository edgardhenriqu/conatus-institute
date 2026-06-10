const express = require('express');
const pool = require('../../db/connection');
const { adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(adminMiddleware);

router.get('/dashboard', async (req, res) => {
  try {
    const [alunos, cursos, matriculas, certificados] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM alunos WHERE role != 'admin'"),
      pool.query('SELECT COUNT(*) as total FROM cursos'),
      pool.query("SELECT COUNT(*) as total FROM matriculas m JOIN alunos a ON a.id = m.aluno_id WHERE a.role != 'admin'"),
      pool.query("SELECT COUNT(*) as total FROM certificados c JOIN alunos a ON a.id = c.aluno_id WHERE a.role != 'admin'")
    ]);

    const ultimosAlunos = await pool.query(
      "SELECT id, nome, email, created_at FROM alunos WHERE role != 'admin' ORDER BY created_at DESC LIMIT 5"
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

router.put('/alunos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, endereco, cidade, estado, ativo, role } = req.body;

    const validRoles = ['aluno', 'conatus_employee', 'admin'];
    if (role !== undefined && !validRoles.includes(role)) {
      return res.status(400).json({ erro: 'Perfil inválido. Use: aluno, conatus_employee ou admin.' });
    }

    const newRole = validRoles.includes(role) ? role : null;

    const resultado = await pool.query(
      `UPDATE alunos
       SET nome      = COALESCE($1, nome),
           email     = COALESCE($2, email),
           telefone  = COALESCE($3, telefone),
           endereco  = COALESCE($4, endereco),
           cidade    = COALESCE($5, cidade),
           estado    = COALESCE($6, estado),
           ativo     = COALESCE($7, ativo),
           role      = CASE WHEN $8::text IS NOT NULL THEN $8::varchar ELSE role END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING id, nome, email, cpf, data_nascimento, telefone, endereco, cidade, estado, role, ativo, created_at, updated_at`,
      [nome, email, telefone, endereco, cidade, estado, ativo, newRole, id]
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

router.delete('/alunos/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Remove registros dependentes antes do aluno (garante funcionar sem CASCADE no banco legado)
    await client.query('DELETE FROM certificados WHERE aluno_id = $1', [id]);
    await client.query('DELETE FROM matriculas WHERE aluno_id = $1', [id]);
    await client.query('DELETE FROM progresso_aulas WHERE aluno_id = $1', [id]);

    const resultado = await client.query(
      'DELETE FROM alunos WHERE id = $1 RETURNING id',
      [id]
    );

    if (resultado.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }

    await client.query('COMMIT');
    res.json({ mensagem: 'Aluno excluído com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir aluno:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

router.get('/cursos', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM matriculas m JOIN alunos a ON a.id = m.aluno_id WHERE m.curso_id = c.id AND a.role != 'admin') as total_matriculas
       FROM cursos c
       ORDER BY c.id`
    );
    res.json({ cursos: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.get('/cursos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const curso = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM matriculas m JOIN alunos a ON a.id = m.aluno_id WHERE m.curso_id = c.id AND a.role != 'admin') as total_matriculas
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

// Rotas de Módulos
router.get('/modulos', async (req, res) => {
  try {
    const { cursoId } = req.query;
    if (!cursoId) {
      return res.status(400).json({ erro: 'cursoId é obrigatório' });
    }

    const resultado = await pool.query(
      'SELECT * FROM modulos WHERE curso_id = $1 ORDER BY ordem',
      [cursoId]
    );
    res.json({ modulos: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar módulos:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.get('/modulos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query('SELECT * FROM modulos WHERE id = $1', [id]);
    
    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Módulo não encontrado' });
    }
    
    res.json({ modulo: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar módulo:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/modulos', async (req, res) => {
  try {
    const { cursoId, titulo, descricao, ordem } = req.body;

    if (!cursoId || !titulo) {
      return res.status(400).json({ erro: 'Campos obrigatórios: cursoId, titulo' });
    }

    const resultado = await pool.query(
      `INSERT INTO modulos (curso_id, titulo, descricao, ordem)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [cursoId, titulo, descricao || null, ordem || 1]
    );

    res.status(201).json({ modulo: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao criar módulo:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.put('/modulos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, ordem } = req.body;

    const resultado = await pool.query(
      `UPDATE modulos
       SET titulo = COALESCE($1, titulo),
           descricao = COALESCE($2, descricao),
           ordem = COALESCE($3, ordem),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [titulo, descricao, ordem, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Módulo não encontrado' });
    }

    res.json({ modulo: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar módulo:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.delete('/modulos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query('DELETE FROM modulos WHERE id = $1 RETURNING id', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Módulo não encontrado' });
    }

    res.json({ mensagem: 'Módulo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir módulo:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/modulos/reorder', async (req, res) => {
  try {
    const { cursoId, ordem } = req.body;

    if (!cursoId || !ordem || !Array.isArray(ordem)) {
      return res.status(400).json({ erro: 'cursoId e ordem (array) são obrigatórios' });
    }

    for (let i = 0; i < ordem.length; i++) {
      await pool.query(
        'UPDATE modulos SET ordem = $1 WHERE id = $2 AND curso_id = $3',
        [i + 1, ordem[i], cursoId]
      );
    }

    res.json({ mensagem: 'Ordem atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao reordenar módulos:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Rotas de Aulas
router.get('/aulas', async (req, res) => {
  try {
    const { moduloId } = req.query;
    if (!moduloId) {
      return res.status(400).json({ erro: 'moduloId é obrigatório' });
    }

    const resultado = await pool.query(
      'SELECT * FROM aulas WHERE modulo_id = $1 ORDER BY ordem',
      [moduloId]
    );
    res.json({ aulas: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar aulas:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.get('/aulas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query('SELECT * FROM aulas WHERE id = $1', [id]);
    
    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Aula não encontrada' });
    }
    
    res.json({ aula: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar aula:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/aulas', async (req, res) => {
  try {
    const { moduloId, titulo, conteudo, ordem } = req.body;

    if (!moduloId || !titulo) {
      return res.status(400).json({ erro: 'Campos obrigatórios: moduloId, titulo' });
    }

    const resultado = await pool.query(
      `INSERT INTO aulas (modulo_id, titulo, conteudo, ordem)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [moduloId, titulo, conteudo || null, ordem || 1]
    );

    res.status(201).json({ aula: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao criar aula:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.put('/aulas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, conteudo, ordem } = req.body;

    const resultado = await pool.query(
      `UPDATE aulas
       SET titulo = COALESCE($1, titulo),
           conteudo = COALESCE($2, conteudo),
           ordem = COALESCE($3, ordem),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [titulo, conteudo, ordem, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Aula não encontrada' });
    }

    res.json({ aula: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar aula:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.delete('/aulas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query('DELETE FROM aulas WHERE id = $1 RETURNING id', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Aula não encontrada' });
    }

    res.json({ mensagem: 'Aula excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir aula:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/aulas/reorder', async (req, res) => {
  try {
    const { moduloId, ordem } = req.body;

    if (!moduloId || !ordem || !Array.isArray(ordem)) {
      return res.status(400).json({ erro: 'moduloId e ordem (array) são obrigatórios' });
    }

    for (let i = 0; i < ordem.length; i++) {
      await pool.query(
        'UPDATE aulas SET ordem = $1 WHERE id = $2 AND modulo_id = $3',
        [i + 1, ordem[i], moduloId]
      );
    }

    res.json({ mensagem: 'Ordem atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao reordenar aulas:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;
