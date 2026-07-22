/*
 * Teste manual da confirmação de abertura de chamado ao ALUNO.
 * Usa o SMTP real do .env e NÃO toca no banco.
 *   node scripts/testEmailConfirmacaoAluno.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { sendChamadoConfirmacaoAluno } = require('../src/email/mailer');

(async () => {
  const to = process.argv[2] || 'edigarhenriqu@gmail.com';
  console.log('SMTP_USER (autentica):', process.env.SMTP_USER);
  console.log('MAIL_FROM_SUPORTE (De desejado):', process.env.MAIL_FROM_SUPORTE || 'suporte.ti@conatusprocedures.com (default)');
  console.log('Enviando confirmação para:', to);
  try {
    await sendChamadoConfirmacaoAluno({
      to,
      nome: 'Edgard Henrique',
      numero: '#TESTE',
      assunto: '[TESTE] Confirmação de abertura de chamado',
      link: `${(process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')}/suporte`,
    });
    console.log('\n✅ SMTP aceitou e enviou. Confira o inbox de', to, '— olhe o campo "De".');
  } catch (e) {
    console.error('\n❌ Falhou:', e.message);
    process.exit(1);
  }
})();
