const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../../db/connection');
const { authMiddleware } = require('../middlewares/auth');
const { createCaptcha } = require('../captcha/svgCaptcha');
const captchaStore = require('../captcha/captchaStore');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../email/mailer');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Base do link de confirmação enviado por e-mail (aponta para o frontend).
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const EMAIL_TOKEN_TTL_HORAS = 24;

/**
 * Gera um token de verificação de e-mail, guarda apenas o hash no banco
 * (invalidando tokens anteriores do mesmo aluno) e devolve o token em claro
 * para montar o link enviado por e-mail.
 */
async function gerarTokenVerificacao(alunoId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiraEm = new Date(Date.now() + EMAIL_TOKEN_TTL_HORAS * 60 * 60 * 1000);

  // Tokens antigos ainda válidos deixam de servir assim que um novo é emitido.
  await pool.query('UPDATE email_verificacoes SET usado = true WHERE aluno_id = $1 AND usado = false', [alunoId]);
  await pool.query(
    'INSERT INTO email_verificacoes (aluno_id, token_hash, expira_em) VALUES ($1, $2, $3)',
    [alunoId, tokenHash, expiraEm]
  );
  return token;
}

/** Dispara o e-mail de confirmação. Lança erro se o SMTP falhar. */
async function enviarEmailConfirmacao(aluno, token) {
  const link = `${APP_URL}/verificar-email?token=${token}`;
  await sendVerificationEmail({ to: aluno.email, nome: aluno.nome, link });
}

/** Regras de senha forte (compartilhadas entre cadastro e redefinição). */
function senhaForte(senha) {
  return typeof senha === 'string'
    && senha.length >= 8
    && /[A-Z]/.test(senha)
    && /[a-z]/.test(senha)
    && /[0-9]/.test(senha)
    && /[^A-Za-z0-9]/.test(senha);
}

// Quantidade de senhas (incluindo a atual) que não podem ser reutilizadas.
const HISTORICO_SENHAS = 5;

/**
 * Indica se a senha em claro coincide com a senha atual ou com alguma das
 * últimas senhas usadas pelo aluno (bloqueio de reutilização).
 */
async function senhaReutilizada(alunoId, senhaPlana, senhaAtualHash) {
  const historico = await pool.query(
    'SELECT senha_hash FROM senha_historico WHERE aluno_id = $1 ORDER BY created_at DESC LIMIT $2',
    [alunoId, HISTORICO_SENHAS - 1]
  );
  const hashesAnteriores = [
    ...(senhaAtualHash ? [senhaAtualHash] : []),
    ...historico.rows.map(r => r.senha_hash),
  ];
  for (const hashAntigo of hashesAnteriores) {
    if (await bcrypt.compare(senhaPlana, hashAntigo)) return true;
  }
  return false;
}

/** Arquiva o hash da senha anterior no histórico e mantém só as últimas N. */
async function arquivarSenhaAnterior(alunoId, senhaAnteriorHash) {
  if (!senhaAnteriorHash) return;
  await pool.query(
    'INSERT INTO senha_historico (aluno_id, senha_hash) VALUES ($1, $2)',
    [alunoId, senhaAnteriorHash]
  );
  await pool.query(
    `DELETE FROM senha_historico
      WHERE aluno_id = $1
        AND id NOT IN (
          SELECT id FROM senha_historico
           WHERE aluno_id = $1
           ORDER BY created_at DESC
           LIMIT $2
        )`,
    [alunoId, HISTORICO_SENHAS]
  );
}

const SENHA_TOKEN_TTL_MIN = 60; // link de redefinição válido por 1 hora

/**
 * Gera um token de redefinição de senha (guarda só o hash, invalidando os
 * anteriores do mesmo aluno) e devolve o token em claro para o link.
 */
async function gerarTokenReset(alunoId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiraEm = new Date(Date.now() + SENHA_TOKEN_TTL_MIN * 60 * 1000);

  await pool.query('UPDATE senha_resets SET usado = true WHERE aluno_id = $1 AND usado = false', [alunoId]);
  await pool.query(
    'INSERT INTO senha_resets (aluno_id, token_hash, expira_em) VALUES ($1, $2, $3)',
    [alunoId, tokenHash, expiraEm]
  );
  return token;
}

/** Dispara o e-mail de redefinição. Lança erro se o SMTP falhar. */
async function enviarEmailReset(aluno, token) {
  const link = `${APP_URL}/redefinir-senha?token=${token}`;
  await sendPasswordResetEmail({ to: aluno.email, nome: aluno.nome, link });
}

