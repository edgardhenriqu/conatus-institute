const express = require('express');
const pool = require('../../db/connection');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

// Eixos válidos das simulações. Manter em sincronia com o front
// (src/pages/Simulacoes.jsx e src/pages/admin/AdminSimulacoes.jsx).
const TEMAS_VALIDOS = ['falhas', 'operacoes', 'manutencoes'];

// ── Listagem (qualquer aluno logado) ──────────────────────────────────────────
// A página /simulacoes é exclusiva para usuários autenticados; por isso a rota
// exige token válido (authMiddleware), mas não um papel administrativo.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, tema, titulo, video_url, descricao, ordem
         FROM simulacoes
        ORDER BY tema, ordem, id`
    );
    res.json({ simulacoes: r.rows });
  } catch (error) {
    console.error('Erro ao listar simulações:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Cadastro (admin) ───────────────────────────────────────────────────────────
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const tema = (req.body.tema || '').trim();
    const titulo = (req.body.titulo || '').trim();
    const videoUrl = (req.body.video_url || '').trim();
    const descricao = (req.body.descricao || '').trim() || null;

    if (!TEMAS_VALIDOS.includes(tema)) {
      return res.status(400).json({ erro: 'Selecione um eixo válido para a simulação.' });
    }
    if (!titulo) return res.status(400).json({ erro: 'Informe o título do vídeo.' });
    if (!videoUrl) return res.status(400).json({ erro: 'Informe o link do vídeo.' });

    // ordem = próxima posição dentro do eixo (fim da lista)
    const ordemRes = await pool.query(
      'SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima FROM simulacoes WHERE tema = $1',
      [tema]
    );
    const ordem = ordemRes.rows[0].proxima;

    const r = await pool.query(
      `INSERT INTO simulacoes (tema, titulo, video_url, descricao, ordem)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tema, titulo, video_url, descricao, ordem`,
      [tema, titulo, videoUrl, descricao, ordem]
    );
    res.status(201).json({ simulacao: r.rows[0] });
  } catch (error) {
    console.error('Erro ao cadastrar simulação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Edição (admin) ─────────────────────────────────────────────────────────────
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const tema = (req.body.tema || '').trim();
    const titulo = (req.body.titulo || '').trim();
    const videoUrl = (req.body.video_url || '').trim();
    const descricao = (req.body.descricao || '').trim() || null;

    if (!TEMAS_VALIDOS.includes(tema)) {
      return res.status(400).json({ erro: 'Selecione um eixo válido para a simulação.' });
    }
    if (!titulo) return res.status(400).json({ erro: 'Informe o título do vídeo.' });
    if (!videoUrl) return res.status(400).json({ erro: 'Informe o link do vídeo.' });

    const r = await pool.query(
      `UPDATE simulacoes
          SET tema = $1, titulo = $2, video_url = $3, descricao = $4,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, tema, titulo, video_url, descricao, ordem`,
      [tema, titulo, videoUrl, descricao, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ erro: 'Vídeo não encontrado.' });
    res.json({ simulacao: r.rows[0] });
  } catch (error) {
    console.error('Erro ao editar simulação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Remoção (admin) ────────────────────────────────────────────────────────────
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM simulacoes WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ erro: 'Vídeo não encontrado.' });
    res.json({ mensagem: 'Vídeo removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover simulação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;
