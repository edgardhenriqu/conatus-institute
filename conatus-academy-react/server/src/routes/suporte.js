/**
 * Suporte — chamados entre alunos e administradores.
 *
 * Dois públicos na mesma rota base (/api/suporte):
 *   - Aluno: abre chamados, lê e responde os PRÓPRIOS (authMiddleware).
 *   - Admin: enxerga todos, filtra, responde e altera status (adminMiddleware).
 *
 * A separação é por caminho: tudo sob /admin exige adminMiddleware. O resto
 * exige apenas login e checa a posse do chamado consultando o banco — nunca
 * confiando em id vindo do cliente.
 */
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('../../db/connection');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');
const { ADMIN_ROLES } = require('../utils/roles');

const router = express.Router();

/* ── Anexos ────────────────────────────────────────────────────────────────
 * Tipos aceitos: PDF, DOC(X), imagem e ZIP. A extensão gravada vem SEMPRE do
 * mimetype verificado, nunca do nome enviado pelo cliente — um "foto.jpg.exe"
 * não vira executável no nosso lado.
 *
 * SVG está fora junto com vídeo: SVG pode conter <script> (XSS armazenado) e
 * vídeo estouraria o banco (bytea no free tier de 500 MB do Supabase).
 */
const TIPOS_ANEXO = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

const MAX_ANEXO_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ANEXOS = 5;

const uploadAnexos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ANEXO_BYTES, files: MAX_ANEXOS },
  fileFilter: (req, file, cb) => {
    if (TIPOS_ANEXO[file.mimetype]) return cb(null, true);
    cb(new Error('Formato não aceito. Envie PDF, DOC, DOCX, imagem (JPG/PNG/WEBP/GIF) ou ZIP.'));
  },
}).array('anexos', MAX_ANEXOS);

/**
 * Roda o multer e traduz os erros dele para mensagens em português.
 * Requisições JSON passam direto (o multer ignora quem não é multipart), então
 * a mesma rota aceita mensagem com e sem anexo.
 */
function comAnexos(req, res, next) {
  uploadAnexos(req, res, (err) => {
    if (!err) return next();
    let msg = err.message || 'Erro ao enviar os anexos.';
    if (err.code === 'LIMIT_FILE_SIZE') msg = 'Arquivo muito grande. O limite é 10 MB por anexo.';
    if (err.code === 'LIMIT_FILE_COUNT') msg = `Envie no máximo ${MAX_ANEXOS} anexos por mensagem.`;
    return res.status(400).json({ erro: msg });
  });
}

/**
 * Grava os anexos de uma mensagem. Recebe o `client` da transação do chamador:
 * mensagem e anexos precisam entrar ou sair juntos — uma mensagem que promete
 * um anexo inexistente é pior do que nenhuma mensagem.
 */
async function salvarAnexos(client, messageId, ticketId, arquivos) {
  const salvos = [];
  for (const f of arquivos) {
    const ext = TIPOS_ANEXO[f.mimetype];
    // O nome no banco é gerado por nós (timestamp + aleatório): o nome original
    // do cliente nunca vira caminho, e sem o aleatório dois envios no mesmo
    // milissegundo colidiriam na PK de arquivos_upload.
    const chave = `ticket-${ticketId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    await client.query(
      'INSERT INTO arquivos_upload (nome, mime, dados, tamanho) VALUES ($1, $2, $3, $4)',
      [chave, f.mimetype, f.buffer, f.size]
    );
    // O nome original é só rótulo de exibição — path.basename corta qualquer
    // tentativa de "../.." vinda no filename.
    const nomeOriginal = path.basename(f.originalname || 'anexo').slice(0, 255);
    const r = await client.query(
      `INSERT INTO ticket_attachments (message_id, arquivo, nome_original, tipo, tamanho)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome_original, tipo, tamanho`,
      [messageId, chave, nomeOriginal, f.mimetype, f.size]
    );
    salvos.push(r.rows[0]);
  }
  return salvos;
}

/** Registra uma ação da equipe no histórico do chamado. */
async function registrarEvento(client, ticketId, ator, acao, de = null, para = null) {
  await client.query(
    `INSERT INTO ticket_eventos (ticket_id, ator_id, ator_nome, acao, valor_de, valor_para)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [ticketId, ator.id, ator.nome, acao, de, para]
  );
}

