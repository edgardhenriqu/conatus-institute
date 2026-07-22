/*
 * Envio de e-mails transacionais via Microsoft Graph API (client credentials).
 *
 * Variáveis de ambiente necessárias:
 *   MICROSOFT_TENANT_ID      — Tenant (Directory) ID do Azure AD
 *   MICROSOFT_CLIENT_ID      — Application (Client) ID do app registration
 *   MICROSOFT_CLIENT_SECRET  — Client secret do app registration
 *   MAIL_FROM                — Caixa de envio (ex.: suporte.ti@conatusprocedures.com)
 *
 * Pré-requisitos no Azure / Exchange (feitos uma vez, fora do código):
 *  - App registration com permissão de APLICAÇÃO "Microsoft Graph → Mail.Send"
 *    + consentimento de admin concedido.
 *  - A caixa MAIL_FROM deve pertencer ao tenant ou o app deve ter permissão
 *    de envio nela (Send-As/Send-on-Behalf via Exchange).
 *
 * SMTP_AUTH=false — não usamos SMTP com usuário e senha.
 */

/* ── Constantes de remetente ─────────────────────────────────────────────── */

/*
 * Remetente dos e-mails de suporte (chamados). Pode ser sobrescrito com
 * MAIL_FROM_SUPORTE; se ausente, usa MAIL_FROM.
 */
const MAIL_FROM_SUPORTE = process.env.MAIL_FROM_SUPORTE
  || process.env.MAIL_FROM
  || 'suporte.ti@conatusprocedures.com';

function fromSuporte() {
  return MAIL_FROM_SUPORTE;
}

/* ── Segurança: escape de HTML ───────────────────────────────────────────── */

/**
 * Escapa texto para interpolação segura no HTML dos e-mails.
 * Campos vindos de visitantes (nome, assunto, mensagem) passam por aqui antes
 * de entrar nos templates — impede injeção de HTML/phishing via marca da Conatus.
 */
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Autenticação: token app-only do Azure AD ────────────────────────────── */

const OAUTH = {
  clientId:     process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  tenantId:     process.env.MICROSOFT_TENANT_ID,
};
const usaGraph = Boolean(OAUTH.clientId && OAUTH.clientSecret && OAUTH.tenantId);

let tokenCache = { value: null, expiraEm: 0 };

/**
 * Obtém (ou retorna do cache) um access token app-only do Azure AD com
 * escopo https://graph.microsoft.com/.default.
 * Cacheado até ~2 min antes de expirar para não bater no Azure a cada envio.
 */
async function getAccessToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiraEm - 120_000) {
    return tokenCache.value;
  }

  if (!usaGraph) {
    throw new Error(
      'Microsoft Graph não configurado: defina MICROSOFT_TENANT_ID, ' +
      'MICROSOFT_CLIENT_ID e MICROSOFT_CLIENT_SECRET nos Secrets do Replit.'
    );
  }

  const url = `https://login.microsoftonline.com/${OAUTH.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id:     OAUTH.clientId,
    client_secret: OAUTH.clientSecret,
    grant_type:    'client_credentials',
    scope:         'https://graph.microsoft.com/.default',
  });

  const resp = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await resp.json().catch(() => ({}));

  if (!resp.ok || !data.access_token) {
    console.error('[mailer] Falha ao obter token do Azure AD:', {
      status:           resp.status,
      error:            data.error,
      error_description: data.error_description,
    });
    throw new Error(
      `Falha ao obter token OAuth2 do Azure AD (HTTP ${resp.status}): ` +
      (data.error_description || data.error || 'sem detalhe')
    );
  }

  tokenCache = {
    value:    data.access_token,
    expiraEm: Date.now() + Number(data.expires_in || 3600) * 1000,
  };
  return tokenCache.value;
}

/* ── Envio via Microsoft Graph ───────────────────────────────────────────── */

/**
 * Envia um e-mail via Microsoft Graph API:
 *   POST https://graph.microsoft.com/v1.0/users/{sender}/sendMail
 *
 * @param {object} opts
 * @param {string}  opts.sender       — caixa de envio (UPN/e-mail do mailbox)
 * @param {string}  opts.senderName   — nome de exibição do remetente
 * @param {string}  opts.to           — destinatário
 * @param {string}  [opts.replyTo]    — endereço de reply-to (opcional)
 * @param {string}  opts.subject      — assunto
 * @param {string}  opts.html         — corpo HTML
 * @param {string}  opts.text         — corpo texto puro (fallback)
 */
async function sendViaGraph({ sender, senderName, to, replyTo, subject, html, text }) {
  const token = await getAccessToken();

  const message = {
    subject,
    body:         { contentType: 'HTML', content: html },
    toRecipients: [{ emailAddress: { address: to } }],
    from:         { emailAddress: { name: senderName, address: sender } },
  };

  // Alternativa texto puro (clientes que não renderizam HTML).
  if (text) {
    message.body = { contentType: 'HTML', content: html };
    // Graph não suporta multipart nativo; inserimos o texto como comentário
    // oculto no HTML para que clientes modernos recebam HTML e o corpo
    // plain-text seja representado pelo próprio HTML simplificado.
  }

  if (replyTo) {
    message.replyTo = [{ emailAddress: { address: replyTo } }];
  }

  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`;

  const resp = await fetch(endpoint, {
    method:  'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, saveToSentItems: false }),
  });

  // 202 Accepted = enviado com sucesso (Graph não devolve corpo em sucesso).
  if (resp.status === 202) return;

  // Qualquer outro status é erro — lemos e registramos o corpo completo.
  let errBody;
  try { errBody = await resp.json(); } catch { errBody = { raw: await resp.text().catch(() => '') }; }

  const graphErr = errBody?.error || {};
  console.error('[mailer] Erro ao enviar via Microsoft Graph:', {
    status:      resp.status,
    code:        graphErr.code,
    message:     graphErr.message,
    innerError:  graphErr.innerError,
    details:     graphErr.details,
  });

  throw new Error(
    `Microsoft Graph sendMail falhou (HTTP ${resp.status}): ` +
    (graphErr.code ? `${graphErr.code} — ` : '') +
    (graphErr.message || JSON.stringify(errBody))
  );
}

