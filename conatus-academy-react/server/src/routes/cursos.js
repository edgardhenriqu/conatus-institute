const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../../db/connection');
const { authMiddleware } = require('../middlewares/auth');
const { podeAcessarCurso, MSG_ACESSO_NEGADO, MSG_CURSO_PAGO } = require('../services/accessControl');
const { possuiCurso, vendaDoCurso } = require('../services/payments/compras');
const { getGateway, GatewayIndisponivelError } = require('../services/payments');
const { registrarInteresse, removerInteresse, infoInteresse, infoInteresseEmLote } = require('../services/interesse');
const { ADMIN_ROLES } = require('../utils/roles');
const { embedQuery, toVectorLiteral } = require('../services/ragGemini');
const { generate } = require('../services/ragChat');
const { MOP_NOME } = require('../../db/seedMopCourse');

const router = express.Router();

/** Auth opcional: identifica o usuário se houver token válido, sem bloquear. */
function optionalAuth(req, _res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.alunoId = decoded.id;
      req.userRole = decoded.role;
    } catch { /* token inválido — segue como anônimo */ }
  }
  next();
}

/** Curso visível/acessível para este usuário? Retorna { ok, status, erro }. */
async function checarAcessoCurso(curso, req) {
  const isAdmin = ADMIN_ROLES.includes(req.userRole);
  if (curso.status !== 'publicado' && !isAdmin) {
    return { ok: false, status: 404, erro: 'Curso não encontrado' };
  }
  const autorizado = await podeAcessarCurso(req.alunoId, curso);
  if (!autorizado) {
    if (curso.acesso === 'pago') {
      return { ok: false, status: 403, erro: MSG_CURSO_PAGO, pago: true };
    }
    return { ok: false, status: 403, erro: MSG_ACESSO_NEGADO };
  }
  return { ok: true };
}

/**
 * A contagem de interessados ("Tenho interesse") é métrica interna de demanda:
 * só admins a recebem. Para o aluno vai apenas `interesse_registrado` (o estado
 * do próprio botão). Filtrar AQUI, no servidor, é o que garante o sigilo —
 * esconder só no front deixaria o número exposto na resposta da API.
 */
function filtrarInfoInteresse(info, req) {
  if (ADMIN_ROLES.includes(req.userRole)) return info;
  const { total_interesse: _oculto, ...resto } = info;
  return resto;
}

// ── Catálogo ─────────────────────────────────────────────────────────────────

