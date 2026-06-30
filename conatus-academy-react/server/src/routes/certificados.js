const express = require('express');
const pool = require('../../db/connection');

const router = express.Router();

/**
 * Verificação PÚBLICA de autenticidade de certificado.
 * Não exige autenticação — qualquer pessoa (ex.: um empregador) pode conferir
 * um código impresso no certificado. Expõe apenas o mínimo necessário para
 * confirmar a autenticidade: nome do aluno, curso, carga horária e data.
 * NÃO retorna e-mail, CPF, id do aluno ou qualquer dado sensível.
 */
router.get('/validar/:codigo', async (req, res) => {
  try {
    const codigo = String(req.params.codigo || '').trim().toUpperCase();
    if (!codigo) {
      return res.status(400).json({ erro: 'Informe o código do certificado.' });
    }

    const resultado = await pool.query(
      `SELECT cert.codigo, cert.data_emissao, cert.nota_avaliacao,
              a.nome AS aluno_nome,
              c.nome AS curso_nome, c.duracao AS curso_duracao
         FROM certificados cert
         JOIN alunos a ON a.id = cert.aluno_id
         JOIN cursos c ON c.id = cert.curso_id
        WHERE cert.codigo = $1`,
      [codigo]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ valido: false, erro: 'Certificado não encontrado.' });
    }

    res.json({ valido: true, certificado: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao validar certificado:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;
