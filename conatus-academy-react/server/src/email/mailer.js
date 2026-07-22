/*
 * Envio de e-mails transacionais (confirmação de cadastro).
 *
 * Configuração via variáveis de ambiente (.env):
 *   SMTP_HOST     ex.: smtp.gmail.com
 *   SMTP_PORT     ex.: 465 (SSL) ou 587 (STARTTLS)
 *   SMTP_SECURE   "true" para porta 465, "false" para 587
 *   SMTP_USER     usuário/e-mail de autenticação
 *   SMTP_PASS     senha de app (Gmail: gere em myaccount.google.com → Segurança)
 *   MAIL_FROM     remetente exibido (default: SMTP_USER)
 *
 * Se o SMTP não estiver configurado, o transporte não é criado: as funções de
 * envio lançam erro com mensagem clara, mas o link de confirmação é registrado
 * no console para não travar o desenvolvimento.
 */
const nodemailer = require('nodemailer');

let transporter = null;
let configError = null;

/*
 * Remetente exibido nas mensagens de SUPORTE (chamados). Diferente do MAIL_FROM
 * geral (cadastro/senha), para que os chamados saiam com a identidade da Central
 * de Ajuda.
 *
 * ATENÇÃO: se o SMTP autentica por uma conta Gmail, o Gmail REESCREVE o "De"
 * para a conta autenticada quando este endereço não é um alias verificado em
 * "Enviar e-mail como". Nesse caso o From vira o Gmail e este valor vale só como
 * reply-to. Para o From sair mesmo como suporte.ti, cadastre o alias no Gmail
 * (ou use SMTP do próprio domínio conatusprocedures.com).
 */
const MAIL_FROM_SUPORTE = process.env.MAIL_FROM_SUPORTE || 'suporte.ti@conatusprocedures.com';

function fromSuporte() {
  return `"Conatus Institute — Suporte" <${MAIL_FROM_SUPORTE}>`;
}

/**
 * Escapa texto para interpolação segura no HTML dos e-mails.
 *
 * Não é zelo teórico: o nome do remetente de um chamado de suporte é digitado
 * por um visitante sem conta, e o e-mail sai pelo NOSSO SMTP (assinado por
 * DKIM). Sem escape, alguém informaria um "nome" como
 * `<a/href="https://falso">Clique-aqui</a>` — sem espaços, para atravessar o
 * corte do primeiro nome — e usaria a plataforma para entregar phishing com a
 * marca da Conatus a terceiros.
 */
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Autenticação OAuth2 (Microsoft 365 / XOAUTH2) ──────────────────────────
 * Quando MICROSOFT_CLIENT_ID/SECRET/TENANT_ID estão no .env, autenticamos por
 * OAuth2 no fluxo client-credentials (app-only) — sem senha. Buscamos um access
 * token no Azure AD (escopo .default de outlook.office365.com) e o passamos ao
 * nodemailer como XOAUTH2. O token é cacheado até perto de expirar.
 *
 * Pré-requisitos no lado Azure/Exchange (feitos uma vez, fora do código):
 *  - App registration com permissão de APLICAÇÃO
 *    "Office 365 Exchange Online → SMTP.SendAsApp" + consentimento de admin;
 *  - Service principal do app registrado no Exchange Online e com permissão de
 *    envio na caixa suporte.ti@conatusprocedures.com (New-ServicePrincipal +
 *    Add-MailboxPermission / Grant SendAs).
 */
const OAUTH = {
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  tenantId: process.env.MICROSOFT_TENANT_ID,
};
const usaOAuth = Boolean(OAUTH.clientId && OAUTH.clientSecret && OAUTH.tenantId);

let tokenCache = { value: null, expiraEm: 0 };