/** Nome do usuário, para carimbar no log sem depender da conta continuar existindo. */
async function nomeDoUsuario(alunoId) {
  const r = await pool.query('SELECT nome FROM alunos WHERE id = $1', [alunoId]);
  return r.rows[0]?.nome || null;
}

// Espelhados no front em src/utils/suporte.js e nos CHECKs de ensureSchema.js.
const STATUS_VALIDOS = ['aberto', 'em_atendimento', 'aguardando_aluno', 'resolvido', 'fechado'];
const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta', 'urgente'];
const CATEGORIAS_VALIDAS = ['duvida', 'problema_tecnico', 'pagamento', 'certificados', 'matriculas', 'outros'];

// Chamado fechado é arquivo morto: não recebe mais mensagens de nenhum lado.
const STATUS_ENCERRADOS = ['fechado'];

const LIMITE_ASSUNTO = 200;
const LIMITE_MENSAGEM = 5000;
const POR_PAGINA_PADRAO = 20;
const POR_PAGINA_MAX = 100;

/** O usuário logado tem papel administrativo? (confere no banco, não no token) */
async function ehAdmin(alunoId) {
  const r = await pool.query('SELECT role FROM alunos WHERE id = $1', [alunoId]);
  return r.rows.length > 0 && ADMIN_ROLES.includes(r.rows[0].role);
}

/**
 * Carrega o chamado garantindo que o usuário pode vê-lo.
 * Devolve { ticket } ou { erro, status } — o chamador decide como responder.
 * Para quem não é admin e não é dono, responde 404 (e não 403) de propósito:
 * um 403 confirmaria a existência do chamado alheio.
 */
async function carregarTicketAutorizado(ticketId, alunoId, admin) {
  const r = await pool.query(
    `SELECT t.*, a.nome AS aluno_nome, a.email AS aluno_email,
            a.empresa AS aluno_empresa, a.role AS aluno_role,
            resp.nome AS responsavel_nome
       FROM tickets t
       JOIN alunos a ON a.id = t.user_id
       LEFT JOIN alunos resp ON resp.id = t.responsavel_id
      WHERE t.id = $1`,
    [ticketId]
  );
  if (r.rows.length === 0) return { erro: 'Chamado não encontrado.', status: 404 };
  const ticket = r.rows[0];
  if (!admin && ticket.user_id !== alunoId) {
    return { erro: 'Chamado não encontrado.', status: 404 };
  }
  return { ticket };
}

/**
 * Mensagens do chamado, com os anexos de cada uma.
 * O aluno nunca recebe as marcadas como internas — nem os anexos delas, que
 * saem juntos porque são agregados a partir das mensagens já filtradas.
 */
async function carregarMensagens(ticketId, incluirInternas) {
  const r = await pool.query(
    `SELECT m.id, m.autor_tipo, m.mensagem, m.interna, m.criado_em,
            m.user_id, a.nome AS autor_nome,
            COALESCE(
              (SELECT json_agg(json_build_object(
                        'id', an.id, 'nome', an.nome_original,
                        'tipo', an.tipo, 'tamanho', an.tamanho) ORDER BY an.id)
                 FROM ticket_attachments an WHERE an.message_id = m.id),
              '[]'::json
            ) AS anexos
       FROM ticket_messages m
       LEFT JOIN alunos a ON a.id = m.user_id
      WHERE m.ticket_id = $1 ${incluirInternas ? '' : 'AND m.interna = false'}
      ORDER BY m.criado_em, m.id`,
    [ticketId]
  );
  return r.rows;
}

/* ══════════════════════════════════════════════════════════════════════════
   DOWNLOAD DE ANEXO
   Declarado antes de /:id para "anexos" não ser capturado como id do chamado.
   ══════════════════════════════════════════════════════════════════════════ */