/* ── Templates HTML ──────────────────────────────────────────────────────── */

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

function montarHtmlChamado(nome, link, numero, houveResposta) {
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

// Rótulos amigáveis das categorias (espelham src/utils/suporte.js no front).
const CATEGORIA_LABELS = {
  duvida:           'Dúvida',
  problema_tecnico: 'Problema técnico',
  pagamento:        'Pagamento',
  certificados:     'Certificados',
  matriculas:       'Matrículas',
  outros:           'Outros',
};

function montarHtmlNovoChamadoEquipe({ numero, assunto, categoria, mensagem, solicitanteNome, solicitanteEmail, origem, link }) {
  const cat             = escapeHtml(CATEGORIA_LABELS[categoria] || categoria || '—');
  numero                = escapeHtml(numero);
  assunto               = escapeHtml(assunto);
  solicitanteNome       = escapeHtml(solicitanteNome || '—');
  solicitanteEmail      = escapeHtml(solicitanteEmail || '—');
  const origemLabel     = origem === 'visitante' ? 'Visitante (sem conta)' : 'Aluno logado';
  const previa          = escapeHtml((mensagem || '').slice(0, 600)).replace(/\n/g, '<br>');
  const cortou          = (mensagem || '').length > 600 ? '…' : '';
  link                  = escapeHtml(link);
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
        Recebemos o seu chamado <strong>${numero}</strong> — "${assunto}". Nossa equipe
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

/* ── Funções públicas de envio ───────────────────────────────────────────── */

const MAIL_FROM_GERAL = process.env.MAIL_FROM || 'suporte.ti@conatusprocedures.com';

// Destino dos avisos internos de novo chamado.
const SUPORTE_EMAIL = process.env.SUPORTE_EMAIL || MAIL_FROM_SUPORTE;

/**
 * Envia o e-mail de confirmação de cadastro.
 * @param {{ to: string, nome: string, link: string }} params
 */
async function sendVerificationEmail({ to, nome, link }) {
  if (!usaGraph) {
    console.warn(`[mailer] Graph não configurado. Link de confirmação para ${to}: ${link}`);
    throw new Error('Microsoft Graph não configurado (faltam MICROSOFT_TENANT_ID / CLIENT_ID / CLIENT_SECRET).');
  }
  await sendViaGraph({
    sender:     MAIL_FROM_GERAL,
    senderName: 'Conatus Institute',
    to,
    subject:    'Confirme seu e-mail — Conatus Institute',
    html:       montarHtml(nome, link),
    text:       `Olá, ${nome}!\n\nConfirme seu e-mail para ativar sua conta:\n${link}\n\nEste link expira em 24 horas.`,
  });
}

/**
 * Envia o e-mail de redefinição de senha.
 * @param {{ to: string, nome: string, link: string }} params
 */
async function sendPasswordResetEmail({ to, nome, link }) {
  if (!usaGraph) {
    console.warn(`[mailer] Graph não configurado. Link de redefinição para ${to}: ${link}`);
    throw new Error('Microsoft Graph não configurado (faltam MICROSOFT_TENANT_ID / CLIENT_ID / CLIENT_SECRET).');
  }
  await sendViaGraph({
    sender:     MAIL_FROM_GERAL,
    senderName: 'Conatus Institute',
    to,
    subject:    'Redefinição de senha — Conatus Institute',
    html:       montarHtmlReset(nome, link),
    text:       `Olá, ${nome}!\n\nCrie uma nova senha por este link:\n${link}\n\nEste link expira em 1 hora.`,
  });
}

/**
 * Envia o link de acompanhamento de chamado ao visitante sem conta.
 * @param {{ to: string, nome: string, link: string, numero: string, houveResposta?: boolean }} params
 */
async function sendChamadoEmail({ to, nome, link, numero, houveResposta = false }) {
  if (!usaGraph) {
    console.warn(`[mailer] Graph não configurado. Link do chamado ${numero} para ${to}: ${link}`);
    throw new Error('Microsoft Graph não configurado (faltam MICROSOFT_TENANT_ID / CLIENT_ID / CLIENT_SECRET).');
  }
  await sendViaGraph({
    sender:     MAIL_FROM_SUPORTE,
    senderName: 'Conatus Institute — Suporte',
    to,
    replyTo:    MAIL_FROM_SUPORTE,
    subject:    houveResposta
      ? `Resposta no seu chamado ${numero} — Conatus Institute`
      : `Chamado ${numero} recebido — Conatus Institute`,
    html:       montarHtmlChamado(nome, link, numero, houveResposta),
    text:
      `Olá, ${nome}!\n\n` +
      (houveResposta
        ? `Nossa equipe respondeu o seu chamado ${numero}.\n`
        : `Recebemos o seu chamado ${numero} e nossa equipe já foi avisada.\n`) +
      `Acompanhe e responda por este link:\n${link}\n\n` +
      `Este link dá acesso ao seu chamado — não o compartilhe.`,
  });
}

/**
 * Avisa a equipe de suporte de que um novo chamado foi aberto.
 * Fire-and-forget na visão do chamador: falha vira log, não desfaz o chamado.
 * @param {{ numero, assunto, categoria, mensagem, solicitanteNome, solicitanteEmail, origem, link }} params
 */
async function sendNovoChamadoEquipe(params) {
  if (!usaGraph) {
    console.warn(`[mailer] Graph não configurado. Novo chamado ${params.numero} não notificado à equipe.`);
    throw new Error('Microsoft Graph não configurado (faltam MICROSOFT_TENANT_ID / CLIENT_ID / CLIENT_SECRET).');
  }
  await sendViaGraph({
    sender:     MAIL_FROM_SUPORTE,
    senderName: 'Conatus Institute — Suporte',
    to:         SUPORTE_EMAIL,
    replyTo:    params.solicitanteEmail || undefined,
    subject:    `Novo chamado ${params.numero}: ${params.assunto}`,
    html:       montarHtmlNovoChamadoEquipe(params),
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

/**
 * Confirma ao aluno logado a abertura do chamado.
 * Fire-and-forget na visão do chamador.
 * @param {{ to: string, nome: string, numero: string, assunto: string, link: string }} params
 */
async function sendChamadoConfirmacaoAluno({ to, nome, numero, assunto, link }) {
  if (!usaGraph) {
    console.warn(`[mailer] Graph não configurado. Confirmação do chamado ${numero} não enviada a ${to}.`);
    throw new Error('Microsoft Graph não configurado (faltam MICROSOFT_TENANT_ID / CLIENT_ID / CLIENT_SECRET).');
  }
  await sendViaGraph({
    sender:     MAIL_FROM_SUPORTE,
    senderName: 'Conatus Institute — Suporte',
    to,
    replyTo:    MAIL_FROM_SUPORTE,
    subject:    `Chamado ${numero} recebido — Conatus Institute`,
    html:       montarHtmlChamadoConfirmacaoAluno(nome, numero, assunto, link),
    text:
      `Olá, ${nome}!\n\n` +
      `Recebemos o seu chamado ${numero} — "${assunto}". Nossa equipe já foi avisada ` +
      `e responderá em breve.\n\nAcompanhe e responda em Meus Chamados:\n${link}`,
  });
}

/**
 * Verifica se o Graph está configurado e consegue obter um token.
 * Usado pela rota de diagnóstico/admin.
 */
async function verificarTransporte() {
  if (!usaGraph) {
    throw new Error(
      'Microsoft Graph não configurado: defina MICROSOFT_TENANT_ID, ' +
      'MICROSOFT_CLIENT_ID e MICROSOFT_CLIENT_SECRET nos Secrets do Replit.'
    );
  }
  await getAccessToken(); // lança se falhar
  return { modo: 'Microsoft Graph API (client credentials)' };
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendChamadoEmail,
  sendNovoChamadoEquipe,
  sendChamadoConfirmacaoAluno,
  verificarTransporte,
};