/** Access token app-only do Azure AD, cacheado até ~2 min antes de expirar. */
async function getAccessTokenMicrosoft() {
  if (tokenCache.value && Date.now() < tokenCache.expiraEm - 120000) return tokenCache.value;

  const url = `https://login.microsoftonline.com/${OAUTH.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: OAUTH.clientId,
    client_secret: OAUTH.clientSecret,
    grant_type: 'client_credentials',
    scope: 'https://outlook.office365.com/.default',
  });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) {
    throw new Error(
      `Falha ao obter token OAuth2 do Azure AD (${resp.status}): ${data.error_description || data.error || 'sem detalhe'}`
    );
  }
  tokenCache = { value: data.access_token, expiraEm: Date.now() + (Number(data.expires_in || 3600) * 1000) };
  return tokenCache.value;
}

/** Transporter do nodemailer (OAuth2 se configurado; senão usuário+senha). Async
 *  porque o modo OAuth2 pode precisar buscar um token novo. */
async function getTransporter() {
  const SMTP_USER = process.env.SMTP_USER;
  const host = process.env.SMTP_HOST || 'smtp.office365.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465;

  if (usaOAuth) {
    if (!SMTP_USER) {
      configError = 'OAuth2 configurado, mas falta SMTP_USER (a caixa que envia, ex.: suporte.ti@conatusprocedures.com).';
      return null;
    }
    // Recriamos o transporter a cada envio para nunca reter um accessToken vencido
    // (o token em si vem do cache de getAccessTokenMicrosoft).
    const accessToken = await getAccessTokenMicrosoft();
    return nodemailer.createTransport({
      host, port, secure,
      auth: { type: 'OAuth2', user: SMTP_USER, accessToken },
    });
  }

  // Autenticação básica (usuário + senha) — fallback/legado.
  if (transporter) return transporter;
  const SMTP_PASS = process.env.SMTP_PASS;
  if (!SMTP_USER || !SMTP_PASS) {
    configError = 'SMTP não configurado: use OAuth2 (MICROSOFT_CLIENT_ID/SECRET/TENANT_ID) ou defina SMTP_USER e SMTP_PASS no .env.';
    return null;
  }
  transporter = nodemailer.createTransport({
    host, port, secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/** Teste de fumaça: obtém o transporter e valida conexão + autenticação. */
async function verificarTransporte() {
  const tx = await getTransporter();
  if (!tx) throw new Error(configError || 'Transporter indisponível');
  await tx.verify();
  return { modo: usaOAuth ? 'OAuth2 (Microsoft 365)' : 'básico (usuário+senha)' };
}

function montarHtml(nome, link) {
  const primeiroNome = escapeHtml((nome || '').trim().split(/\s+/)[0] || 'aluno(a)');
  link = escapeHtml(link);
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <div style="text-align:center;padding:24px 0">
      <h1 style="color:#0f3d3e;font-size:22px;margin:0">Conatus Institute</h1>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
      <h2 style="margin-top:0;font-size:18px">Olá, ${primeiroNome}!</h2>
      <p style="font-size:15px;line-height:1.6">
        Recebemos o seu cadastro na plataforma da <strong>Conatus Institute</strong>.
        Para ativar sua conta e começar seus estudos, confirme seu e-mail clicando no botão abaixo.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${link}"
           style="background:#0f3d3e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block">
          Confirmar meu e-mail
        </a>
      </div>
      <p style="font-size:13px;color:#6b7280;line-height:1.6">
        Se o botão não funcionar, copie e cole este endereço no navegador:<br>
        <a href="${link}" style="color:#0f3d3e;word-break:break-all">${link}</a>
      </p>
      <p style="font-size:13px;color:#6b7280">Este link expira em 24 horas.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#9ca3af">
        Se você não realizou este cadastro, ignore esta mensagem.
      </p>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px">
      © ${new Date().getFullYear()} Conatus Institute. Todos os direitos reservados.
    </p>
  </div>`;
}

