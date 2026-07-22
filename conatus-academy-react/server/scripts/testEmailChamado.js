/*
 * Teste manual do aviso de novo chamado à equipe.
 * Chama a MESMA função que a abertura de chamado dispara, usando o SMTP real do
 * .env. NÃO toca no banco: exercita só o caminho de e-mail.
 *
 *   node scripts/testEmailChamado.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { sendNovoChamadoEquipe } = require('../src/email/mailer');

(async () => {
  const destino = process.env.SUPORTE_EMAIL || 'suporte.ti@conatusprocedures.com (default)';
  console.log('SMTP_HOST:', process.env.SMTP_HOST, '| SMTP_USER:', process.env.SMTP_USER);
  console.log('Destino do aviso (SUPORTE_EMAIL):', destino);
  try {
    await sendNovoChamadoEquipe({
      numero: '#TESTE',
      assunto: '[TESTE] Verificação do aviso de novo chamado',
      categoria: 'duvida',
      mensagem: 'Este é um e-mail de TESTE disparado manualmente para confirmar que a equipe é avisada quando um chamado é aberto. Se você recebeu esta mensagem, o fluxo está funcionando.',
      solicitanteNome: 'Teste Conatus',
      solicitanteEmail: 'edigarhenriqu@gmail.com',
      origem: 'aluno',
      link: `${(process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')}/admin/suporte/0`,
    });
    console.log('\n✅ SMTP aceitou e enviou o aviso. Confira o inbox de', destino);
  } catch (e) {
    console.error('\n❌ Falhou ao enviar:', e.message);
    process.exit(1);
  }
})();