router.get('/', optionalAuth, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT * FROM cursos
        WHERE status IN ('publicado', 'em_breve') AND visivel = true
        ORDER BY id`
    );

    const cursos = [];
    for (const curso of resultado.rows) {
      // Cursos "em breve" são vitrines de captação de interesse: aparecem para
      // TODO MUNDO (o objetivo é medir demanda), sem liberar conteúdo.
      if (curso.status === 'em_breve') {
        curso.em_breve = true;
        cursos.push(curso);
        continue;
      }
      if (await podeAcessarCurso(req.alunoId, curso)) {
        // Em cursos pagos o front distingue "já possui" (Continuar) de
        // "pode comprar" (Comprar) — os demais modos não usam o flag.
        if (curso.acesso === 'pago') curso.possui_curso = true;
        cursos.push(curso);
      } else if (curso.acesso === 'pago' && curso.a_venda) {
        // Curso pago à venda aparece no catálogo como vitrine (preço + compra).
        curso.possui_curso = false;
        cursos.push(curso);
      }
    }

    // Contagem de interesse dos cursos "em breve" (uma consulta em lote).
    const emBreveIds = cursos.filter(c => c.em_breve).map(c => c.id);
    if (emBreveIds.length > 0) {
      const info = await infoInteresseEmLote(emBreveIds, req.alunoId);
      for (const c of cursos) {
        if (c.em_breve) Object.assign(c, filtrarInfoInteresse(info.get(c.id), req));
      }
    }

    // Anexa os fabricantes (empresas) de cada curso, para a seção "Fabricantes"
    if (cursos.length > 0) {
      const ids = cursos.map(c => c.id);
      const emp = await pool.query(
        `SELECT r.curso_id, e.id, e.nome, e.slug
           FROM curso_acesso_regras r
           JOIN empresas e ON e.id = r.empresa_id
          WHERE r.tipo = 'empresa' AND r.curso_id = ANY($1)`,
        [ids]
      );
      const porCurso = {};
      for (const row of emp.rows) {
        (porCurso[row.curso_id] ||= []).push({ id: row.id, nome: row.nome, slug: row.slug });
      }
      for (const c of cursos) c.empresas = porCurso[c.id] || [];
    }

    res.json(cursos);
  } catch (error) {
    console.error('Erro ao buscar cursos:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.get('/aluno/matriculas', authMiddleware, async (req, res) => {
  try {
    const alunoId = req.alunoId;

    const resultado = await pool.query(
      `SELECT m.id, m.status, m.progresso, m.created_at as data_matricula,
              c.id as curso_id, c.nome as nome_curso, c.duracao, c.image, c.nivel, c.acesso,
              c.descricao_curta, c.descricao
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

// Certificados de cursos do banco emitidos para o aluno logado.
router.get('/aluno/certificados', authMiddleware, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT cert.id, cert.codigo, cert.nota_avaliacao, cert.data_emissao,
              c.id AS curso_id, c.nome AS curso_nome, c.duracao AS curso_duracao
         FROM certificados cert
         JOIN cursos c ON c.id = cert.curso_id
        WHERE cert.aluno_id = $1
        ORDER BY cert.data_emissao DESC`,
      [req.alunoId]
    );
    res.json({ certificados: resultado.rows });
  } catch (error) {
    console.error('Erro ao buscar certificados do aluno:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }
    const resultado = await pool.query('SELECT * FROM cursos WHERE id = $1', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }

    const curso = resultado.rows[0];

    // Fabricantes vinculados (vitrine "Fabricantes" e logos no certificado).
    // Buscado uma vez e devolvido em todos os caminhos (inclusive "em breve").
    const empRes = await pool.query(
      `SELECT e.id, e.nome, e.slug
         FROM curso_acesso_regras r
         JOIN empresas e ON e.id = r.empresa_id
        WHERE r.tipo = 'empresa' AND r.curso_id = $1`,
      [id]
    );
    const empresas = empRes.rows;

    // Curso "em breve": a página é uma vitrine pública de captação de interesse
    // (contagem + botão "Tenho interesse"), sem acesso ao conteúdo. Basta estar
    // visível (ou ser admin) — não passa pelo controle de acesso normal.
    if (curso.status === 'em_breve') {
      const isAdmin = ADMIN_ROLES.includes(req.userRole);
      if (!curso.visivel && !isAdmin) {
        return res.status(404).json({ erro: 'Curso não encontrado' });
      }
      const contagem = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM modulos WHERE curso_id = $1) as total_modulos,
          (SELECT COUNT(*) FROM aulas a JOIN modulos m ON m.id = a.modulo_id WHERE m.curso_id = $1) as total_aulas`,
        [id]
      );
      const info = await infoInteresse(id, req.alunoId);
      return res.json({ ...curso, ...contagem.rows[0], em_breve: true, empresas, ...filtrarInfoInteresse(info, req) });
    }

    const acesso = await checarAcessoCurso(curso, req);
    if (!acesso.ok) {
      // Curso pago à venda: a página de detalhes é a vitrine (preço + botão
      // Comprar), então ela abre mesmo sem posse. Só o CONTEÚDO fica bloqueado
      // (rota /conteudo e matrícula continuam exigindo a compra).
      const vitrine = curso.acesso === 'pago' && curso.a_venda && curso.status === 'publicado';
      if (!vitrine) {
        return res.status(acesso.status).json({ erro: acesso.erro, restrito: acesso.status === 403, pago: Boolean(acesso.pago) });
      }
    }

    // total de módulos/aulas para a página de detalhes
    const contagem = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM modulos WHERE curso_id = $1) as total_modulos,
        (SELECT COUNT(*) FROM aulas a JOIN modulos m ON m.id = a.modulo_id WHERE m.curso_id = $1) as total_aulas`,
      [id]
    );

    const extra = curso.acesso === 'pago' ? { possui_curso: acesso.ok } : {};
    res.json({ ...curso, ...contagem.rows[0], ...extra, empresas });
  } catch (error) {
    console.error('Erro ao buscar curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Matrícula ────────────────────────────────────────────────────────────────

router.post('/:cursoId/matricular', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;

    const cursoRes = await pool.query('SELECT * FROM cursos WHERE id = $1', [cursoId]);
    if (cursoRes.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }

    const curso = cursoRes.rows[0];
    const acesso = await checarAcessoCurso(curso, req);
    if (!acesso.ok) {
      return res.status(acesso.status).json({ erro: acesso.erro, restrito: acesso.status === 403, pago: Boolean(acesso.pago) });
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

// ── Compra de curso pago ─────────────────────────────────────────────────────
// Ponto de entrada da comercialização. Toda a lógica de provedor fica atrás de
// getGateway() (services/payments): quando um gateway real for configurado,
// esta rota passa a devolver a URL de checkout sem nenhuma outra mudança.
router.post('/:cursoId/comprar', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;

    const cursoRes = await pool.query('SELECT * FROM cursos WHERE id = $1', [cursoId]);
    if (cursoRes.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }
    const curso = cursoRes.rows[0];

    if (curso.acesso !== 'pago' || curso.status !== 'publicado') {
      return res.status(400).json({ erro: 'Este curso não está disponível para compra.' });
    }
    if (!curso.a_venda) {
      return res.status(400).json({ erro: 'As vendas deste curso não estão abertas no momento.' });
    }
    if (await possuiCurso(req.alunoId, curso.id)) {
      return res.status(409).json({ erro: 'Você já possui este curso.' });
    }

    const venda = vendaDoCurso(curso);
    const parcelas = Math.min(Math.max(1, Number(req.body?.parcelas) || 1), venda.max_parcelas);
    const cupom = venda.permite_cupom ? String(req.body?.cupom || '').trim().slice(0, 60) || null : null;

    const checkout = await getGateway().criarCheckout({
      curso, aluno: { id: req.alunoId }, parcelas, cupom,
    });
    res.json({ checkout });
  } catch (error) {
    if (error instanceof GatewayIndisponivelError) {
      return res.status(501).json({ erro: error.message });
    }
    console.error('Erro ao iniciar compra do curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── "Tenho interesse" (cursos em breve) ──────────────────────────────────────
// Registra/remove a manifestação de interesse do aluno logado num curso ainda
// não lançado. Deduplicado por (curso, aluno): a contagem mede pessoas.
router.post('/:cursoId/interesse', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const curso = await pool.query('SELECT id, status, visivel FROM cursos WHERE id = $1', [cursoId]);
    if (curso.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }
    if (curso.rows[0].status !== 'em_breve' || !curso.rows[0].visivel) {
      return res.status(400).json({ erro: 'Este curso não está aberto para manifestação de interesse.' });
    }
    await registrarInteresse(req.alunoId, cursoId);
    res.status(201).json(filtrarInfoInteresse(await infoInteresse(cursoId, req.alunoId), req));
  } catch (error) {
    console.error('Erro ao registrar interesse:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.delete('/:cursoId/interesse', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    await removerInteresse(req.alunoId, cursoId);
    res.json(filtrarInfoInteresse(await infoInteresse(cursoId, req.alunoId), req));
  } catch (error) {
    console.error('Erro ao remover interesse:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Conteúdo do curso (player do aluno) ──────────────────────────────────────

router.get('/:cursoId/conteudo', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;

    const cursoRes = await pool.query('SELECT * FROM cursos WHERE id = $1', [cursoId]);
    if (cursoRes.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }

    const curso = cursoRes.rows[0];
    const acesso = await checarAcessoCurso(curso, req);
    if (!acesso.ok) {
      return res.status(acesso.status).json({ erro: acesso.erro, restrito: acesso.status === 403, pago: Boolean(acesso.pago) });
    }

    const modulos = await pool.query(
      'SELECT id, titulo, descricao, ordem FROM modulos WHERE curso_id = $1 ORDER BY ordem, id',
      [cursoId]
    );

    const aulas = await pool.query(
      `SELECT a.id, a.modulo_id, a.titulo, a.descricao, a.conteudo, a.ordem,
              a.tipo_conteudo, a.video_url, a.material_url, a.duracao_minutos, a.obrigatoria
       FROM aulas a
       JOIN modulos m ON m.id = a.modulo_id
       WHERE m.curso_id = $1
       ORDER BY a.ordem, a.id`,
      [cursoId]
    );

    const progresso = await pool.query(
      `SELECT aula_titulo, concluida FROM progresso_aulas
       WHERE aluno_id = $1 AND curso_id = $2 AND concluida = true`,
      [alunoId, cursoId]
    );

    const concluidasSet = new Set(progresso.rows.map(r => r.aula_titulo));

    // Roteiros de narração dos blocos marcados com 📢 (services/narracao.js).
    // Vêm junto com o conteúdo, e não numa rota à parte, porque o player precisa
    // deles no mesmo instante em que monta a aula — é texto, cabe no payload.
    //
    // O ÁUDIO (ElevenLabs) não vem aqui: são centenas de KB por trecho, e o aluno
    // pode nem clicar no megafone. Mandamos só `temAudio`, e o player busca cada
    // faixa na rota abaixo. Sem áudio, ele fala o roteiro com a voz do navegador.
    const narracoes = await pool.query(
      `SELECT n.aula_id, n.ordem, n.roteiro, n.img_src, (n.audio IS NOT NULL) AS tem_audio
         FROM aula_narracoes n
         JOIN aulas a   ON a.id = n.aula_id
         JOIN modulos m ON m.id = a.modulo_id
        WHERE m.curso_id = $1
        ORDER BY n.aula_id, n.ordem`,
      [cursoId]
    );

    const narracoesPorAula = new Map();
    for (const n of narracoes.rows) {
      if (!narracoesPorAula.has(n.aula_id)) narracoesPorAula.set(n.aula_id, []);
      narracoesPorAula.get(n.aula_id).push({
        ordem: n.ordem, roteiro: n.roteiro, imgSrc: n.img_src, temAudio: n.tem_audio,
      });
    }

    const modulosComAulas = modulos.rows.map(m => ({
      ...m,
      aulas: aulas.rows
        .filter(a => a.modulo_id === m.id)
        .map(a => ({
          ...a,
          concluida: concluidasSet.has(`aula-${a.id}`),
          narracoes: narracoesPorAula.get(a.id) || [],
        })),
    }));

    res.json({
      curso: {
        id: curso.id, nome: curso.nome, duracao: curso.duracao,
        nivel: curso.nivel, acesso: curso.acesso, requisitos_certificado: curso.requisitos_certificado,
      },
      modulos: modulosComAulas,
    });
  } catch (error) {
    console.error('Erro ao buscar conteúdo do curso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Faixa de áudio de um trecho narrado (voz sintetizada e gravada ao salvar a
// aula — ver services/tts/). Uma rota por trecho, e não o áudio embutido no
// /conteudo, porque são centenas de KB cada.
//
// Passa pelo authMiddleware e pela MESMA checagem de acesso do conteúdo: a faixa
// é o conteúdo da aula falado, e não pode ser um atalho para ouvir um curso
// restrito sem matrícula. Por isso ela também não é servida como arquivo estático
// — o player busca com o token (ver src/hooks/narracao/motorAudio.js).
router.get('/:cursoId/aulas/:aulaId/narracao/:ordem/audio', authMiddleware, async (req, res) => {
  try {
    const { cursoId, aulaId, ordem } = req.params;

    const cursoRes = await pool.query('SELECT * FROM cursos WHERE id = $1', [cursoId]);
    if (cursoRes.rows.length === 0) return res.status(404).json({ erro: 'Curso não encontrado' });

    const acesso = await checarAcessoCurso(cursoRes.rows[0], req);
    if (!acesso.ok) {
      return res.status(acesso.status).json({ erro: acesso.erro, restrito: acesso.status === 403, pago: Boolean(acesso.pago) });
    }

    // O JOIN com módulos amarra a aula ao curso: sem ele, um aluno com acesso a um
    // curso qualquer ouviria as aulas de todos os outros trocando o aulaId.
    const meta = await pool.query(
      `SELECT n.audio_mime, n.origem_hash, n.audio_voz, octet_length(n.audio) AS bytes
         FROM aula_narracoes n
         JOIN aulas a   ON a.id = n.aula_id
         JOIN modulos m ON m.id = a.modulo_id
        WHERE m.curso_id = $1 AND n.aula_id = $2 AND n.ordem = $3 AND n.audio IS NOT NULL`,
      [cursoId, aulaId, ordem]
    );
    if (meta.rows.length === 0) return res.status(404).json({ erro: 'Áudio não encontrado' });

    const { audio_mime: mime, origem_hash: hash, audio_voz: voz, bytes } = meta.rows[0];

    // A faixa só muda quando o instrutor reescreve o bloco ou o admin troca a voz
    // — as duas coisas que compõem a ETag. Enquanto não mudarem, o navegador
    // revalida com um 304 e não baixa o áudio de novo.
    const etag = `"${crypto.createHash('md5').update(`${hash}:${voz}:${bytes}`).digest('hex')}"`;
    res.set({ ETag: etag, 'Cache-Control': 'private, max-age=3600', 'Content-Type': mime || 'audio/mpeg' });
    if (req.headers['if-none-match'] === etag) return res.status(304).end();

    const { rows } = await pool.query(
      'SELECT audio FROM aula_narracoes WHERE aula_id = $1 AND ordem = $2', [aulaId, ordem]);

    res.send(rows[0].audio);
  } catch (error) {
    console.error('Erro ao servir áudio da narração:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Assistente RAG (tutor de dúvidas do curso) ───────────────────────────────

const ASSISTENTE_SYSTEM = `Você é o tutor virtual da Conatus Academy, ajudando alunos com dúvidas sobre o conteúdo do curso.
Regras:
- Responda SOMENTE com base no MATERIAL fornecido. Não use conhecimento externo.
- Se a resposta não estiver no material, diga que não encontrou isso no conteúdo do curso e sugira procurar o instrutor. Nunca invente.
- Responda em português do Brasil, de forma clara e didática.
- Cada trecho começa com "Aula: <título>". Ao usar um trecho, cite de qual aula veio.
- Seja conciso e foque na dúvida do aluno.`;

// Resolve o curso pelo id numérico (cursos DB) ou pelo slug 'mop-interno'
// (viewer estático do MOP, semeado no banco sob MOP_NOME). Outros valores → null.
async function carregarCursoAssistente(cursoId) {
  if (/^\d+$/.test(cursoId)) {
    const r = await pool.query('SELECT * FROM cursos WHERE id = $1', [cursoId]);
    return r.rows[0] || null;
  }
  if (cursoId === 'mop-interno') {
    const r = await pool.query(
      'SELECT * FROM cursos WHERE nome = $1 ORDER BY id LIMIT 1', [MOP_NOME]);
    return r.rows[0] || null;
  }
  return null;
}

router.post('/:cursoId/assistente', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const pergunta = (req.body?.pergunta || '').toString().trim();

    if (!pergunta) return res.status(400).json({ erro: 'Envie { pergunta }.' });
    if (pergunta.length > 1000) {
      return res.status(400).json({ erro: 'Pergunta muito longa (máx. 1000 caracteres).' });
    }

    const curso = await carregarCursoAssistente(cursoId);
    if (!curso) return res.status(404).json({ erro: 'Curso não encontrado' });

    // Mesmo controle de acesso do player: aluno só pergunta sobre curso liberado.
    const acesso = await checarAcessoCurso(curso, req);
    if (!acesso.ok) {
      return res.status(acesso.status).json({ erro: acesso.erro, restrito: acesso.status === 403, pago: Boolean(acesso.pago) });
    }

    // Busca semântica escopada ao curso (top-K trechos mais próximos da pergunta).
    // Usa o id numérico resolvido (curso.id), não o slug da URL.
    const qvec = await embedQuery(pergunta);
    const trechos = await pool.query(
      `SELECT texto, aula_id FROM aula_chunks
        WHERE curso_id = $2
        ORDER BY embedding <=> $1::vector
        LIMIT 6`,
      [toVectorLiteral(qvec), curso.id]
    );

    if (trechos.rows.length === 0) {
      return res.json({
        resposta: 'Ainda não há conteúdo indexado para este curso, então não consigo responder com base no material. Procure o instrutor.',
        fontes: [],
      });
    }

    const material = trechos.rows
      .map((r, i) => `[Trecho ${i + 1}]\n${r.texto}`)
      .join('\n\n---\n\n');
    const prompt = `MATERIAL DO CURSO:\n\n${material}\n\n---\n\nPERGUNTA DO ALUNO:\n${pergunta}`;

    const resposta = await generate({ system: ASSISTENTE_SYSTEM, prompt });

    // Aulas consultadas, para exibir como "fontes" ao aluno.
    const aulaIds = [...new Set(trechos.rows.map(r => r.aula_id))];
    const fontes = await pool.query(
      'SELECT id, titulo FROM aulas WHERE id = ANY($1::int[]) ORDER BY id',
      [aulaIds]
    );

    res.json({ resposta, fontes: fontes.rows });
  } catch (error) {
    console.error('Erro no assistente RAG:', error);
    res.status(500).json({ erro: 'Não foi possível responder agora. Tente novamente.' });
  }
});

// ── Progresso ────────────────────────────────────────────────────────────────

/** Recalcula o progresso da matrícula com base nas aulas obrigatórias. */
async function recalcularProgresso(alunoId, cursoId) {
  const totais = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM aulas a JOIN modulos m ON m.id = a.modulo_id
        WHERE m.curso_id = $2 AND a.obrigatoria = true) as total,
      (SELECT COUNT(*) FROM progresso_aulas p
        JOIN aulas a ON ('aula-' || a.id) = p.aula_titulo
        JOIN modulos m ON m.id = a.modulo_id
        WHERE p.aluno_id = $1 AND p.curso_id = $2 AND p.concluida = true
          AND m.curso_id = $2 AND a.obrigatoria = true) as concluidas`,
    [alunoId, cursoId]
  );

  const total = parseInt(totais.rows[0].total);
  const concluidas = parseInt(totais.rows[0].concluidas);
  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  await pool.query(
    `UPDATE matriculas SET progresso = $1, status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE aluno_id = $3 AND curso_id = $4`,
    [progresso, progresso === 100 ? 'concluido' : 'ativa', alunoId, cursoId]
  );

  return { progresso, concluidas, total };
}

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

    // Sem esta guarda, qualquer aluno logado poderia gravar progresso em cursos
    // nos quais não está matriculado (ou que nem pode acessar, como um curso pago
    // que não comprou). O curso precisa existir, o aluno precisa ter acesso e
    // estar matriculado — o progresso pertence a uma matrícula.
    const cursoRes = await pool.query('SELECT * FROM cursos WHERE id = $1', [cursoId]);
    if (cursoRes.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }
    const acesso = await checarAcessoCurso(cursoRes.rows[0], req);
    if (!acesso.ok) {
      return res.status(acesso.status).json({ erro: acesso.erro, restrito: acesso.status === 403, pago: Boolean(acesso.pago) });
    }
    const matricula = await pool.query(
      'SELECT id FROM matriculas WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, cursoId]
    );
    if (matricula.rows.length === 0) {
      return res.status(403).json({ erro: 'Você não está matriculado neste curso.' });
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

    const stats = await recalcularProgresso(alunoId, cursoId);
    res.json(stats);
  } catch (error) {
    console.error('Erro ao salvar progresso:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Avaliação final (aluno) ──────────────────────────────────────────────────

/** Resumo das tentativas do aluno em um curso. */
async function statusTentativas(alunoId, cursoId) {
  const r = await pool.query(
    `SELECT COUNT(*) as tentativas, COALESCE(MAX(nota), 0) as melhor, BOOL_OR(aprovado) as aprovado
     FROM tentativas_avaliacao WHERE aluno_id = $1 AND curso_id = $2`,
    [alunoId, cursoId]
  );
  return {
    tentativas: parseInt(r.rows[0].tentativas),
    melhor: parseInt(r.rows[0].melhor),
    aprovado: r.rows[0].aprovado === true,
  };
}

router.get('/:cursoId/avaliacao', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;

    const avaliacaoRes = await pool.query('SELECT * FROM avaliacoes WHERE curso_id = $1 AND ativa = true', [cursoId]);
    if (avaliacaoRes.rows.length === 0) {
      return res.json({ existe: false });
    }
    const config = avaliacaoRes.rows[0];

    const questoesCount = await pool.query('SELECT COUNT(*) as total FROM questoes WHERE curso_id = $1', [cursoId]);
    const totalQuestoes = parseInt(questoesCount.rows[0].total);

    const matricula = await pool.query(
      'SELECT progresso FROM matriculas WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, cursoId]
    );
    const progresso = matricula.rows[0]?.progresso ?? 0;

    const status = await statusTentativas(alunoId, cursoId);

    res.json({
      existe: totalQuestoes > 0,
      num_questoes: Math.min(config.num_questoes, totalQuestoes),
      nota_minima: config.nota_minima,
      max_tentativas: config.max_tentativas,
      total_questoes_banco: totalQuestoes,
      progresso,
      ...status,
      restantes: Math.max(0, config.max_tentativas - status.tentativas),
    });
  } catch (error) {
    console.error('Erro ao buscar avaliação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/:cursoId/avaliacao/iniciar', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;

    const avaliacaoRes = await pool.query('SELECT * FROM avaliacoes WHERE curso_id = $1 AND ativa = true', [cursoId]);
    if (avaliacaoRes.rows.length === 0) {
      return res.status(404).json({ erro: 'Este curso não possui avaliação final' });
    }
    const config = avaliacaoRes.rows[0];

    const matricula = await pool.query(
      'SELECT progresso FROM matriculas WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, cursoId]
    );
    if (matricula.rows.length === 0) {
      return res.status(403).json({ erro: 'Você não está matriculado neste curso' });
    }
    // A avaliação NÃO exige mais 100% das aulas para ser feita: o aluno pode usar
    // as tentativas que tiver antes de concluir tudo. O gate de 100% permanece só
    // na EMISSÃO do certificado (POST /:cursoId/certificado).

    const status = await statusTentativas(alunoId, cursoId);
    // Aprovado NÃO trava mais a prova: o aluno pode refazer para buscar nota maior,
    // enquanto não tiver 100% e ainda tiver tentativas. Só a nota máxima encerra.
    if (status.melhor >= 100) {
      return res.status(400).json({ erro: 'Você já atingiu a nota máxima (100%) na avaliação' });
    }
    if (status.tentativas >= config.max_tentativas) {
      return res.status(400).json({ erro: `Limite de ${config.max_tentativas} tentativas atingido` });
    }

    // Sorteia N questões sem expor a resposta correta
    const questoes = await pool.query(
      `SELECT id, enunciado, alternativas FROM questoes
       WHERE curso_id = $1 ORDER BY RANDOM() LIMIT $2`,
      [cursoId, config.num_questoes]
    );

    if (questoes.rows.length === 0) {
      return res.status(404).json({ erro: 'A avaliação deste curso ainda não possui questões' });
    }

    res.json({ questoes: questoes.rows, nota_minima: config.nota_minima });
  } catch (error) {
    console.error('Erro ao iniciar avaliação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/:cursoId/avaliacao/submeter', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;
    const { respostas, ordens } = req.body; // respostas: { questaoId: indiceAlternativa (original) }
    // ordens: { questaoId: [origIdx por posição exibida] } — opcional, só p/ revisão

    if (!respostas || typeof respostas !== 'object') {
      return res.status(400).json({ erro: 'Formato inválido. Envie { respostas: { questaoId: indice } }' });
    }

    const avaliacaoRes = await pool.query('SELECT * FROM avaliacoes WHERE curso_id = $1 AND ativa = true', [cursoId]);
    if (avaliacaoRes.rows.length === 0) {
      return res.status(404).json({ erro: 'Este curso não possui avaliação final' });
    }
    const config = avaliacaoRes.rows[0];

    const status = await statusTentativas(alunoId, cursoId);
    // Ver /iniciar: aprovado não trava; só a nota máxima (100%) ou o teto de tentativas.
    if (status.melhor >= 100) {
      return res.status(400).json({ erro: 'Você já atingiu a nota máxima (100%) na avaliação' });
    }
    if (status.tentativas >= config.max_tentativas) {
      return res.status(400).json({ erro: `Limite de ${config.max_tentativas} tentativas atingido` });
    }

    const ids = Object.keys(respostas).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    const questoes = ids.length > 0
      ? await pool.query(
          'SELECT id, correta, explicacao FROM questoes WHERE curso_id = $1 AND id = ANY($2::int[])',
          [cursoId, ids]
        )
      : { rows: [] };

    // Corrige no servidor — questões não respondidas contam como erradas
    const totalProva = Math.min(config.num_questoes,
      parseInt((await pool.query('SELECT COUNT(*) as t FROM questoes WHERE curso_id = $1', [cursoId])).rows[0].t));
    let acertos = 0;
    const correcao = [];
    for (const q of questoes.rows) {
      const certa = parseInt(respostas[q.id], 10) === q.correta;
      if (certa) acertos++;
      correcao.push({ id: q.id, correta: q.correta, explicacao: q.explicacao, acertou: certa });
    }

    const nota = totalProva > 0 ? Math.round((acertos / totalProva) * 100) : 0;
    const aprovado = nota >= config.nota_minima;

    const ordensValidas = ordens && typeof ordens === 'object' ? ordens : null;
    await pool.query(
      `INSERT INTO tentativas_avaliacao (aluno_id, curso_id, nota, aprovado, respostas, ordens)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [alunoId, cursoId, nota, aprovado, JSON.stringify(respostas), ordensValidas ? JSON.stringify(ordensValidas) : null]
    );

    res.json({
      nota,
      aprovado,
      acertos,
      total: totalProva,
      nota_minima: config.nota_minima,
      tentativas: status.tentativas + 1,
      restantes: Math.max(0, config.max_tentativas - status.tentativas - 1),
      correcao,
    });
  } catch (error) {
    console.error('Erro ao submeter avaliação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

/*
 * GET /:cursoId/avaliacao/ultima-tentativa
 * Recompõe a revisão da ÚLTIMA tentativa do aluno: para cada questão respondida,
 * devolve enunciado, alternativas, resposta correta, explicação, o que o aluno
 * marcou e se acertou. Como a tentativa já foi submetida, expor o gabarito aqui
 * é seguro (não vaza nada antes do envio — o /iniciar continua sem `correta`).
 */
router.get('/:cursoId/avaliacao/ultima-tentativa', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;

    const r = await pool.query(
      `SELECT nota, aprovado, respostas, ordens, created_at
       FROM tentativas_avaliacao
       WHERE aluno_id = $1 AND curso_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [alunoId, cursoId]
    );
    if (r.rows.length === 0) {
      return res.json({ existe: false });
    }

    const tentativa = r.rows[0];
    const respostas = tentativa.respostas || {}; // { questaoId: indice }
    const ordens = tentativa.ordens || {};       // { questaoId: [origIdx por posição] }
    const ids = Object.keys(respostas).map(n => parseInt(n, 10)).filter(n => !isNaN(n));

    const questoes = ids.length > 0
      ? await pool.query(
          'SELECT id, enunciado, alternativas, correta, explicacao FROM questoes WHERE curso_id = $1 AND id = ANY($2::int[])',
          [cursoId, ids]
        )
      : { rows: [] };

    const qMap = {};
    for (const q of questoes.rows) qMap[q.id] = q;

    // Preserva a ordem em que as questões foram respondidas.
    const revisao = ids
      .map(id => {
        const q = qMap[id];
        if (!q) return null; // questão excluída depois da tentativa
        const sel = parseInt(respostas[id], 10);
        return {
          id: q.id,
          enunciado: q.enunciado,
          alternativas: q.alternativas,
          // ordem de exibição desta questão na tentativa (origIdx por posição);
          // null em tentativas antigas → cliente usa a ordem canônica.
          ordem: Array.isArray(ordens[id]) ? ordens[id] : null,
          correta: q.correta,
          explicacao: q.explicacao,
          resposta: isNaN(sel) ? null : sel,
          acertou: sel === q.correta,
        };
      })
      .filter(Boolean);

    res.json({
      existe: true,
      nota: tentativa.nota,
      aprovado: tentativa.aprovado,
      data: tentativa.created_at,
      revisao,
    });
  } catch (error) {
    console.error('Erro ao buscar revisão da última tentativa:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Certificado ──────────────────────────────────────────────────────────────

function gerarCodigoCertificado() {
  return 'CN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.get('/:cursoId/certificado', authMiddleware, async (req, res) => {
  try {
    const { cursoId } = req.params;
    const alunoId = req.alunoId;

    const certExiste = await pool.query(
      `SELECT cert.*, c.nome as curso_nome, c.duracao as curso_duracao,
              c.cert_responsavel, c.cert_texto, c.cert_assinatura
       FROM certificados cert
       JOIN cursos c ON c.id = cert.curso_id
       WHERE cert.aluno_id = $1 AND cert.curso_id = $2`,
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

    const certExiste = await pool.query(
      'SELECT id FROM certificados WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, cursoId]
    );
    if (certExiste.rows.length > 0) {
      return res.status(409).json({ erro: 'Certificado já emitido para este curso' });
    }

    const cursoRes = await pool.query('SELECT * FROM cursos WHERE id = $1', [cursoId]);
    if (cursoRes.rows.length === 0) {
      return res.status(404).json({ erro: 'Curso não encontrado' });
    }
    if (cursoRes.rows[0].status !== 'publicado') {
      return res.status(400).json({ erro: 'O curso precisa estar publicado e ativo para emitir certificado' });
    }

    const matricula = await pool.query(
      'SELECT progresso FROM matriculas WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, cursoId]
    );
    if (matricula.rows.length === 0) {
      return res.status(404).json({ erro: 'Matrícula não encontrada' });
    }
    if (matricula.rows[0].progresso < 100) {
      return res.status(400).json({ erro: 'É necessário completar 100% das aulas para emitir o certificado' });
    }

    // Se o curso tem avaliação ativa com questões, exige aprovação
    let nota = 100;
    const avaliacao = await pool.query(
      `SELECT av.nota_minima,
        (SELECT COUNT(*) FROM questoes q WHERE q.curso_id = av.curso_id) as total_questoes
       FROM avaliacoes av WHERE av.curso_id = $1 AND av.ativa = true`,
      [cursoId]
    );
    if (avaliacao.rows.length > 0 && parseInt(avaliacao.rows[0].total_questoes) > 0) {
      const status = await statusTentativas(alunoId, cursoId);
      if (!status.aprovado) {
        return res.status(400).json({
          erro: `É necessário ser aprovado na avaliação final (mínimo ${avaliacao.rows[0].nota_minima}%)`,
        });
      }
      nota = status.melhor;
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