function montarHtmlReset(nome, link) {
  const primeiroNome = escapeHtml((nome || '').trim().split(/\s+/)[0] || 'aluno(a)');
  link = escapeHtml(link);
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <div style="text-align:center;padding:24px 0">
      <h1 style="color:#0f3d3e;font-size:22px;margin:0">Conatus Institute</h1>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
      <h2 style="margin-top:0;font-size:18px">Olá, ${primeiroNome}!</h2>
      <p style="font-size:15px;line-height:1.6">
        Recebemos um pedido para redefinir a senha da sua conta na <strong>Conatus Institute</strong>.
        Clique no botão abaixo para criar uma nova senha.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${link}"
           style="background:#0f3d3e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block">
          Redefinir minha senha
        </a>
      </div>
      <p style="font-size:13px;color:#6b7280;line-height:1.6">
        Se o botão não funcionar, copie e cole este endereço no navegador:<br>
        <a href="${link}" style="color:#0f3d3e;word-break:break-all">${link}</a>
      </p>
      <p style="font-size:13px;color:#6b7280">Este link expira em 1 hora.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#9ca3af">
        Se você não solicitou a redefinição, ignore esta mensagem — sua senha permanece a mesma.
      </p>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px">
      © ${new Date().getFullYear()} Conatus Institute. Todos os direitos reservados.
    </p>
  </div>`;
}

/**
 * Envia o e-mail de confirmação de cadastro.
 * @param {{ to: string, nome: string, link: string }} params
 */
async function sendVerificationEmail({ to, nome, link }) {
  const tx = await getTransporter();
  if (!tx) {
    // Sem SMTP configurado: registra o link para permitir testar o fluxo localmente.
    console.warn(`[email] ${configError} Link de confirmação para ${to}: ${link}`);
    throw new Error(configError);
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  await tx.sendMail({
    from: `"Conatus Institute" <${from}>`,
    to,
    subject: 'Confirme seu e-mail — Conatus Institute',
    html: montarHtml(nome, link),
    text:
      `Olá, ${nome}!\n\n` +
      `Confirme seu e-mail para ativar sua conta na Conatus Institute:\n${link}\n\n` +
      `Este link expira em 24 horas. Se você não fez este cadastro, ignore esta mensagem.`,
  });
}

/**
 * Envia o e-mail de redefinição de senha.
 * @param {{ to: string, nome: string, link: string }} params
 */
async function sendPasswordResetEmail({ to, nome, link }) {
  const tx = await getTransporter();
  if (!tx) {
    console.warn(`[email] ${configError} Link de redefinição para ${to}: ${link}`);
    throw new Error(configError);
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  await tx.sendMail({
    from: `"Conatus Institute" <${from}>`,
    to,
    subject: 'Redefinição de senha — Conatus Institute',
    html: montarHtmlReset(nome, link),
    text:
      `Olá, ${nome}!\n\n` +
      `Recebemos um pedido para redefinir a senha da sua conta na Conatus Institute.\n` +
      `Crie uma nova senha por este link:\n${link}\n\n` +
      `Este link expira em 1 hora. Se você não solicitou, ignore esta mensagem.`,
  });
}

function montarHtmlChamado(nome, link, numero, houveResposta) {
  // nome vem de visitante sem conta — é a entrada menos confiável do sistema.
  const primeiroNome = escapeHtml((nome || '').trim().split(/\s+/)[0] || 'você');
  link = escapeHtml(link);
  numero = escapeHtml(numero);
  const texto = houveResposta
    ? 'Nossa equipe respondeu o seu chamado de suporte. Abra a conversa para ler e responder.'
    : 'Recebemos a sua solicitação e nossa equipe já foi avisada. Guarde este e-mail: é por ele que você acompanha e responde o chamado.';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <div style="text-align:center;padding:24px 0">
      <h1 style="color:#0f3d3e;font-size:22px;margin:0">Conatus Institute</h1>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
      <h2 style="margin-top:0;font-size:18px">Olá, ${primeiroNome}!</h2>
      <p style="font-size:15px;line-height:1.6">${texto}</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${link}"
           style="background:#0f3d3e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block">
          Abrir meu chamado
        </a>
      </div>
      <p style="font-size:13px;color:#6b7280;line-height:1.6">
        Se o botão não funcionar, copie e cole este endereço no navegador:<br>
        <a href="${link}" style="color:#0f3d3e;word-break:break-all">${link}</a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#9ca3af">
        Este link dá acesso ao seu chamado — não o compartilhe com outras pessoas.
      </p>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px">
      © ${new Date().getFullYear()} Conatus Institute. Todos os direitos reservados.
    </p>
  </div>`;
}

/**
 * Envia o link de acompanhamento de um chamado aberto por visitante sem conta.
 *
 * É o ÚNICO caminho dele até a resposta: sem login, não há outra forma de voltar
 * à conversa. Por isso o link não expira — um link morto deixaria a pessoa sem
 * resposta e sem recurso.
 *
 * @param {{ to: string, nome: string, link: string, numero: string,
 *           houveResposta?: boolean }} params
 */
