const express = require('express');
const pool = require('../../db/connection');
const { adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(adminMiddleware);

router.get('/dashboard', async (req, res) => {
  try {
    const [alunos, cursos, matriculas, certificados, publicados, rascunhos, emAndamento, aprovados] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM alunos WHERE role NOT IN ('admin', 'superadmin')"),
      pool.query('SELECT COUNT(*) as total FROM cursos'),
      pool.query("SELECT COUNT(*) as total FROM matriculas m JOIN alunos a ON a.id = m.aluno_id WHERE a.role NOT IN ('admin', 'superadmin')"),
      pool.query("SELECT COUNT(*) as total FROM certificados c JOIN alunos a ON a.id = c.aluno_id WHERE a.role NOT IN ('admin', 'superadmin')"),
      pool.query("SELECT COUNT(*) as total FROM cursos WHERE status = 'publicado'"),
      pool.query("SELECT COUNT(*) as total FROM cursos WHERE status = 'rascunho'"),
      pool.query("SELECT COUNT(*) as total FROM matriculas m JOIN alunos a ON a.id = m.aluno_id WHERE a.role NOT IN ('admin', 'superadmin') AND m.progresso < 100"),
      pool.query("SELECT COUNT(DISTINCT (t.aluno_id, t.curso_id)) as total FROM tentativas_avaliacao t JOIN alunos a ON a.id = t.aluno_id WHERE a.role NOT IN ('admin', 'superadmin') AND t.aprovado = true")
    ]);

    const ultimosAlunos = await pool.query(
      "SELECT id, nome, email, created_at FROM alunos WHERE role NOT IN ('admin', 'superadmin') ORDER BY created_at DESC LIMIT 5"
    );

    res.json({
      totalAlunos: parseInt(alunos.rows[0].total),
      totalCursos: parseInt(cursos.rows[0].total),
      totalMatriculas: parseInt(matriculas.rows[0].total),
      totalCertificados: parseInt(certificados.rows[0].total),
      cursosPublicados: parseInt(publicados.rows[0].total),
      cursosRascunho: parseInt(rascunhos.rows[0].total),
      alunosEmAndamento: parseInt(emAndamento.rows[0].total),
      alunosAprovados: parseInt(aprovados.rows[0].total),
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
    // Superadmin vê e gerencia os demais admins; admin comum vê apenas alunos e funcionários
    const filtroVisibilidade = req.userRole === 'superadmin'
      ? `a.role != 'superadmin'`
      : `a.role NOT IN ('admin', 'superadmin')`;
    let query = `
      SELECT a.id, a.nome, a.email, a.cpf, a.data_nascimento, a.telefone, a.cidade, a.estado, a.role, a.ativo, a.created_at,
        (SELECT COUNT(*) FROM matriculas m WHERE m.aluno_id = a.id) as total_matriculas,
        (SELECT COUNT(*) FROM certificados c WHERE c.aluno_id = a.id) as total_certificados
      FROM alunos a
      WHERE ${filtroVisibilidade}
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

    if (['admin', 'superadmin'].includes(aluno.rows[0].role) && req.userRole !== 'superadmin') {
      return res.status(403).json({ erro: 'Apenas o Super Administrador pode acessar perfis de administradores.' });
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

    const alvo = await pool.query('SELECT role FROM alunos WHERE id = $1', [id]);
    if (alvo.rows.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }
    const roleAlvo = alvo.rows[0].role;

    if (roleAlvo === 'superadmin') {
      return res.status(403).json({ erro: 'O perfil do Super Administrador não pode ser alterado por esta rota.' });
    }

    if (roleAlvo === 'admin' && req.userRole !== 'superadmin') {
      return res.status(403).json({ erro: 'Apenas o Super Administrador pode editar perfis de administradores.' });
    }

    // Apenas o superadmin pode alterar o cargo de outros usuários
    if (role !== undefined && role !== roleAlvo && req.userRole !== 'superadmin') {
      return res.status(403).json({ erro: 'Apenas o Super Administrador pode alterar o cargo de usuários.' });
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

    const alvo = await client.query('SELECT role FROM alunos WHERE id = $1', [id]);
    if (alvo.rows.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }
    if (alvo.rows[0].role === 'superadmin') {
      return res.status(403).json({ erro: 'O Super Administrador não pode ser excluído.' });
    }
    if (alvo.rows[0].role === 'admin' && req.userRole !== 'superadmin') {
      return res.status(403).json({ erro: 'Apenas o Super Administrador pode excluir administradores.' });
    }

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
        (SELECT COUNT(*) FROM matriculas m JOIN alunos a ON a.id = m.aluno_id WHERE m.curso_id = c.id AND a.role NOT IN ('admin', 'superadmin')) as total_matriculas,
        (SELECT COUNT(*) FROM modulos mo WHERE mo.curso_id = c.id) as total_modulos,
        (SELECT COUNT(*) FROM aulas au JOIN modulos mo ON mo.id = au.modulo_id WHERE mo.curso_id = c.id) as total_aulas,
        (SELECT COUNT(*) FROM questoes q WHERE q.curso_id = c.id) as total_questoes
       FROM cursos c
       ORDER BY c.id`
    );
    res.json({ cursos: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Campos editáveis do curso (formulário completo do construtor)
const CURSO_FIELDS = [
  'nome', 'duracao', 'image', 'descricao', 'descricao_curta', 'categoria',
  'nivel', 'tipo', 'status', 'visivel', 'publico_alvo', 'objetivo',
  'requisitos', 'requisitos_certificado', 'cert_responsavel', 'cert_texto',
  'oque_aprender', 'mercado_trabalho', 'areas_atuacao', 'diferenciais',
  'infraestrutura', 'coordenacao', 'informacoes_complementares', 'matriz_curricular',
];

const NIVEIS_VALIDOS  = ['basico', 'intermediario', 'avancado'];
const TIPOS_VALIDOS   = ['gratuito', 'interno', 'pago'];
const STATUS_VALIDOS  = ['rascunho', 'publicado', 'inativo'];

function validarCurso(body, { exigirObrigatorios = false } = {}) {
  if (exigirObrigatorios && (!body.nome || !body.duracao)) {
    return 'Campos obrigatórios: nome, duracao';
  }
  if (body.nivel != null && !NIVEIS_VALIDOS.includes(body.nivel)) {
    return `Nível inválido. Use: ${NIVEIS_VALIDOS.join(', ')}`;
  }
  if (body.tipo != null && !TIPOS_VALIDOS.includes(body.tipo)) {
    return `Tipo inválido. Use: ${TIPOS_VALIDOS.join(', ')}`;
  }
  if (body.status != null && !STATUS_VALIDOS.includes(body.status)) {
    return `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}`;
  }
  return null;
}

router.get('/cursos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const curso = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM matriculas m JOIN alunos a ON a.id = m.aluno_id WHERE m.curso_id = c.id AND a.role NOT IN ('admin', 'superadmin')) as total_matriculas
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
    const erro = validarCurso(req.body, { exigirObrigatorios: true });
    if (erro) return res.status(400).json({ erro });

    const cols = [];
    const values = [];
    for (const field of CURSO_FIELDS) {
      if (req.body[field] !== undefined) {
        cols.push(field);
        values.push(req.body[field] === '' ? null : req.body[field]);
      }
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const resultado = await pool.query(
      `INSERT INTO cursos (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
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
    const erro = validarCurso(req.body);
    if (erro) return res.status(400).json({ erro });
    if (req.body.nome === '' || req.body.duracao === '') {
      return res.status(400).json({ erro: 'Nome e duração não podem ficar vazios' });
    }

    const sets = [];
    const values = [];
    for (const field of CURSO_FIELDS) {
      if (req.body[field] !== undefined) {
        values.push(req.body[field] === '' ? null : req.body[field]);
        sets.push(`${field} = $${values.length}`);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
    }

    values.push(id);
    const resultado = await pool.query(
      `UPDATE cursos SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length}
       RETURNING *`,
      values
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

// Alterar apenas o status (publicar / despublicar / desativar)
router.put('/cursos/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
    }

    const resultado = await pool.query(
      `UPDATE cursos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }

    res.json({ curso: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao alterar status do curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Duplicar curso (com módulos, aulas, avaliação e questões) como rascunho
router.post('/cursos/:id/duplicar', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const orig = await client.query('SELECT * FROM cursos WHERE id = $1', [id]);
    if (orig.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }

    const c = orig.rows[0];
    const novo = await client.query(
      `INSERT INTO cursos (${CURSO_FIELDS.join(', ')})
       VALUES (${CURSO_FIELDS.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      CURSO_FIELDS.map(f => {
        if (f === 'nome')   return `${c.nome} (cópia)`;
        if (f === 'status') return 'rascunho';
        return c[f];
      })
    );
    const novoId = novo.rows[0].id;

    // módulos + aulas
    const modulos = await client.query('SELECT * FROM modulos WHERE curso_id = $1 ORDER BY ordem', [id]);
    for (const mod of modulos.rows) {
      const novoMod = await client.query(
        `INSERT INTO modulos (curso_id, titulo, descricao, ordem) VALUES ($1, $2, $3, $4) RETURNING id`,
        [novoId, mod.titulo, mod.descricao, mod.ordem]
      );
      const aulas = await client.query('SELECT * FROM aulas WHERE modulo_id = $1 ORDER BY ordem', [mod.id]);
      for (const aula of aulas.rows) {
        await client.query(
          `INSERT INTO aulas (modulo_id, titulo, conteudo, ordem, descricao, tipo_conteudo, video_url, material_url, duracao_minutos, obrigatoria)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [novoMod.rows[0].id, aula.titulo, aula.conteudo, aula.ordem, aula.descricao,
           aula.tipo_conteudo, aula.video_url, aula.material_url, aula.duracao_minutos, aula.obrigatoria]
        );
      }
    }

    // avaliação + questões
    const avaliacao = await client.query('SELECT * FROM avaliacoes WHERE curso_id = $1', [id]);
    if (avaliacao.rows.length > 0) {
      const av = avaliacao.rows[0];
      await client.query(
        `INSERT INTO avaliacoes (curso_id, num_questoes, nota_minima, max_tentativas, ativa)
         VALUES ($1, $2, $3, $4, $5)`,
        [novoId, av.num_questoes, av.nota_minima, av.max_tentativas, av.ativa]
      );
    }
    const questoes = await client.query('SELECT * FROM questoes WHERE curso_id = $1 ORDER BY id', [id]);
    for (const q of questoes.rows) {
      await client.query(
        `INSERT INTO questoes (curso_id, enunciado, alternativas, correta, explicacao)
         VALUES ($1, $2, $3, $4, $5)`,
        [novoId, q.enunciado, JSON.stringify(q.alternativas), q.correta, q.explicacao]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ curso: novo.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao duplicar curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// Alunos matriculados em um curso (com progresso e melhor nota)
router.get('/cursos/:id/matriculados', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      `SELECT a.id, a.nome, a.email, m.progresso, m.status, m.created_at as data_matricula,
        (SELECT MAX(t.nota) FROM tentativas_avaliacao t WHERE t.aluno_id = a.id AND t.curso_id = m.curso_id) as melhor_nota,
        (SELECT BOOL_OR(t.aprovado) FROM tentativas_avaliacao t WHERE t.aluno_id = a.id AND t.curso_id = m.curso_id) as aprovado,
        (SELECT COUNT(*) FROM tentativas_avaliacao t WHERE t.aluno_id = a.id AND t.curso_id = m.curso_id) as tentativas,
        (SELECT codigo FROM certificados cert WHERE cert.aluno_id = a.id AND cert.curso_id = m.curso_id) as certificado_codigo
       FROM matriculas m
       JOIN alunos a ON a.id = m.aluno_id
       WHERE m.curso_id = $1 AND a.role NOT IN ('admin', 'superadmin')
       ORDER BY a.nome`,
      [id]
    );
    res.json({ matriculados: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar matriculados:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Desmatricular aluno de um curso (remove matrícula, progresso e tentativas;
// certificados emitidos são preservados e gerenciados na página Certificados)
router.delete('/cursos/:id/matriculados/:alunoId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, alunoId } = req.params;

    await client.query('BEGIN');

    const matricula = await client.query(
      'DELETE FROM matriculas WHERE curso_id = $1 AND aluno_id = $2 RETURNING id',
      [id, alunoId]
    );

    if (matricula.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Matrícula não encontrada' });
    }

    await client.query(
      'DELETE FROM progresso_aulas WHERE curso_id = $1 AND aluno_id = $2',
      [id, alunoId]
    );
    await client.query(
      'DELETE FROM tentativas_avaliacao WHERE curso_id = $1 AND aluno_id = $2',
      [id, alunoId]
    );

    await client.query('COMMIT');
    res.json({ mensagem: 'Aluno desmatriculado com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao desmatricular aluno:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// ── Avaliação (config) ───────────────────────────────────────────────────────

router.get('/cursos/:id/avaliacao', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query('SELECT * FROM avaliacoes WHERE curso_id = $1', [id]);
    res.json({ avaliacao: resultado.rows[0] || null });
  } catch (error) {
    console.error('Erro ao buscar avaliação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.put('/cursos/:id/avaliacao', async (req, res) => {
  try {
    const { id } = req.params;
    const { num_questoes, nota_minima, max_tentativas, ativa } = req.body;

    const nq = parseInt(num_questoes, 10);
    const nm = parseInt(nota_minima, 10);
    const mt = parseInt(max_tentativas, 10);
    if (!nq || nq < 1)               return res.status(400).json({ erro: 'Número de questões deve ser pelo menos 1' });
    if (isNaN(nm) || nm < 1 || nm > 100) return res.status(400).json({ erro: 'Nota mínima deve estar entre 1 e 100' });
    if (!mt || mt < 1)               return res.status(400).json({ erro: 'Máximo de tentativas deve ser pelo menos 1' });

    const resultado = await pool.query(
      `INSERT INTO avaliacoes (curso_id, num_questoes, nota_minima, max_tentativas, ativa)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (curso_id)
       DO UPDATE SET num_questoes = $2, nota_minima = $3, max_tentativas = $4, ativa = $5, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, nq, nm, mt, ativa !== false]
    );

    res.json({ avaliacao: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Questões ─────────────────────────────────────────────────────────────────

function validarQuestao(body) {
  const { enunciado, alternativas, correta } = body;
  if (!enunciado || !enunciado.trim()) return 'Enunciado é obrigatório';
  if (!Array.isArray(alternativas) || alternativas.length < 2) return 'Informe pelo menos 2 alternativas';
  if (alternativas.some(a => !a || !String(a).trim())) return 'Nenhuma alternativa pode ficar vazia';
  const c = parseInt(correta, 10);
  if (isNaN(c) || c < 0 || c >= alternativas.length) return 'Selecione a alternativa correta';
  return null;
}

router.get('/cursos/:id/questoes', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      'SELECT * FROM questoes WHERE curso_id = $1 ORDER BY id',
      [id]
    );
    res.json({ questoes: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar questões:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/cursos/:id/questoes', async (req, res) => {
  try {
    const { id } = req.params;
    const erro = validarQuestao(req.body);
    if (erro) return res.status(400).json({ erro });

    const { enunciado, alternativas, correta, explicacao } = req.body;
    const resultado = await pool.query(
      `INSERT INTO questoes (curso_id, enunciado, alternativas, correta, explicacao)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, enunciado.trim(), JSON.stringify(alternativas), parseInt(correta, 10), explicacao || null]
    );

    res.status(201).json({ questao: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao criar questão:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.put('/questoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const erro = validarQuestao(req.body);
    if (erro) return res.status(400).json({ erro });

    const { enunciado, alternativas, correta, explicacao } = req.body;
    const resultado = await pool.query(
      `UPDATE questoes
       SET enunciado = $1, alternativas = $2, correta = $3, explicacao = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [enunciado.trim(), JSON.stringify(alternativas), parseInt(correta, 10), explicacao || null, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Questão não encontrada' });
    }

    res.json({ questao: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar questão:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.delete('/questoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query('DELETE FROM questoes WHERE id = $1 RETURNING id', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Questão não encontrada' });
    }

    res.json({ mensagem: 'Questão excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir questão:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Autorizações de acesso (cursos internos) ─────────────────────────────────

router.get('/cursos/:id/autorizacoes', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      `SELECT a.id, a.nome, a.email, a.role, ca.created_at as autorizado_em
       FROM curso_autorizacoes ca
       JOIN alunos a ON a.id = ca.aluno_id
       WHERE ca.curso_id = $1
       ORDER BY a.nome`,
      [id]
    );
    res.json({ autorizados: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar autorizações:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/cursos/:id/autorizacoes', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ erro: 'Informe o e-mail do usuário' });
    }

    const aluno = await pool.query('SELECT id, nome, email FROM alunos WHERE email = $1', [email.trim().toLowerCase()]);
    if (aluno.rows.length === 0) {
      return res.status(404).json({ erro: 'Nenhum usuário cadastrado com este e-mail' });
    }

    await pool.query(
      `INSERT INTO curso_autorizacoes (curso_id, aluno_id) VALUES ($1, $2)
       ON CONFLICT (curso_id, aluno_id) DO NOTHING`,
      [id, aluno.rows[0].id]
    );

    res.status(201).json({ autorizado: aluno.rows[0] });
  } catch (error) {
    console.error('Erro ao autorizar usuário:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.delete('/cursos/:id/autorizacoes/:alunoId', async (req, res) => {
  try {
    const { id, alunoId } = req.params;
    const resultado = await pool.query(
      'DELETE FROM curso_autorizacoes WHERE curso_id = $1 AND aluno_id = $2 RETURNING aluno_id',
      [id, alunoId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Autorização não encontrada' });
    }

    res.json({ mensagem: 'Autorização removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover autorização:', error);
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

const TIPOS_CONTEUDO = ['texto', 'video', 'pdf', 'link', 'material'];

router.post('/aulas', async (req, res) => {
  try {
    const {
      moduloId, titulo, conteudo, ordem, descricao,
      tipo_conteudo, video_url, material_url, duracao_minutos, obrigatoria,
    } = req.body;

    if (!moduloId || !titulo) {
      return res.status(400).json({ erro: 'Campos obrigatórios: moduloId, titulo' });
    }
    if (tipo_conteudo && !TIPOS_CONTEUDO.includes(tipo_conteudo)) {
      return res.status(400).json({ erro: `Tipo de conteúdo inválido. Use: ${TIPOS_CONTEUDO.join(', ')}` });
    }

    const resultado = await pool.query(
      `INSERT INTO aulas (modulo_id, titulo, conteudo, ordem, descricao, tipo_conteudo, video_url, material_url, duracao_minutos, obrigatoria)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [moduloId, titulo, conteudo || null, ordem || 1, descricao || null,
       tipo_conteudo || 'texto', video_url || null, material_url || null,
       duracao_minutos || null, obrigatoria !== false]
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
    const {
      titulo, conteudo, ordem, descricao,
      tipo_conteudo, video_url, material_url, duracao_minutos, obrigatoria,
    } = req.body;

    if (tipo_conteudo && !TIPOS_CONTEUDO.includes(tipo_conteudo)) {
      return res.status(400).json({ erro: `Tipo de conteúdo inválido. Use: ${TIPOS_CONTEUDO.join(', ')}` });
    }

    const resultado = await pool.query(
      `UPDATE aulas
       SET titulo = COALESCE($1, titulo),
           conteudo = COALESCE($2, conteudo),
           ordem = COALESCE($3, ordem),
           descricao = COALESCE($4, descricao),
           tipo_conteudo = COALESCE($5, tipo_conteudo),
           video_url = COALESCE($6, video_url),
           material_url = COALESCE($7, material_url),
           duracao_minutos = COALESCE($8, duracao_minutos),
           obrigatoria = COALESCE($9, obrigatoria),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [titulo, conteudo, ordem, descricao, tipo_conteudo,
       video_url, material_url, duracao_minutos, obrigatoria, id]
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