/*
 * Segredo do "ticket de pré-autenticação".
 *
 * Após validar e-mail/senha, o servidor NÃO entrega o token de acesso real:
 * entrega um ticket de curta duração que apenas comprova que as credenciais
 * passaram e que falta a verificação antirrobô (CAPTCHA).
 *
 * O ticket é assinado com um segredo DERIVADO (diferente do JWT_SECRET). Assim,
 * o authMiddleware — que valida com JWT_SECRET — rejeita o ticket caso alguém
 * tente usá-lo como token de acesso. O login fica pendente até o CAPTCHA passar.
 */
const PREAUTH_SECRET = (JWT_SECRET || '') + '::preauth';
const PREAUTH_EXPIRES_IN = '5m'; // tempo para concluir a verificação

/** Emite o token de acesso definitivo a partir do registro do aluno. */
function emitirTokenAcesso(aluno) {
  const token = jwt.sign({ id: aluno.id, role: aluno.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const { senha: _ignore, ...alunoSemSenha } = aluno;
  return { aluno: alunoSemSenha, token };
}

function isValidCpf(cpf) {
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +n[i] * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== +n[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += +n[i] * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === +n[10];
}

function isValidPhone(phone) {
  const n = phone.replace(/\D/g, '');
  if (n.length < 10 || n.length > 11) return false;
  const ddd = parseInt(n.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (n.length === 11 && n[2] !== '9') return false;
  return true;
}

router.post('/cadastrar', async (req, res) => {
  try {
    const { nome, email, senha, cpf, data_nascimento, telefone, endereco, cidade, estado, empresa, cargo } = req.body;

    if (!nome || !email || !senha || !cpf || !data_nascimento || !telefone || !endereco || !cidade || !estado
        || !empresa?.trim() || !cargo?.trim()) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    // Empresa e cargo (texto livre) são obrigatórios no cadastro.
    const empresaNorm = empresa.trim();
    const cargoNorm   = cargo.trim();

    if (!senhaForte(senha)) {
      return res.status(400).json({ erro: 'A senha deve ter no mínimo 8 caracteres, letra maiúscula, minúscula, número e caractere especial.' });
    }

    if (!isValidCpf(cpf)) {
      return res.status(400).json({ erro: 'CPF inválido. Verifique os dígitos informados.' });
    }

    if (!isValidPhone(telefone)) {
      return res.status(400).json({ erro: 'Telefone inválido. Informe o DDD + número no formato brasileiro.' });
    }

    const existeEmail = await pool.query('SELECT id FROM alunos WHERE email = $1', [email]);
    if (existeEmail.rows.length > 0) {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }

    const existeCpf = await pool.query('SELECT id FROM alunos WHERE cpf = $1', [cpf]);
    if (existeCpf.rows.length > 0) {
      return res.status(409).json({ erro: 'CPF já cadastrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const resultado = await pool.query(
      `INSERT INTO alunos (nome, email, senha, cpf, data_nascimento, telefone, endereco, cidade, estado, empresa, cargo, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'aluno')
       RETURNING id, nome, email, cpf, data_nascimento, telefone, endereco, cidade, estado, empresa, cargo, role, created_at`,
      [nome, email, senhaHash, cpf, data_nascimento, telefone, endereco, cidade, estado, empresaNorm, cargoNorm]
    );

    const aluno = resultado.rows[0];

    // A conta nasce NÃO verificada: o acesso só é liberado após confirmar o e-mail.
    // Não emitimos token de acesso aqui — enviamos o link de confirmação.
    let emailEnviado = true;
    try {
      const token = await gerarTokenVerificacao(aluno.id);
      await enviarEmailConfirmacao(aluno, token);
    } catch (mailErr) {
      emailEnviado = false;
      console.error('Falha ao enviar e-mail de confirmação:', mailErr.message);
    }

    res.status(201).json({
      verificacaoPendente: true,
      email: aluno.email,
      emailEnviado,
      mensagem: emailEnviado
        ? 'Cadastro realizado! Enviamos um link de confirmação para o seu e-mail.'
        : 'Cadastro realizado, mas não conseguimos enviar o e-mail de confirmação agora. Use a opção de reenviar.',
    });
  } catch (error) {
    console.error('Erro ao cadastrar aluno:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    // Ensure JWT secret is configured
    if (!JWT_SECRET) {
      console.error('JWT_SECRET não definido');
      return res.status(500).json({ erro: 'Erro interno do servidor' });
    }

    const resultado = await pool.query('SELECT * FROM alunos WHERE email = $1', [email]);
    if (resultado.rows.length === 0) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const aluno = resultado.rows[0];
    const senhaValida = await bcrypt.compare(senha, aluno.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    if (!aluno.ativo) {
      return res.status(403).json({ erro: 'Conta desativada. Entre em contato com o administrador.' });
    }

    // E-mail ainda não confirmado: bloqueia o acesso e sinaliza ao frontend para
    // oferecer o reenvio do link de confirmação.
    if (!aluno.email_verificado) {
      return res.status(403).json({
        erro: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada (e o spam).',
        emailNaoVerificado: true,
        email: aluno.email,
      });
    }

    // Credenciais OK, mas o acesso ainda NÃO é liberado: o usuário precisa passar
    // pela verificação antirrobô (CAPTCHA). Devolvemos apenas um ticket de
    // pré-autenticação de curta duração — sem token de acesso e sem dados sensíveis.
    const ticket = jwt.sign(
      { id: aluno.id, scope: 'preauth' },
      PREAUTH_SECRET,
      { expiresIn: PREAUTH_EXPIRES_IN }
    );
    res.json({ captchaRequired: true, ticket });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

/*
 * GET /api/auth/captcha
 * Gera uma nova imagem de verificação (SVG) e devolve:
 *  - captchaId: identificador opaco do desafio (a resposta fica só no servidor);
 *  - image: o SVG da imagem para exibir ao usuário.
 * Usado tanto na primeira exibição quanto no botão "Gerar nova imagem".
 */
router.get('/captcha', (req, res) => {
  try {
    const { text, image } = createCaptcha(5);
    const captchaId = captchaStore.save(text); // guarda a resposta no servidor
    res.json({ captchaId, image });
  } catch (error) {
    console.error('Erro ao gerar captcha:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

/*
 * POST /api/auth/verificar-captcha
 * Conclui o login pendente. Espera no corpo:
 *  - ticket: ticket de pré-autenticação recebido em /login;
 *  - captchaId: id do desafio exibido;
 *  - texto: o que o usuário digitou.
 *
 * Só após o CAPTCHA correto o token de acesso definitivo é emitido. A validação
 * acontece inteiramente no backend.
 */
router.post('/verificar-captcha', async (req, res) => {
  try {
    const { ticket, captchaId, texto } = req.body;

    if (!ticket || !captchaId || texto === undefined) {
      return res.status(400).json({ erro: 'Dados de verificação incompletos.' });
    }

    // 1) Valida o ticket de pré-autenticação (assinatura, expiração e escopo).
    let payload;
    try {
      payload = jwt.verify(ticket, PREAUTH_SECRET);
    } catch {
      return res.status(401).json({ erro: 'Sessão de login expirada. Faça login novamente.', restart: true });
    }
    if (payload.scope !== 'preauth') {
      return res.status(401).json({ erro: 'Sessão de login inválida. Faça login novamente.', restart: true });
    }

    // 2) Confere o CAPTCHA no servidor (uso único — consome o desafio).
    const resultado = captchaStore.verifyAndConsume(captchaId, texto);
    if (!resultado.ok) {
      const msg = resultado.reason === 'not_found'
        ? 'A imagem de verificação expirou. Gere uma nova imagem e tente outra vez.'
        : 'Código incorreto. Verifique a imagem e tente novamente.';
      return res.status(400).json({ erro: msg });
    }

    // 3) CAPTCHA correto: recarrega o aluno e libera o token de acesso definitivo.
    const dbRes = await pool.query('SELECT * FROM alunos WHERE id = $1', [payload.id]);
    if (dbRes.rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    const aluno = dbRes.rows[0];
    if (!aluno.ativo) {
      return res.status(403).json({ erro: 'Conta desativada. Entre em contato com o administrador.' });
    }

    res.json(emitirTokenAcesso(aluno));
  } catch (error) {
    console.error('Erro ao verificar captcha:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

/*
 * POST /api/auth/verificar-email
 * Confirma o e-mail a partir do token recebido no link. Corpo: { token }.
 * Marca a conta como verificada e consome o token (uso único).
 */
router.post('/verificar-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ erro: 'Token de confirmação ausente.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const dbRes = await pool.query(
      'SELECT * FROM email_verificacoes WHERE token_hash = $1',
      [tokenHash]
    );
    const registro = dbRes.rows[0];

    if (!registro) {
      return res.status(400).json({ erro: 'Link de confirmação inválido.' });
    }

    // Já confirmado anteriormente com este mesmo token: trata como sucesso idempotente.
    const alunoRes = await pool.query('SELECT id, email_verificado FROM alunos WHERE id = $1', [registro.aluno_id]);
    const aluno = alunoRes.rows[0];
    if (aluno && aluno.email_verificado) {
      return res.json({ mensagem: 'E-mail já confirmado. Você já pode fazer login.', jaConfirmado: true });
    }

    if (registro.usado) {
      return res.status(400).json({ erro: 'Este link de confirmação já foi utilizado.' });
    }
    if (new Date(registro.expira_em).getTime() < Date.now()) {
      return res.status(400).json({ erro: 'Link de confirmação expirado. Solicite um novo e-mail.', expirado: true });
    }

    await pool.query('UPDATE alunos SET email_verificado = true WHERE id = $1', [registro.aluno_id]);
    await pool.query('UPDATE email_verificacoes SET usado = true WHERE id = $1', [registro.id]);

    res.json({ mensagem: 'E-mail confirmado com sucesso! Você já pode fazer login.' });
  } catch (error) {
    console.error('Erro ao verificar e-mail:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

/*
 * POST /api/auth/reenviar-verificacao
 * Reenvia o link de confirmação. Corpo: { email }.
 * Resposta sempre genérica (não revela se o e-mail existe ou não).
 */
router.post('/reenviar-verificacao', async (req, res) => {
  const respostaGenerica = {
    mensagem: 'Se houver uma conta pendente com este e-mail, enviamos um novo link de confirmação.',
  };
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ erro: 'Informe o e-mail.' });
    }

    const dbRes = await pool.query('SELECT * FROM alunos WHERE email = $1', [email]);
    const aluno = dbRes.rows[0];

    // Só reenvia se a conta existir e ainda não estiver verificada.
    if (aluno && !aluno.email_verificado) {
      try {
        const token = await gerarTokenVerificacao(aluno.id);
        await enviarEmailConfirmacao(aluno, token);
      } catch (mailErr) {
        console.error('Falha ao reenviar e-mail de confirmação:', mailErr.message);
        return res.status(502).json({ erro: 'Não foi possível enviar o e-mail no momento. Tente novamente em instantes.' });
      }
    }

    res.json(respostaGenerica);
  } catch (error) {
    console.error('Erro ao reenviar verificação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

/*
 * POST /api/auth/esqueci-senha
 * Solicita o link de redefinição de senha. Corpo: { email }.
 * Resposta sempre genérica (não revela se o e-mail existe).
 */
router.post('/esqueci-senha', async (req, res) => {
  const respostaGenerica = {
    mensagem: 'Se houver uma conta com este e-mail, enviamos um link para redefinir a senha.',
  };
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ erro: 'Informe o e-mail.' });
    }

    const dbRes = await pool.query('SELECT * FROM alunos WHERE email = $1', [email]);
    const aluno = dbRes.rows[0];

    if (aluno && aluno.ativo) {
      try {
        const token = await gerarTokenReset(aluno.id);
        await enviarEmailReset(aluno, token);
      } catch (mailErr) {
        console.error('Falha ao enviar e-mail de redefinição:', mailErr.message);
        return res.status(502).json({ erro: 'Não foi possível enviar o e-mail no momento. Tente novamente em instantes.' });
      }
    }

    res.json(respostaGenerica);
  } catch (error) {
    console.error('Erro em esqueci-senha:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

/*
 * POST /api/auth/redefinir-senha
 * Define uma nova senha a partir do token recebido por e-mail.
 * Corpo: { token, senha }. Consome o token (uso único).
 */
router.post('/redefinir-senha', async (req, res) => {
  try {
    const { token, senha } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ erro: 'Token de redefinição ausente.' });
    }
    if (!senhaForte(senha)) {
      return res.status(400).json({ erro: 'A senha deve ter no mínimo 8 caracteres, letra maiúscula, minúscula, número e caractere especial.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const dbRes = await pool.query('SELECT * FROM senha_resets WHERE token_hash = $1', [tokenHash]);
    const registro = dbRes.rows[0];

    if (!registro) {
      return res.status(400).json({ erro: 'Link de redefinição inválido.' });
    }
    if (registro.usado) {
      return res.status(400).json({ erro: 'Este link de redefinição já foi utilizado.' });
    }
    if (new Date(registro.expira_em).getTime() < Date.now()) {
      return res.status(400).json({ erro: 'Link de redefinição expirado. Solicite um novo.', expirado: true });
    }

    // Impede reutilizar a senha atual ou uma das últimas senhas usadas.
    const alunoRes = await pool.query('SELECT senha FROM alunos WHERE id = $1', [registro.aluno_id]);
    const senhaAtual = alunoRes.rows[0]?.senha;

    if (await senhaReutilizada(registro.aluno_id, senha, senhaAtual)) {
      return res.status(400).json({
        erro: `A nova senha não pode ser igual a nenhuma das últimas ${HISTORICO_SENHAS} senhas utilizadas. Escolha uma senha diferente.`,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    await pool.query(
      'UPDATE alunos SET senha = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [senhaHash, registro.aluno_id]
    );
    await arquivarSenhaAnterior(registro.aluno_id, senhaAtual);
    await pool.query('UPDATE senha_resets SET usado = true WHERE id = $1', [registro.id]);
    // Invalida quaisquer outros tokens de reset pendentes do mesmo aluno.
    await pool.query('UPDATE senha_resets SET usado = true WHERE aluno_id = $1 AND usado = false', [registro.aluno_id]);

    res.json({ mensagem: 'Senha redefinida com sucesso! Você já pode fazer login com a nova senha.' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, nome, email, cpf, data_nascimento, telefone, endereco, cidade, estado, empresa, cargo, role, created_at FROM alunos WHERE id = $1',
      [req.alunoId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }

    res.json({ aluno: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

router.put('/perfil', authMiddleware, async (req, res) => {
  try {
    const { nome, telefone, endereco, cidade, estado, empresa, cargo } = req.body;

    // Empresa/cargo: string vazia limpa o campo (vira null); undefined preserva.
    const empresaParam = empresa === undefined
      ? null
      : (typeof empresa === 'string' && empresa.trim() ? empresa.trim() : '');
    const cargoParam = cargo === undefined
      ? null
      : (typeof cargo === 'string' && cargo.trim() ? cargo.trim() : '');

    const resultado = await pool.query(
      `UPDATE alunos
       SET nome = COALESCE($1, nome),
           telefone = COALESCE($2, telefone),
           endereco = COALESCE($3, endereco),
           cidade = COALESCE($4, cidade),
           estado = COALESCE($5, estado),
           empresa = CASE WHEN $6::text IS NULL THEN empresa
                          WHEN $6 = '' THEN NULL
                          ELSE $6 END,
           cargo = CASE WHEN $7::text IS NULL THEN cargo
                        WHEN $7 = '' THEN NULL
                        ELSE $7 END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, nome, email, cpf, data_nascimento, telefone, endereco, cidade, estado, empresa, cargo, created_at, updated_at`,
      [nome || null, telefone || null, endereco || null, cidade || null, estado || null, empresaParam, cargoParam, req.alunoId]
    );

    res.json({ aluno: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/auth/perfil/senha
 * Troca a senha do aluno logado. Exige a senha atual e bloqueia a reutilização
 * das últimas senhas (mesma regra do fluxo de redefinição por e-mail).
 */
router.put('/perfil/senha', authMiddleware, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || typeof senhaAtual !== 'string') {
      return res.status(400).json({ erro: 'Informe a senha atual.' });
    }
    if (!senhaForte(novaSenha)) {
      return res.status(400).json({ erro: 'A nova senha deve ter no mínimo 8 caracteres, letra maiúscula, minúscula, número e caractere especial.' });
    }

    const alunoRes = await pool.query('SELECT senha FROM alunos WHERE id = $1', [req.alunoId]);
    const senhaAtualHash = alunoRes.rows[0]?.senha;
    if (!senhaAtualHash) {
      return res.status(404).json({ erro: 'Aluno não encontrado.' });
    }

    if (!await bcrypt.compare(senhaAtual, senhaAtualHash)) {
      return res.status(400).json({ erro: 'A senha atual está incorreta.' });
    }

    if (await senhaReutilizada(req.alunoId, novaSenha, senhaAtualHash)) {
      return res.status(400).json({
        erro: `A nova senha não pode ser igual a nenhuma das últimas ${HISTORICO_SENHAS} senhas utilizadas. Escolha uma senha diferente.`,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const novaSenhaHash = await bcrypt.hash(novaSenha, salt);

    await pool.query(
      'UPDATE alunos SET senha = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [novaSenhaHash, req.alunoId]
    );
    await arquivarSenhaAnterior(req.alunoId, senhaAtualHash);

    res.json({ mensagem: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;
