/*
 * Verifica conexão + autenticação do e-mail (OAuth2 ou básico) via mailer, e
 * opcionalmente envia um e-mail de teste.
 *   node scripts/testSmtp.js [destino]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { verificarTransporte, sendChamadoConfirmacaoAluno } = require('../src/email/mailer');

(async () => {
  const oauth = Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.MICROSOFT_TENANT_ID);
  console.log('Modo:', oauth ? 'OAuth2 (Microsoft 365)' : 'básico (usuário+senha)');
  console.log('SMTP_USER:', process.env.SMTP_USER, '| host:', process.env.SMTP_HOST || 'smtp.office365.com');

  try {
    const info = await verificarTransporte();
    console.log(`\n✅ verify() OK — ${info.modo}. Conexão e autenticação aceitas.`);
  } catch (e) {
    console.error('\n❌ verify() falhou:', e.message);
    process.exit(1);
  }

  const to = process.argv[2] || 'edigarhenriqu@gmail.com';
  try {
    await sendChamadoConfirmacaoAluno({
      to,
      nome: 'Edgard Henrique',
      numero: '#TESTE',
      assunto: '[TESTE] Autenticação OAuth2 do e-mail',
      link: `${(process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')}/suporte`,
    });
    console.log(`\n✅ Enviado para ${to}. Confira o inbox e o campo "De".`);
  } catch (e) {
    console.error('\n❌ Envio falhou:', e.message);
    process.exit(1);
  }
})();