async function sendChamadoEmail({ to, nome, link, numero, houveResposta = false }) {
  const tx = await getTransporter();
  if (!tx) {
    // Sem SMTP configurado o link vai para o console: em desenvolvimento é o
    // que permite testar o fluxo do visitante de ponta a ponta.
    console.warn(`[email] ${configError} Link do chamado ${numero} para ${to}: ${link}`);
    throw new Error(configError);
  }

  await tx.sendMail({
    from: fromSuporte(),
    replyTo: MAIL_FROM_SUPORTE,
    to,
    subject: houveResposta
      ? `Resposta no seu chamado ${numero} — Conatus Institute`
      : `Chamado ${numero} recebido — Conatus Institute`,
    html: montarHtmlChamado(nome, link, numero, houveResposta),
    text:
      `Olá, ${nome}!\n\n` +
      (houveResposta
        ? `Nossa equipe respondeu o seu chamado ${numero}.\n`
        : `Recebemos o seu chamado ${numero} e nossa equipe já foi avisada.\n`) +
      `Acompanhe e responda por este link:\n${link}\n\n` +
      `Este link dá acesso ao seu chamado — não o compartilhe.`,
  });
}

// Destino dos avisos internos de novo chamado. Default aponta para a Central de
// Ajuda exibida no rodapé; sobrescreva com SUPORTE_EMAIL no .env se a equipe
// preferir outra caixa.
const SUPORTE_EMAIL = process.env.SUPORTE_EMAIL || 'suporte.ti@conatusprocedures.com';

// Rótulos amigáveis das categorias (espelham src/utils/suporte.js no front).
const CATEGORIA_LABELS = {
  duvida: 'Dúvida',
  problema_tecnico: 'Problema técnico',
  pagamento: 'Pagamento',
  certificados: 'Certificados',
  matriculas: 'Matrículas',
  outros: 'Outros',
};

