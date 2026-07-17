const express = require('express');
const path = require('path');
const multer = require('multer');
const pool = require('../../db/connection');
const { contentMiddleware } = require('../middlewares/auth');
const { ADMIN_ROLES, canManage, canView, hiddenFrom, rank } = require('../utils/roles');
const { indexAulaById } = require('../services/ragIndex');
const { sincronizarNarracoes } = require('../services/narracao');
const { validarVenda, vendaDoCurso, VENDA_FIELDS } = require('../services/payments/compras');
const { listarInteressados } = require('../services/interesse');

const router = express.Router();

// Reprocessa a aula em segundo plano, sem fazer o admin esperar: o índice do RAG
// (embeddings) e os roteiros de narração dos blocos com 📢 dependem de chamadas
// a LLM, que levam segundos. Falhas são logadas e não derrubam o salvamento —
// o conteúdo da aula já está gravado; reindexar/renarrar é derivado dele.
function reprocessarAula(aulaId) {
  indexAulaById(aulaId).catch((e) => {
    console.error(`[RAG] Falha ao reindexar aula ${aulaId}:`, e.message);
  });
  sincronizarNarracoes(aulaId).catch((e) => {
    console.error(`[Narração] Falha ao gerar roteiro da aula ${aulaId}:`, e.message);
  });
}

router.use(contentMiddleware);

// ── Upload de imagens (capa de curso, imagens de aula) ─────────────────────────
// Os arquivos são gravados na tabela arquivos_upload (bytea) e servidos pelo
// server.js em /api/uploads/courses/:nome. NÃO usar o disco: o filesystem do
// Replit é efêmero e não é compartilhado com o ambiente local — uploads em
// disco somem no redeploy e quebram no outro ambiente. O caminho salvo no
// banco fica "api/uploads/courses/<arquivo>" (sem barra inicial, como /public).

// SVG é deliberadamente omitido: pode conter <script> e abrir XSS armazenado.
// A extensão gravada é derivada do mimetype verificado, nunca do nome original.
const TIPOS_IMAGEM = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/gif':  '.gif',
};

const uploadImagem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB — GIFs animados são pesados
  fileFilter: (req, file, cb) => {
    if (TIPOS_IMAGEM[file.mimetype]) return cb(null, true);
    cb(new Error('Formato inválido. Envie uma imagem JPG, PNG, WEBP ou GIF.'));
  },
});

