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

function getTransporter() {
  if (transporter || configError) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  console.log('DEBUG SMTP:', { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: !!SMTP_PASS });
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    configError = 'SMTP não configurado (defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS no .env).';
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true' || Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function montarHtml(nome, link) {
  const primeiroNome = (nome || '').trim().split(/\s+/)[0] || 'aluno(a)';
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
  const primeiroNome = (nome || '').trim().split(/\s+/)[0] || 'aluno(a)';
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
  const tx = getTransporter();
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
  const tx = getTransporter();
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

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