function montarHtmlNovoChamadoEquipe({ numero, assunto, categoria, mensagem, solicitanteNome, solicitanteEmail, origem, link }) {
  // Todos os campos abaixo vêm do solicitante (inclusive de visitante sem conta),
  // então cada um passa pelo escape antes de entrar no HTML.
  const cat = escapeHtml(CATEGORIA_LABELS[categoria] || categoria || '—');
  numero = escapeHtml(numero);
  assunto = escapeHtml(assunto);
  solicitanteNome = escapeHtml(solicitanteNome || '—');
  solicitanteEmail = escapeHtml(solicitanteEmail || '—');
  const origemLabel = origem === 'visitante' ? 'Visitante (sem conta)' : 'Aluno logado';
  // Prévia da mensagem: recortada para o e-mail não carregar um texto enorme, e
  // com quebras de linha preservadas via <br>.
  const previa = escapeHtml((mensagem || '').slice(0, 600)).replace(/\n/g, '<br>');
  const cortou = (mensagem || '').length > 600 ? '…' : '';
  link = escapeHtml(link);
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
    <div style="text-align:center;padding:24px 0">
      <h1 style="color:#0f3d3e;font-size:22px;margin:0">Conatus Institute — Suporte</h1>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
      <h2 style="margin-top:0;font-size:18px">Novo chamado ${numero}</h2>
      <table style="width:100%;font-size:14px;line-height:1.6;border-collapse:collapse">
        <tr><td style="color:#6b7280;padding:2px 12px 2px 0">Assunto</td><td><strong>${assunto}</strong></td></tr>
        <tr><td style="color:#6b7280;padding:2px 12px 2px 0">Categoria</td><td>${cat}</td></tr>
        <tr><td style="color:#6b7280;padding:2px 12px 2px 0">Solicitante</td><td>${solicitanteNome} &lt;${solicitanteEmail}&gt;</td></tr>
        <tr><td style="color:#6b7280;padding:2px 12px 2px 0">Origem</td><td>${origemLabel}</td></tr>
      </table>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;line-height:1.6">
        ${previa}${cortou}
      </div>
      <div style="text-align:center;margin:28px 0">
        <a href="${link}"
           style="background:#0f3d3e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block">
          Abrir no painel
        </a>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px">
      Aviso automático — um novo chamado foi aberto na plataforma.
    </p>
  </div>`;
}

/**
 * Avisa a equipe de suporte de que um novo chamado foi aberto.
 *
 * É "fire-and-forget" na visão do chamador: o chamado já está gravado quando isto
 * roda, então uma falha de SMTP não pode desfazer a abertura. Por isso a função
 * lança em erro e cabe ao chamador apenas registrar no log, sem devolver erro ao
 * usuário.
 *
 * @param {{ numero: string, assunto: string, categoria: string, mensagem: string,
 *           solicitanteNome: string, solicitanteEmail: string,
 *           origem: 'aluno'|'visitante', link: string }} params
 */
async function sendNovoChamadoEquipe(params) {
  const tx = await getTransporter();
  if (!tx) {
    console.warn(`[email] ${configError} Novo chamado ${params.numero} não notificado à equipe.`);
    throw new Error(configError);
  }

  await tx.sendMail({
    from: fromSuporte(),
    to: SUPORTE_EMAIL,
    // Responder ao aviso escreve direto para quem abriu o chamado.
    replyTo: params.solicitanteEmail || undefined,
    subject: `Novo chamado ${params.numero}: ${params.assunto}`,
    html: montarHtmlNovoChamadoEquipe(params),
    text:
      `Novo chamado ${params.numero} aberto na plataforma.\n\n` +
      `Assunto: ${params.assunto}\n` +
      `Categoria: ${CATEGORIA_LABELS[params.categoria] || params.categoria}\n` +
      `Solicitante: ${params.solicitanteNome} <${params.solicitanteEmail}>\n` +
      `Origem: ${params.origem === 'visitante' ? 'Visitante (sem conta)' : 'Aluno logado'}\n\n` +
      `Mensagem:\n${(params.mensagem || '').slice(0, 600)}\n\n` +
      `Abra no painel: ${params.link}`,
  });
}

function montarHtmlChamadoConfirmacaoAluno(nome, numero, assunto, link) {
  const primeiroNome = escapeHtml((nome || '').trim().split(/\s+/)[0] || 'você');
  numero = escapeHtml(numero);
  assunto = escapeHtml(assunto);
  link = escapeHtml(link);
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <div style="text-align:center;padding:24px 0">
      <h1 style="color:#0f3d3e;font-size:22px;margin:0">Conatus Institute</h1>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:32px">
      <h2 style="margin-top:0;font-size:18px">Olá, ${primeiroNome}!</h2>
      <p style="font-size:15px;line-height:1.6">
        Recebemos o seu chamado <strong>${numero}</strong> — “${assunto}”. Nossa equipe
        já foi avisada e responderá em breve. Você pode acompanhar e responder a
        qualquer momento na plataforma, em <strong>Meus Chamados</strong>.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${link}"
           style="background:#0f3d3e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;display:inline-block">
          Acompanhar meu chamado
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#9ca3af">
        Você recebeu este e-mail porque abriu um chamado na sua conta da Conatus Institute.
      </p>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px">
      © ${new Date().getFullYear()} Conatus Institute. Todos os direitos reservados.
    </p>
  </div>`;
}

/**
 * Confirma ao ALUNO LOGADO a abertura do chamado.
 *
 * Diferente do visitante, ele não recebe link mágico: tem conta e acompanha em
 * "Meus Chamados". Fire-and-forget na visão do chamador — o chamado já existe;
 * falha de SMTP só vira log.
 *
 * @param {{ to: string, nome: string, numero: string, assunto: string, link: string }} params
 */
async function sendChamadoConfirmacaoAluno({ to, nome, numero, assunto, link }) {
  const tx = await getTransporter();
  if (!tx) {
    console.warn(`[email] ${configError} Confirmação do chamado ${numero} não enviada a ${to}.`);
    throw new Error(configError);
  }

  await tx.sendMail({
    from: fromSuporte(),
    replyTo: MAIL_FROM_SUPORTE,
    to,
    subject: `Chamado ${numero} recebido — Conatus Institute`,
    html: montarHtmlChamadoConfirmacaoAluno(nome, numero, assunto, link),
    text:
      `Olá, ${nome}!\n\n` +
      `Recebemos o seu chamado ${numero} — "${assunto}". Nossa equipe já foi avisada ` +
      `e responderá em breve.\n\n` +
      `Acompanhe e responda em Meus Chamados:\n${link}`,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendChamadoEmail,
  sendNovoChamadoEquipe,
  sendChamadoConfirmacaoAluno,
  verificarTransporte,
};