// Diferente de /api/uploads/courses/:nome (público), este download é fechado:
// o anexo pertence a um chamado e pode conter dado pessoal. A posse é conferida
// subindo anexo → mensagem → chamado, e a nota interna só desce para a equipe.
router.get('/anexos/:id', authMiddleware, async (req, res) => {
  try {
    const admin = await ehAdmin(req.alunoId);
    const r = await pool.query(
      `SELECT an.arquivo, an.nome_original, an.tipo,
              t.user_id, m.interna
         FROM ticket_attachments an
         JOIN ticket_messages m ON m.id = an.message_id
         JOIN tickets t         ON t.id = m.ticket_id
        WHERE an.id = $1`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ erro: 'Anexo não encontrado.' });
    const anexo = r.rows[0];

    // 404 (e não 403) para anexo alheio ou de nota interna: um 403 confirmaria
    // que o arquivo existe.
    const dono = anexo.user_id === req.alunoId;
    if (!admin && (!dono || anexo.interna)) {
      return res.status(404).json({ erro: 'Anexo não encontrado.' });
    }

    const arq = await pool.query(
      'SELECT mime, dados FROM arquivos_upload WHERE nome = $1',
      [anexo.arquivo]
    );
    if (arq.rows.length === 0) return res.status(404).json({ erro: 'Arquivo não encontrado.' });

    // O conteúdo vem de usuário e não é confiável: nosniff + CSP travada impedem
    // que o navegador execute um arquivo forjado como HTML/script, e
    // Content-Disposition: attachment força download em vez de renderizar.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    // O nome vai em filename* (RFC 5987) porque acentos quebram o filename cru;
    // as aspas do nome são escapadas para não fechar o cabeçalho antes da hora.
    const seguro = anexo.nome_original.replace(/["\\]/g, '_');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${seguro}"; filename*=UTF-8''${encodeURIComponent(anexo.nome_original)}`
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.type(arq.rows[0].mime);
    res.send(arq.rows[0].dados);
  } catch (error) {
    console.error('Erro ao baixar anexo:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   ÁREA DO ADMIN  (/api/suporte/admin/...)
   Declarada ANTES de /:id — caso contrário "admin" seria capturado como id.
   ══════════════════════════════════════════════════════════════════════════ */

// ── Cards de resumo ───────────────────────────────────────────────────────────
// Uma varredura só: contar por status em queries separadas seria 4 idas ao banco.
router.get('/admin/resumo', adminMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'aberto')                         AS abertos,
         COUNT(*) FILTER (WHERE status = 'em_atendimento')                 AS em_atendimento,
         COUNT(*) FILTER (WHERE status = 'resolvido')                      AS resolvidos,
         COUNT(*) FILTER (WHERE prioridade IN ('alta','urgente')
                            AND status NOT IN ('resolvido','fechado'))     AS prioridade_alta,
         COUNT(*) FILTER (WHERE status NOT IN ('resolvido','fechado'))     AS pendentes
       FROM tickets`
    );
    const linha = r.rows[0];
    res.json({
      abertos:         Number(linha.abertos),
      em_atendimento:  Number(linha.em_atendimento),
      resolvidos:      Number(linha.resolvidos),
      prioridade_alta: Number(linha.prioridade_alta),
      pendentes:       Number(linha.pendentes),
    });
  } catch (error) {
    console.error('Erro ao carregar resumo do suporte:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Contador para o menu lateral ──────────────────────────────────────────────
// Rota enxuta e barata: o painel a consulta por polling em todas as telas.
router.get('/admin/pendentes', adminMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT COUNT(*) AS total FROM tickets WHERE status NOT IN ('resolvido','fechado')`
    );
    res.json({ pendentes: Number(r.rows[0].total) });
  } catch (error) {
    console.error('Erro ao contar chamados pendentes:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Atendentes disponíveis (para o seletor de responsável) ────────────────────
router.get('/admin/atendentes', adminMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, nome, email FROM alunos WHERE role = ANY($1) ORDER BY nome`,
      [ADMIN_ROLES]
    );
    res.json({ atendentes: r.rows });
  } catch (error) {
    console.error('Erro ao listar atendentes:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Listagem com filtros combinados, busca, ordenação e paginação ─────────────
router.get('/admin', adminMiddleware, async (req, res) => {
  try {
    const { busca, status, prioridade, categoria, ordem } = req.query;

    // Filtros acumulam em AND. Cada valor entra como parâmetro ($n) — nunca
    // concatenado — e os que vêm de fora da lista válida são ignorados, e não
    // rejeitados: um filtro desconhecido não deve derrubar a tela do admin.
    const where = [];
    const params = [];

    if (STATUS_VALIDOS.includes(status)) {
      params.push(status);
      where.push(`t.status = $${params.length}`);
    }
    if (PRIORIDADES_VALIDAS.includes(prioridade)) {
      params.push(prioridade);
      where.push(`t.prioridade = $${params.length}`);
    }
    if (CATEGORIAS_VALIDAS.includes(categoria)) {
      params.push(categoria);
      where.push(`t.categoria = $${params.length}`);
    }

    const termo = (busca || '').trim();
    if (termo) {
      // Busca por nome, e-mail, assunto ou número do chamado. O número é casado
      // à parte: o usuário digita "#123" ou "123", e id é inteiro (ILIKE não se
      // aplica). Sem dígitos, a comparação de id sai da cláusula.
      const soDigitos = termo.replace(/\D/g, '');
      params.push(`%${termo}%`);
      const idxTexto = params.length;
      const partes = [
        `a.nome ILIKE $${idxTexto}`,
        `a.email ILIKE $${idxTexto}`,
        `t.assunto ILIKE $${idxTexto}`,
      ];
      // Number.isSafeInteger barra entradas absurdas ("999999999999999999999"),
      // que estourariam o INTEGER do Postgres e derrubariam a query com erro.
      if (soDigitos && Number.isSafeInteger(Number(soDigitos))) {
        params.push(Number(soDigitos));
        partes.push(`t.id = $${params.length}`);
      }
      where.push(`(${partes.join(' OR ')})`);
    }

    const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
    // Ordenação por lista fechada: o valor jamais vem do cliente para o SQL.
    const direcao = ordem === 'antigos' ? 'ASC' : 'DESC';

    const totalRes = await pool.query(
      `SELECT COUNT(*) AS total FROM tickets t JOIN alunos a ON a.id = t.user_id ${sqlWhere}`,
      params
    );
    const total = Number(totalRes.rows[0].total);

    const porPagina = Math.min(
      Math.max(parseInt(req.query.porPagina, 10) || POR_PAGINA_PADRAO, 1),
      POR_PAGINA_MAX
    );
    const totalPaginas = Math.max(Math.ceil(total / porPagina), 1);
    // Página fora do intervalo volta para a última válida — evita tela vazia
    // quando um filtro encolhe o resultado e a página atual deixa de existir.
    const pagina = Math.min(Math.max(parseInt(req.query.pagina, 10) || 1, 1), totalPaginas);
    const offset = (pagina - 1) * porPagina;

    params.push(porPagina, offset);
    const r = await pool.query(
      `SELECT t.id, t.assunto, t.categoria, t.prioridade, t.status,
              t.criado_em, t.atualizado_em,
              a.nome AS aluno_nome, a.email AS aluno_email,
              resp.nome AS responsavel_nome,
              (SELECT COUNT(*) FROM ticket_messages m
                WHERE m.ticket_id = t.id AND m.interna = false) AS total_mensagens
         FROM tickets t
         JOIN alunos a ON a.id = t.user_id
         LEFT JOIN alunos resp ON resp.id = t.responsavel_id
         ${sqlWhere}
        ORDER BY t.atualizado_em ${direcao}, t.id ${direcao}
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ chamados: r.rows, total, pagina, porPagina, totalPaginas });
  } catch (error) {
    console.error('Erro ao listar chamados:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Alteração rápida: status, prioridade, responsável, observação interna ─────
// Cada campo alterado vira uma linha em ticket_eventos. O log entra na MESMA
// transação da alteração: um log que pode falhar sozinho registra uma história
// que não aconteceu (ou esquece uma que aconteceu).
router.put('/admin/:id', adminMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { status, prioridade, responsavel_id, observacao_interna } = req.body;

    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido.' });
    }
    if (prioridade !== undefined && !PRIORIDADES_VALIDAS.includes(prioridade)) {
      return res.status(400).json({ erro: 'Prioridade inválida.' });
    }

    // Responsável precisa ser alguém com papel administrativo — sem isso daria
    // para atribuir um chamado a um aluno qualquer, que nunca o veria.
    let novoResponsavel = null;
    if (responsavel_id) {
      const r = await client.query('SELECT role FROM alunos WHERE id = $1', [responsavel_id]);
      if (r.rows.length === 0 || !ADMIN_ROLES.includes(r.rows[0].role)) {
        return res.status(400).json({ erro: 'O responsável deve ser um administrador.' });
      }
      novoResponsavel = responsavel_id;
    }

    // Estado anterior, para o log saber o "de → para" e para não registrar
    // evento quando o admin salva o formulário sem mexer em nada.
    const antesRes = await client.query(
      `SELECT t.status, t.prioridade, t.responsavel_id, t.observacao_interna,
              resp.nome AS responsavel_nome
         FROM tickets t
         LEFT JOIN alunos resp ON resp.id = t.responsavel_id
        WHERE t.id = $1`,
      [req.params.id]
    );
    if (antesRes.rows.length === 0) return res.status(404).json({ erro: 'Chamado não encontrado.' });
    const antes = antesRes.rows[0];

    await client.query('BEGIN');

    // COALESCE mantém o valor atual quando o campo não veio no corpo. A exceção
    // é responsavel_id: enviar vazio significa "sem responsável", então ele é
    // aplicado direto (e limpa a coluna) sempre que a chave estiver presente.
    const mexeuResponsavel = responsavel_id !== undefined;
    const r = await client.query(
      `UPDATE tickets
          SET status     = COALESCE($1, status),
              prioridade = COALESCE($2, prioridade),
              responsavel_id = CASE WHEN $3::boolean THEN $4::uuid ELSE responsavel_id END,
              observacao_interna = COALESCE($5, observacao_interna),
              atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, status, prioridade, responsavel_id, observacao_interna`,
      [
        status ?? null,
        prioridade ?? null,
        mexeuResponsavel,
        novoResponsavel,
        observacao_interna ?? null,
        req.params.id,
      ]
    );
    const depois = r.rows[0];
    const ator = { id: req.alunoId, nome: await nomeDoUsuario(req.alunoId) };

    if (antes.status !== depois.status) {
      await registrarEvento(client, req.params.id, ator, 'status', antes.status, depois.status);
    }
    if (antes.prioridade !== depois.prioridade) {
      await registrarEvento(client, req.params.id, ator, 'prioridade', antes.prioridade, depois.prioridade);
    }
    if (antes.responsavel_id !== depois.responsavel_id) {
      const novoNome = depois.responsavel_id ? await nomeDoUsuario(depois.responsavel_id) : null;
      await registrarEvento(client, req.params.id, ator, 'responsavel',
        antes.responsavel_nome, novoNome);
    }
    if ((antes.observacao_interna || '') !== (depois.observacao_interna || '')) {
      // O texto da observação não vai para o log: ele já está no chamado, e
      // duplicá-lo a cada edição encheria o histórico de parágrafos.
      await registrarEvento(client, req.params.id, ator, 'observacao', null, null);
    }

    await client.query('COMMIT');

    const { ticket } = await carregarTicketAutorizado(req.params.id, req.alunoId, true);
    res.json({ chamado: ticket });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao atualizar chamado:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// ── Exclusão ──────────────────────────────────────────────────────────────────
// Mensagens, anexos e eventos somem por ON DELETE CASCADE — mas os BYTES não.
// arquivos_upload não tem FK para o chamado (é uma tabela genérica, chaveada
// por nome), então o CASCADE não a alcança: sem apagá-la aqui, cada chamado
// excluído deixaria os arquivos no banco para sempre. Num Supabase de 500 MB
// isso é um vazamento silencioso de armazenamento.
// Daí a transação: some tudo junto, ou nada some.
//
// O log do chamado morre junto (é filho dele), então a exclusão é registrada no
// console do servidor — é o único rastro que sobrevive.
router.delete('/admin/:id', adminMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // As chaves precisam ser lidas ANTES do DELETE: depois dele o CASCADE já
    // levou ticket_attachments e não há mais como saber quais arquivos eram.
    const chaves = await client.query(
      `SELECT an.arquivo
         FROM ticket_attachments an
         JOIN ticket_messages m ON m.id = an.message_id
        WHERE m.ticket_id = $1`,
      [req.params.id]
    );

    const r = await client.query(
      'DELETE FROM tickets WHERE id = $1 RETURNING id, assunto',
      [req.params.id]
    );
    if (r.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Chamado não encontrado.' });
    }

    for (const { arquivo } of chaves.rows) {
      await client.query('DELETE FROM arquivos_upload WHERE nome = $1', [arquivo]);
    }
    await client.query('COMMIT');

    const quem = await nomeDoUsuario(req.alunoId);
    console.log(
      `[Suporte] Chamado #${r.rows[0].id} ("${r.rows[0].assunto}") excluído por ` +
      `${quem || req.alunoId} em ${new Date().toISOString()} ` +
      `(${chaves.rows.length} anexo(s) removido(s))`
    );
    res.json({ mensagem: 'Chamado excluído com sucesso.' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao excluir chamado:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   ÁREA DO ALUNO  (exige apenas login; a posse é conferida no banco)
   ══════════════════════════════════════════════════════════════════════════ */

// ── Meus chamados ─────────────────────────────────────────────────────────────
router.get('/meus', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT t.id, t.assunto, t.categoria, t.prioridade, t.status,
              t.criado_em, t.atualizado_em,
              resp.nome AS responsavel_nome
         FROM tickets t
         LEFT JOIN alunos resp ON resp.id = t.responsavel_id
        WHERE t.user_id = $1
        ORDER BY t.atualizado_em DESC, t.id DESC`,
      [req.alunoId]
    );
    res.json({ chamados: r.rows });
  } catch (error) {
    console.error('Erro ao listar chamados do aluno:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Contador do aluno (badge no menu do site) ─────────────────────────────────
// "Aguardando Aluno" é exatamente o estado em que a equipe respondeu e a bola
// está com ele — serve de notificação sem precisar de controle de leitura.
router.get('/meus/aguardando', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT COUNT(*) AS total FROM tickets
        WHERE user_id = $1 AND status = 'aguardando_aluno'`,
      [req.alunoId]
    );
    res.json({ aguardando: Number(r.rows[0].total) });
  } catch (error) {
    console.error('Erro ao contar chamados do aluno:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Abertura de chamado ───────────────────────────────────────────────────────
// O chamado e a primeira mensagem nascem juntos: um chamado sem a mensagem
// inicial deixaria o admin sem nada para ler. Daí a transação.
router.post('/', authMiddleware, comAnexos, async (req, res) => {
  const client = await pool.connect();
  try {
    const assunto = (req.body.assunto || '').trim();
    const categoria = (req.body.categoria || '').trim();
    const mensagem = (req.body.mensagem || '').trim();

    if (!assunto) return res.status(400).json({ erro: 'Informe o assunto do chamado.' });
    if (assunto.length > LIMITE_ASSUNTO) {
      return res.status(400).json({ erro: `O assunto deve ter no máximo ${LIMITE_ASSUNTO} caracteres.` });
    }
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      return res.status(400).json({ erro: 'Selecione uma categoria válida.' });
    }
    if (!mensagem) return res.status(400).json({ erro: 'Descreva sua solicitação na mensagem.' });
    if (mensagem.length > LIMITE_MENSAGEM) {
      return res.status(400).json({ erro: `A mensagem deve ter no máximo ${LIMITE_MENSAGEM} caracteres.` });
    }

    await client.query('BEGIN');
    // A prioridade NÃO vem do aluno: todos marcariam "urgente". Nasce 'media' e
    // só a equipe reclassifica.
    const t = await client.query(
      `INSERT INTO tickets (user_id, assunto, categoria)
       VALUES ($1, $2, $3)
       RETURNING id, assunto, categoria, prioridade, status, criado_em, atualizado_em`,
      [req.alunoId, assunto, categoria]
    );
    const ticket = t.rows[0];
    const m = await client.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, autor_tipo, mensagem)
       VALUES ($1, $2, 'aluno', $3)
       RETURNING id`,
      [ticket.id, req.alunoId, mensagem]
    );
    if (req.files?.length) {
      await salvarAnexos(client, m.rows[0].id, ticket.id, req.files);
    }
    await client.query('COMMIT');

    res.status(201).json({ chamado: ticket });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao abrir chamado:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// ── Detalhe + histórico da conversa (aluno dono ou admin) ─────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const admin = await ehAdmin(req.alunoId);
    const { ticket, erro, status } = await carregarTicketAutorizado(req.params.id, req.alunoId, admin);
    if (erro) return res.status(status).json({ erro });

    const mensagens = await carregarMensagens(ticket.id, admin);

    // Só o admin recebe a observação interna e os dados de gestão do aluno.
    if (!admin) delete ticket.observacao_interna;

    let aluno = null;
    let eventos = [];
    if (admin) {
      const m = await pool.query(
        `SELECT c.nome AS curso_nome, mt.progresso
           FROM matriculas mt
           JOIN cursos c ON c.id = mt.curso_id
          WHERE mt.aluno_id = $1
          ORDER BY c.nome`,
        [ticket.user_id]
      );
      aluno = {
        id: ticket.user_id,
        nome: ticket.aluno_nome,
        email: ticket.aluno_email,
        empresa: ticket.aluno_empresa,
        role: ticket.aluno_role,
        matriculas: m.rows,
      };
      // O histórico de alterações é interno: mostra quem mexeu no quê e quando.
      // Fica fora da resposta ao aluno junto com o resto dos dados de gestão.
      const e = await pool.query(
        `SELECT id, ator_nome, acao, valor_de, valor_para, criado_em
           FROM ticket_eventos
          WHERE ticket_id = $1
          ORDER BY criado_em DESC, id DESC`,
        [ticket.id]
      );
      eventos = e.rows;
    }

    res.json({ chamado: ticket, mensagens, aluno, eventos });
  } catch (error) {
    console.error('Erro ao carregar chamado:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ── Resposta (aluno dono ou admin) ────────────────────────────────────────────
// Uma rota só para os dois lados: o autor_tipo sai do papel de quem responde,
// nunca do corpo da requisição.
router.post('/:id/mensagens', authMiddleware, comAnexos, async (req, res) => {
  const client = await pool.connect();
  try {
    const admin = await ehAdmin(req.alunoId);
    const { ticket, erro, status } = await carregarTicketAutorizado(req.params.id, req.alunoId, admin);
    if (erro) return res.status(status).json({ erro });

    const mensagem = (req.body.mensagem || '').trim();
    // Uma mensagem só com anexo é legítima ("segue o print"), então o texto é
    // dispensável quando há arquivo — mas mensagem vazia sem nada, não.
    if (!mensagem && !req.files?.length) {
      return res.status(400).json({ erro: 'Escreva uma mensagem ou anexe um arquivo.' });
    }
    if (mensagem.length > LIMITE_MENSAGEM) {
      return res.status(400).json({ erro: `A mensagem deve ter no máximo ${LIMITE_MENSAGEM} caracteres.` });
    }
    if (STATUS_ENCERRADOS.includes(ticket.status)) {
      return res.status(409).json({ erro: 'Este chamado está fechado e não aceita novas mensagens.' });
    }

    // Observação interna é privilégio do admin: pedida por um aluno, viraria
    // uma mensagem que ele mesmo não veria.
    // Vale 'true' (string) além de true: em multipart todo campo chega texto, e
    // comparar só com o booleano faria a nota interna virar mensagem pública
    // sempre que houvesse anexo junto.
    const interna = admin && (req.body.interna === true || req.body.interna === 'true');

    await client.query('BEGIN');
    const m = await client.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, autor_tipo, mensagem, interna)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, autor_tipo, mensagem, interna, criado_em`,
      [ticket.id, req.alunoId, admin ? 'admin' : 'aluno', mensagem, interna]
    );
    if (req.files?.length) {
      m.rows[0].anexos = await salvarAnexos(client, m.rows[0].id, ticket.id, req.files);
    }

    // O status acompanha quem falou por último — nota interna não conta, pois o
    // aluno não a recebeu e nada mudou para ele.
    //   admin respondeu → aguardando_aluno
    //   aluno respondeu → aberto (reabre inclusive um chamado já resolvido)
    // O responsável também é assumido no primeiro atendimento de um chamado
    // ainda sem dono, poupando um passo manual.
    let novoStatus = ticket.status;
    if (!interna) {
      if (admin) novoStatus = 'aguardando_aluno';
      else novoStatus = ticket.status === 'em_atendimento' ? 'em_atendimento' : 'aberto';
    }
    const assumir = admin && !interna && !ticket.responsavel_id;

    await client.query(
      `UPDATE tickets
          SET status = $1,
              responsavel_id = CASE WHEN $2::boolean THEN $3::uuid ELSE responsavel_id END,
              atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $4`,
      [novoStatus, assumir, assumir ? req.alunoId : null, ticket.id]
    );
    await client.query('COMMIT');

    res.status(201).json({ mensagem: m.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao responder chamado:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
