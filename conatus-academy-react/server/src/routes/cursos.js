const express = require('express');
const crypto = require('crypto');
const pool = require('../../db/connection');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

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
              c.id as curso_id, c.nome as nome_curso, c.duracao, c.image
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

router.get('/:cursoId/progresso', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;

    const resultado = await pool.query(
      `SELECT aula_titulo, concluida FROM progresso_aulas
       WHERE aluno_id = $1 AND curso_id = $2`,
      [alunoId, cursoId]
    );

    const aulas = resultado.rows.map(r => ({
      titulo: r.aula_titulo,
      concluida: r.concluida
    }));

    res.json({ aulas });
  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/:cursoId/progresso', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;
    const { aulas } = req.body;

    if (!aulas || !Array.isArray(aulas)) {
      return res.status(400).json({ erro: 'Formato inválido. Envie { aulas: [{ titulo, concluida }] }' });
    }

    for (const aula of aulas) {
      await pool.query(
        `INSERT INTO progresso_aulas (aluno_id, curso_id, aula_titulo, concluida, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (aluno_id, curso_id, aula_titulo)
         DO UPDATE SET concluida = $4, updated_at = CURRENT_TIMESTAMP`,
        [alunoId, cursoId, aula.titulo, aula.concluida]
      );
    }

    const totalAulas = await pool.query(
      `SELECT COUNT(*) as total FROM progresso_aulas
       WHERE aluno_id = $1 AND curso_id = $2`,
      [alunoId, cursoId]
    );

    const aulasConcluidas = await pool.query(
      `SELECT COUNT(*) as total FROM progresso_aulas
       WHERE aluno_id = $1 AND curso_id = $2 AND concluida = true`,
      [alunoId, cursoId]
    );

    const total = parseInt(totalAulas.rows[0].total);
    const concluidas = parseInt(aulasConcluidas.rows[0].total);
    const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    await pool.query(
      `UPDATE matriculas SET progresso = $1, updated_at = CURRENT_TIMESTAMP
       WHERE aluno_id = $2 AND curso_id = $3`,
      [progresso, alunoId, cursoId]
    );

    res.json({ progresso, concluidas, total });
  } catch (error) {
    console.error('Erro ao salvar progresso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

function gerarCodigoCertificado() {
  return 'CN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.get('/:cursoId/certificado', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;

    const certExiste = await pool.query(
      'SELECT * FROM certificados WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, cursoId]
    );

    if (certExiste.rows.length > 0) {
      return res.json({ emitido: true, certificado: certExiste.rows[0] });
    }

    res.json({ emitido: false });
  } catch (error) {
    console.error('Erro ao buscar certificado:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/:cursoId/certificado', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;
    const { nota } = req.body;

    if (!nota || nota < 70) {
      return res.status(400).json({ erro: 'Nota mínima de 70% necessária para emissão do certificado' });
    }

    const certExiste = await pool.query(
      'SELECT id FROM certificados WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, cursoId]
    );

    if (certExiste.rows.length > 0) {
      return res.status(409).json({ erro: 'Certificado já emitido para este curso' });
    }

    const matricula = await pool.query(
      'SELECT progresso FROM matriculas WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, cursoId]
    );

    if (matricula.rows.length === 0) {
      return res.status(404).json({ erro: 'Matrícula não encontrada' });
    }

    if (matricula.rows[0].progresso < 100) {
      return res.status(400).json({ erro: 'É necessário completar 100% do curso para emitir o certificado' });
    }

    const codigo = gerarCodigoCertificado();

    const resultado = await pool.query(
      `INSERT INTO certificados (aluno_id, curso_id, nota_avaliacao, codigo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [alunoId, cursoId, nota, codigo]
    );

    res.status(201).json({ certificado: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao gerar certificado:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;