router.post('/upload/imagem', (req, res) => {
  uploadImagem.single('imagem')(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Imagem muito grande. O tamanho máximo é 15 MB.'
        : err.message || 'Erro ao enviar a imagem.';
      return res.status(400).json({ erro: msg });
    }
    if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
    const ext = TIPOS_IMAGEM[req.file.mimetype] || '.png';
    const base = path.basename(req.file.originalname, path.extname(req.file.originalname))
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')   // remove acentos
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'capa';
    const nome = `${base}-${Date.now()}${ext}`;
    try {
      await pool.query(
        'INSERT INTO arquivos_upload (nome, mime, dados, tamanho) VALUES ($1, $2, $3, $4)',
        [nome, req.file.mimetype, req.file.buffer, req.file.size]
      );
    } catch (e) {
      console.error('Erro ao gravar upload no banco:', e);
      return res.status(500).json({ erro: 'Erro ao salvar a imagem.' });
    }
    const caminho = `api/uploads/courses/${nome}`;
    res.status(201).json({ path: caminho, url: `/${caminho}` });
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function onlyAdmin(req, res, next) {
  if (!ADMIN_ROLES.includes(req.userRole)) {
    return res.status(403).json({ erro: 'Apenas administradores podem realizar esta ação.' });
  }
  next();
}

async function checkCourseAccess(req, cursoId) {
  if (ADMIN_ROLES.includes(req.userRole)) return true;
  const r = await pool.query('SELECT instrutor_id FROM cursos WHERE id = $1', [cursoId]);
  if (!r.rows.length) return false;
  return String(r.rows[0].instrutor_id) === String(req.alunoId);
}

async function getCursoIdFromModulo(moduloId) {
  const r = await pool.query('SELECT curso_id FROM modulos WHERE id = $1', [moduloId]);
  return r.rows[0]?.curso_id ?? null;
}

async function getCursoIdFromAula(aulaId) {
  const r = await pool.query(
    'SELECT m.curso_id FROM aulas a JOIN modulos m ON m.id = a.modulo_id WHERE a.id = $1',
    [aulaId]
  );
  return r.rows[0]?.curso_id ?? null;
}

async function getCursoIdFromQuestao(questaoId) {
  const r = await pool.query('SELECT curso_id FROM questoes WHERE id = $1', [questaoId]);
  return r.rows[0]?.curso_id ?? null;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

router.get('/dashboard', onlyAdmin, async (req, res) => {
  try {
    const [alunos, cursos, matriculas, certificados, publicados, rascunhos, emAndamento, aprovados] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM alunos WHERE role NOT IN ('admin', 'superadmin', 'diretor')"),
      pool.query('SELECT COUNT(*) as total FROM cursos'),
      pool.query("SELECT COUNT(*) as total FROM matriculas m JOIN alunos a ON a.id = m.aluno_id WHERE a.role NOT IN ('admin', 'superadmin', 'diretor')"),
      pool.query("SELECT COUNT(*) as total FROM certificados c JOIN alunos a ON a.id = c.aluno_id WHERE a.role NOT IN ('admin', 'superadmin', 'diretor')"),
      pool.query("SELECT COUNT(*) as total FROM cursos WHERE status = 'publicado'"),
      pool.query("SELECT COUNT(*) as total FROM cursos WHERE status = 'rascunho'"),
      pool.query("SELECT COUNT(*) as total FROM matriculas m JOIN alunos a ON a.id = m.aluno_id WHERE a.role NOT IN ('admin', 'superadmin', 'diretor') AND m.progresso < 100"),
      pool.query("SELECT COUNT(DISTINCT (t.aluno_id, t.curso_id)) as total FROM tentativas_avaliacao t JOIN alunos a ON a.id = t.aluno_id WHERE a.role NOT IN ('admin', 'superadmin', 'diretor') AND t.aprovado = true")
    ]);

    const ultimosAlunos = await pool.query(
      "SELECT id, nome, email, created_at FROM alunos WHERE role NOT IN ('admin', 'superadmin', 'diretor') ORDER BY created_at DESC LIMIT 5"
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

// ── Alunos ────────────────────────────────────────────────────────────────────

router.get('/alunos', onlyAdmin, async (req, res) => {
  try {
    const { busca } = req.query;
    // O painel lista todos os usuários; só o superadmin é sigiloso e some para
    // quem está abaixo dele (um admin vê os outros admins e o diretor, mas não
    // o superadmin). Gerenciar continua restrito a quem está estritamente
    // abaixo na hierarquia (canManage).
    const ocultos = hiddenFrom(req.userRole);
    const filtroVisibilidade = ocultos.length
      ? `a.role NOT IN (${ocultos.map(r => `'${r}'`).join(', ')})`
      : 'TRUE';
    let query = `
      SELECT a.id, a.nome, a.email, a.cpf, a.data_nascimento, a.telefone, a.cidade, a.estado, a.empresa, a.cargo, a.role, a.ativo, a.created_at,
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

router.get('/alunos/:id', onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const aluno = await pool.query(
      `SELECT a.id, a.nome, a.email, a.cpf, a.data_nascimento, a.telefone, a.endereco, a.cidade, a.estado,
              a.empresa, a.cargo, a.empresa_id, e.nome AS empresa_parceira_nome, a.role, a.ativo, a.created_at
       FROM alunos a
       LEFT JOIN empresas e ON e.id = a.empresa_id
       WHERE a.id = $1`,
      [id]
    );

    if (aluno.rows.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }

    // O perfil do superadmin é o único que não abre para quem está abaixo dele.
    // Os demais são consultáveis em somente leitura — editar e excluir
    // continuam exigindo canManage.
    if (!canView(req.userRole, aluno.rows[0].role)) {
      return res.status(403).json({ erro: 'Você não tem permissão para acessar o perfil deste usuário.' });
    }

    // Sinaliza ao front se o solicitante pode editar/excluir este perfil.
    const podeGerenciar = canManage(req.userRole, aluno.rows[0].role);

    const matriculas = await pool.query(
      `SELECT m.*, c.nome as curso_nome, c.duracao
       FROM matriculas m
       JOIN cursos c ON c.id = m.curso_id
       WHERE m.aluno_id = $1
       ORDER BY m.created_at DESC`,
      [id]
    );

    const certificados = await pool.query(
      `SELECT cert.*, cert.created_at as data_emissao, c.nome as curso_nome
       FROM certificados cert
       JOIN cursos c ON c.id = cert.curso_id
       WHERE cert.aluno_id = $1
       ORDER BY cert.created_at DESC`,
      [id]
    );

    res.json({
      aluno: aluno.rows[0],
      pode_gerenciar: podeGerenciar,
      matriculas: matriculas.rows,
      certificados: certificados.rows
    });
  } catch (error) {
    console.error('Erro ao buscar aluno:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.put('/alunos/:id', onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, endereco, cidade, estado, empresa, cargo, empresa_id, ativo, role } = req.body;

    // Empresa/cargo: string vazia limpa (null); undefined preserva o valor atual.
    const empresaParam = empresa === undefined
      ? null
      : (typeof empresa === 'string' && empresa.trim() ? empresa.trim() : '');
    const cargoParam = cargo === undefined
      ? null
      : (typeof cargo === 'string' && cargo.trim() ? cargo.trim() : '');

    // Vínculo com empresa PARCEIRA (empresa_id) — controla o acesso a cursos
    // restritos. Só o admin (onlyAdmin) chega aqui. undefined preserva o valor
    // atual; null/'' remove o vínculo; número define (validado no catálogo).
    let empresaIdParam;
    if (empresa_id === undefined) {
      empresaIdParam = null;
    } else if (empresa_id === null || empresa_id === '') {
      empresaIdParam = '';
    } else {
      const n = Number.parseInt(empresa_id, 10);
      if (!Number.isInteger(n)) {
        return res.status(400).json({ erro: 'Empresa parceira inválida.' });
      }
      const emp = await pool.query('SELECT id FROM empresas WHERE id = $1 AND ativo = true', [n]);
      if (emp.rows.length === 0) {
        return res.status(400).json({ erro: 'Empresa parceira inválida ou inativa.' });
      }
      empresaIdParam = String(n);
    }

    // Papéis atribuíveis pelo painel. 'superadmin' e 'diretor' NÃO são
    // atribuíveis aqui: o superadmin é fixado por e-mail e o diretor é
    // exclusivo do Giovanni (também fixado por e-mail no boot).
    const validRoles = ['aluno', 'conatus_employee', 'admin', 'instrutor'];
    if (role !== undefined && !validRoles.includes(role)) {
      return res.status(400).json({ erro: 'Perfil inválido. Use: aluno, conatus_employee, instrutor ou admin.' });
    }

    const alvo = await pool.query('SELECT role FROM alunos WHERE id = $1', [id]);
    if (alvo.rows.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }
    const roleAlvo = alvo.rows[0].role;

    // Só é possível editar quem está ESTRITAMENTE abaixo na hierarquia.
    // (diretor edita todos; ninguém edita o diretor; superadmin não edita superadmin.)
    if (!canManage(req.userRole, roleAlvo)) {
      return res.status(403).json({ erro: 'Você não pode editar um usuário de nível igual ou superior ao seu.' });
    }

    // Não é possível conceder um papel de nível igual ou superior ao seu.
    // (admin não cria admin; superadmin pode conceder admin, mas não superadmin.)
    if (role !== undefined && rank(role) >= rank(req.userRole)) {
      return res.status(403).json({ erro: 'Você não pode conceder um papel de nível igual ou superior ao seu.' });
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
           empresa   = CASE WHEN $7::text IS NULL THEN empresa
                            WHEN $7 = '' THEN NULL
                            ELSE $7 END,
           ativo     = COALESCE($8, ativo),
           role      = CASE WHEN $9::text IS NOT NULL THEN $9::varchar ELSE role END,
           empresa_id = CASE WHEN $10::text IS NULL THEN empresa_id
                             WHEN $10 = '' THEN NULL
                             ELSE $10::integer END,
           cargo     = CASE WHEN $12::text IS NULL THEN cargo
                            WHEN $12 = '' THEN NULL
                            ELSE $12 END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING id, nome, email, cpf, data_nascimento, telefone, endereco, cidade, estado, empresa, cargo, empresa_id, role, ativo, created_at, updated_at`,
      [nome, email, telefone, endereco, cidade, estado, empresaParam, ativo, newRole, empresaIdParam, id, cargoParam]
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

router.delete('/alunos/:id', onlyAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const alvo = await client.query('SELECT role FROM alunos WHERE id = $1', [id]);
    if (alvo.rows.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }
    // Só é possível excluir quem está ESTRITAMENTE abaixo na hierarquia.
    // (o diretor nunca pode ser excluído; superadmin só por um diretor.)
    if (!canManage(req.userRole, alvo.rows[0].role)) {
      return res.status(403).json({ erro: 'Você não pode excluir um usuário de nível igual ou superior ao seu.' });
    }

    await client.query('BEGIN');

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

// ── Cursos ────────────────────────────────────────────────────────────────────

router.get('/cursos', async (req, res) => {
  try {
    const params = [];
    let whereClause = '';

    if (req.userRole === 'instrutor') {
      whereClause = 'WHERE c.instrutor_id = $1';
      params.push(req.alunoId);
    }

    const resultado = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM matriculas m JOIN alunos a ON a.id = m.aluno_id WHERE m.curso_id = c.id AND a.role NOT IN ('admin', 'superadmin', 'diretor')) as total_matriculas,
        (SELECT COUNT(*) FROM modulos mo WHERE mo.curso_id = c.id) as total_modulos,
        (SELECT COUNT(*) FROM aulas au JOIN modulos mo ON mo.id = au.modulo_id WHERE mo.curso_id = c.id) as total_aulas,
        (SELECT COUNT(*) FROM questoes q WHERE q.curso_id = c.id) as total_questoes,
        (SELECT COUNT(*) FROM curso_interesses ci WHERE ci.curso_id = c.id) as total_interesse
       FROM cursos c
       ${whereClause}
       ORDER BY c.id`,
      params
    );
    res.json({ cursos: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

const CURSO_FIELDS = [
  'nome', 'duracao', 'image', 'descricao', 'descricao_curta', 'categoria',
  'nivel', 'status', 'visivel', 'publico_alvo', 'objetivo',
  'requisitos', 'requisitos_certificado', 'cert_responsavel', 'cert_texto', 'cert_assinatura',
  'oque_aprender', 'mercado_trabalho', 'areas_atuacao', 'diferenciais',
  'infraestrutura', 'coordenacao', 'informacoes_complementares', 'matriz_curricular',
];

const NIVEIS_VALIDOS  = ['basico', 'intermediario', 'avancado'];
const STATUS_VALIDOS  = ['rascunho', 'em_breve', 'publicado', 'inativo'];

function validarCurso(body, { exigirObrigatorios = false } = {}) {
  if (exigirObrigatorios && (!body.nome || !body.duracao)) {
    return 'Campos obrigatórios: nome, duracao';
  }
  if (body.nivel != null && !NIVEIS_VALIDOS.includes(body.nivel)) {
    return `Nível inválido. Use: ${NIVEIS_VALIDOS.join(', ')}`;
  }
  if (body.status != null && !STATUS_VALIDOS.includes(body.status)) {
    return `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}`;
  }
  return null;
}

router.get('/cursos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

    const curso = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM matriculas m JOIN alunos a ON a.id = m.aluno_id WHERE m.curso_id = c.id AND a.role NOT IN ('admin', 'superadmin', 'diretor')) as total_matriculas,
        (SELECT COUNT(*) FROM curso_interesses ci WHERE ci.curso_id = c.id) as total_interesse
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

    // Instrutor é automaticamente vinculado ao curso que cria
    if (req.userRole === 'instrutor') {
      cols.push('instrutor_id');
      values.push(req.alunoId);
    } else if (req.body.instrutor_id) {
      // Admin pode definir o instrutor ao criar o curso
      cols.push('instrutor_id');
      values.push(req.body.instrutor_id);
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

    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

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

    // Apenas admins podem mudar o instrutor vinculado
    if (ADMIN_ROLES.includes(req.userRole) && req.body.instrutor_id !== undefined) {
      values.push(req.body.instrutor_id || null);
      sets.push(`instrutor_id = $${values.length}`);
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

router.put('/cursos/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

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

// Lista as pessoas que manifestaram "Tenho interesse" (cursos 'em_breve').
router.get('/cursos/:id/interessados', async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }
    const interessados = await listarInteressados(id);
    res.json({ interessados });
  } catch (error) {
    console.error('Erro ao listar interessados:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/cursos/:id/duplicar', onlyAdmin, async (req, res) => {
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

router.get('/cursos/:id/matriculados', async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

    const resultado = await pool.query(
      `SELECT a.id, a.nome, a.email, m.progresso, m.status, m.created_at as data_matricula,
        (SELECT MAX(t.nota) FROM tentativas_avaliacao t WHERE t.aluno_id = a.id AND t.curso_id = m.curso_id) as melhor_nota,
        (SELECT BOOL_OR(t.aprovado) FROM tentativas_avaliacao t WHERE t.aluno_id = a.id AND t.curso_id = m.curso_id) as aprovado,
        (SELECT COUNT(*) FROM tentativas_avaliacao t WHERE t.aluno_id = a.id AND t.curso_id = m.curso_id) as tentativas,
        (SELECT codigo FROM certificados cert WHERE cert.aluno_id = a.id AND cert.curso_id = m.curso_id) as certificado_codigo
       FROM matriculas m
       JOIN alunos a ON a.id = m.aluno_id
       WHERE m.curso_id = $1 AND a.role NOT IN ('admin', 'superadmin', 'diretor')
       ORDER BY a.nome`,
      [id]
    );
    res.json({ matriculados: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar matriculados:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.delete('/cursos/:id/matriculados/:alunoId', onlyAdmin, async (req, res) => {
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

// ── Avaliação (config) ────────────────────────────────────────────────────────

router.get('/cursos/:id/avaliacao', async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

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

    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

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

// ── Questões ──────────────────────────────────────────────────────────────────

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

    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

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

    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

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

    if (req.userRole === 'instrutor') {
      const cursoId = await getCursoIdFromQuestao(id);
      if (!cursoId || !(await checkCourseAccess(req, cursoId))) {
        return res.status(403).json({ erro: 'Acesso negado a esta questão.' });
      }
    }

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

    if (req.userRole === 'instrutor') {
      const cursoId = await getCursoIdFromQuestao(id);
      if (!cursoId || !(await checkCourseAccess(req, cursoId))) {
        return res.status(403).json({ erro: 'Acesso negado a esta questão.' });
      }
    }

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

// ── Empresas parceiras (fabricantes) ──────────────────────────────────────────

// Modo de acesso do curso (fonte única — o antigo campo 'tipo' foi aposentado).
const ACESSO_VALIDOS = ['publico', 'restrito', 'pago'];

router.get('/empresas', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, nome, slug, ativo FROM empresas ORDER BY nome');
    res.json({ empresas: r.rows });
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/empresas', onlyAdmin, async (req, res) => {
  try {
    const nome = (req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'Informe o nome da empresa' });
    const slug = (req.body.slug || nome).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    if (!slug) return res.status(400).json({ erro: 'Nome inválido' });

    const r = await pool.query(
      `INSERT INTO empresas (nome, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id, nome, slug, ativo`,
      [nome, slug]
    );
    if (r.rows.length === 0) {
      return res.status(409).json({ erro: 'Já existe uma empresa com este identificador' });
    }
    res.status(201).json({ empresa: r.rows[0] });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Remove um fabricante do catálogo. Via ON DELETE CASCADE, também apaga as
// regras 'empresa' que o referenciam em qualquer curso.
router.delete('/empresas/:id', onlyAdmin, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM empresas WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ erro: 'Empresa não encontrada' });
    res.json({ mensagem: 'Empresa removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover empresa:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Controle de acesso do curso (modo + regras cumulativas) ───────────────────

router.get('/cursos/:id/acesso', async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

    const curso = await pool.query(
      `SELECT acesso, ${VENDA_FIELDS.join(', ')} FROM cursos WHERE id = $1`,
      [id]
    );
    if (curso.rows.length === 0) return res.status(404).json({ erro: 'Curso não encontrado' });

    const regras = await pool.query(
      'SELECT tipo, empresa_id, aluno_id FROM curso_acesso_regras WHERE curso_id = $1',
      [id]
    );
    const usuarios = await pool.query(
      `SELECT a.id, a.nome, a.email, r.created_at AS autorizado_em
       FROM curso_acesso_regras r
       JOIN alunos a ON a.id = r.aluno_id
       WHERE r.curso_id = $1 AND r.tipo = 'usuario'
       ORDER BY a.nome`,
      [id]
    );

    res.json({
      acesso: curso.rows[0].acesso || 'publico',
      funcionarios: regras.rows.some(r => r.tipo === 'funcionarios'),
      empresas: regras.rows.filter(r => r.tipo === 'empresa').map(r => r.empresa_id),
      usuarios: usuarios.rows,
      venda: vendaDoCurso(curso.rows[0]),
    });
  } catch (error) {
    console.error('Erro ao carregar acesso do curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Salva o modo e as regras de funcionários/empresas de uma vez (transacional).
// As regras de usuários específicos são gerenciadas em /acesso/usuarios.
router.put('/cursos/:id/acesso', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!(await checkCourseAccess(req, id))) {
      client.release();
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

    const acesso = req.body.acesso;
    if (!ACESSO_VALIDOS.includes(acesso)) {
      client.release();
      return res.status(400).json({ erro: 'Modo de acesso inválido' });
    }
    const funcionarios = Boolean(req.body.funcionarios);
    const empresas = Array.isArray(req.body.empresas)
      ? [...new Set(req.body.empresas.map(Number).filter(Number.isInteger))]
      : [];

    // Configuração de venda — obrigatória (e validada) apenas no modo 'pago'.
    // Nos demais modos os campos ficam intactos: voltar de 'pago' para
    // 'restrito' e depois para 'pago' não perde a precificação.
    let venda = null;
    if (acesso === 'pago') {
      const v = validarVenda(req.body.venda || {});
      if (v.erro) {
        client.release();
        return res.status(400).json({ erro: v.erro });
      }
      venda = v.venda;
    }

    await client.query('BEGIN');

    await client.query(
      'UPDATE cursos SET acesso = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [acesso, id]
    );

    if (venda) {
      const sets = VENDA_FIELDS.map((f, i) => `${f} = $${i + 1}`).join(', ');
      await client.query(
        `UPDATE cursos SET ${sets} WHERE id = $${VENDA_FIELDS.length + 1}`,
        [...VENDA_FIELDS.map(f => venda[f]), id]
      );
    }

    // regra 'funcionarios'
    await client.query(
      `DELETE FROM curso_acesso_regras WHERE curso_id = $1 AND tipo = 'funcionarios'`,
      [id]
    );
    if (funcionarios) {
      await client.query(
        `INSERT INTO curso_acesso_regras (curso_id, tipo) VALUES ($1, 'funcionarios')`,
        [id]
      );
    }

    // regras 'empresa' — substitui o conjunto inteiro
    await client.query(
      `DELETE FROM curso_acesso_regras WHERE curso_id = $1 AND tipo = 'empresa'`,
      [id]
    );
    for (const empresaId of empresas) {
      await client.query(
        `INSERT INTO curso_acesso_regras (curso_id, tipo, empresa_id) VALUES ($1, 'empresa', $2)`,
        [id, empresaId]
      );
    }

    await client.query('COMMIT');
    res.json({ acesso, funcionarios, empresas, ...(venda ? { venda } : {}) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao salvar acesso do curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

router.post('/cursos/:id/acesso/usuarios', async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ erro: 'Informe o e-mail do usuário' });

    const aluno = await pool.query('SELECT id, nome, email FROM alunos WHERE email = $1', [email]);
    if (aluno.rows.length === 0) {
      return res.status(404).json({ erro: 'Nenhum usuário cadastrado com este e-mail' });
    }

    await pool.query(
      `INSERT INTO curso_acesso_regras (curso_id, tipo, aluno_id) VALUES ($1, 'usuario', $2)
       ON CONFLICT (curso_id, aluno_id) WHERE tipo = 'usuario' DO NOTHING`,
      [id, aluno.rows[0].id]
    );

    res.status(201).json({ autorizado: aluno.rows[0] });
  } catch (error) {
    console.error('Erro ao autorizar usuário:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.delete('/cursos/:id/acesso/usuarios/:alunoId', async (req, res) => {
  try {
    const { id, alunoId } = req.params;
    if (!(await checkCourseAccess(req, id))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
    }

    const r = await pool.query(
      `DELETE FROM curso_acesso_regras
       WHERE curso_id = $1 AND aluno_id = $2 AND tipo = 'usuario' RETURNING aluno_id`,
      [id, alunoId]
    );
    if (r.rows.length === 0) return res.status(404).json({ erro: 'Autorização não encontrada' });

    res.json({ mensagem: 'Autorização removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover autorização:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.delete('/cursos/:id', onlyAdmin, async (req, res) => {
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

// ── Certificados ──────────────────────────────────────────────────────────────

router.get('/certificados', onlyAdmin, async (req, res) => {
  try {
    const { aluno_id, curso_id, data_inicio, data_fim } = req.query;
    let query = `
      SELECT cert.*, cert.created_at as data_emissao,
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
      query += ` AND cert.created_at >= $${paramIndex}`;
      params.push(data_inicio);
      paramIndex++;
    }

    if (data_fim) {
      query += ` AND cert.created_at <= $${paramIndex}`;
      params.push(data_fim);
      paramIndex++;
    }

    query += ' ORDER BY cert.created_at DESC';

    const resultado = await pool.query(query, params);
    res.json({ certificados: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar certificados:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.get('/certificados/validar/:codigo', onlyAdmin, async (req, res) => {
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

router.delete('/certificados/:id', onlyAdmin, async (req, res) => {
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

// ── Módulos ───────────────────────────────────────────────────────────────────

router.get('/modulos', async (req, res) => {
  try {
    const { cursoId } = req.query;
    if (!cursoId) {
      return res.status(400).json({ erro: 'cursoId é obrigatório' });
    }

    if (!(await checkCourseAccess(req, cursoId))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
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

    if (req.userRole === 'instrutor') {
      const cursoId = await getCursoIdFromModulo(id);
      if (!cursoId || !(await checkCourseAccess(req, cursoId))) {
        return res.status(403).json({ erro: 'Acesso negado a este módulo.' });
      }
    }

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

    if (!(await checkCourseAccess(req, cursoId))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
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

    if (req.userRole === 'instrutor') {
      const cursoId = await getCursoIdFromModulo(id);
      if (!cursoId || !(await checkCourseAccess(req, cursoId))) {
        return res.status(403).json({ erro: 'Acesso negado a este módulo.' });
      }
    }

    const resultado = await pool.query(
      `UPDATE modulos
       SET titulo = COALESCE($1, titulo),
           descricao = COALESCE($2, descricao),
           ordem = COALESCE($3, ordem)
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

    if (req.userRole === 'instrutor') {
      const cursoId = await getCursoIdFromModulo(id);
      if (!cursoId || !(await checkCourseAccess(req, cursoId))) {
        return res.status(403).json({ erro: 'Acesso negado a este módulo.' });
      }
    }

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

    if (!(await checkCourseAccess(req, cursoId))) {
      return res.status(403).json({ erro: 'Acesso negado a este curso.' });
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

// ── Aulas ─────────────────────────────────────────────────────────────────────

router.get('/aulas', async (req, res) => {
  try {
    const { moduloId } = req.query;
    if (!moduloId) {
      return res.status(400).json({ erro: 'moduloId é obrigatório' });
    }

    if (req.userRole === 'instrutor') {
      const cursoId = await getCursoIdFromModulo(moduloId);
      if (!cursoId || !(await checkCourseAccess(req, cursoId))) {
        return res.status(403).json({ erro: 'Acesso negado a este módulo.' });
      }
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

    if (req.userRole === 'instrutor') {
      const cursoId = await getCursoIdFromAula(id);
      if (!cursoId || !(await checkCourseAccess(req, cursoId))) {
        return res.status(403).json({ erro: 'Acesso negado a esta aula.' });
      }
    }

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

    if (req.userRole === 'instrutor') {
      const cursoId = await getCursoIdFromModulo(moduloId);
      if (!cursoId || !(await checkCourseAccess(req, cursoId))) {
        return res.status(403).json({ erro: 'Acesso negado a este módulo.' });
      }
    }

    const resultado = await pool.query(
      `INSERT INTO aulas (modulo_id, titulo, conteudo, ordem, descricao, tipo_conteudo, video_url, material_url, duracao_minutos, obrigatoria)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [moduloId, titulo, conteudo || null, ordem || 1, descricao || null,
       tipo_conteudo || 'texto', video_url || null, material_url || null,
       duracao_minutos || null, obrigatoria !== false]
    );

    reprocessarAula(resultado.rows[0].id);
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

    if (req.userRole === 'instrutor') {
      const cursoId = await getCursoIdFromAula(id);
      if (!cursoId || !(await checkCourseAccess(req, cursoId))) {
        return res.status(403).json({ erro: 'Acesso negado a esta aula.' });
      }
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

    reprocessarAula(id);
    res.json({ aula: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar aula:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.delete('/aulas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (req.userRole === 'instrutor') {
      const cursoId = await getCursoIdFromAula(id);
      if (!cursoId || !(await checkCourseAccess(req, cursoId))) {
        return res.status(403).json({ erro: 'Acesso negado a esta aula.' });
      }
    }

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

    if (req.userRole === 'instrutor') {
      const cursoId = await getCursoIdFromModulo(moduloId);
      if (!cursoId || !(await checkCourseAccess(req, cursoId))) {
        return res.status(403).json({ erro: 'Acesso negado a este módulo.' });
      }
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

// ── Instrutores (lista para atribuição em cursos) ─────────────────────────────

router.get('/instrutores', onlyAdmin, async (req, res) => {
  try {
    // Instrutores e administradores podem ser responsáveis por um curso.
    // O superadmin é intencionalmente excluído (não atua como instrutor).
    const resultado = await pool.query(
      `SELECT id, nome, email, role FROM alunos
       WHERE role IN ('instrutor', 'admin') AND ativo = true
       ORDER BY role DESC, nome`
    );
    res.json({ instrutores: resultado.rows });
  } catch (error) {
    console.error('Erro ao listar instrutores:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;
