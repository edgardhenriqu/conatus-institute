/**
 * Voz da narração: síntese de fala no servidor.
 *
 * A narração das aulas nasceu falada pelo navegador (Web Speech API). A voz do
 * navegador é grátis, mas é a voz do SISTEMA do aluno: muda de máquina para
 * máquina, às vezes não existe em pt-BR, e soa robótica. Aqui o áudio é gerado
 * uma vez, no servidor, e todo aluno ouve exatamente a mesma voz.
 *
 * O áudio é sintetizado AO SALVAR A AULA (ver ../narracao.js) e guardado no
 * banco, junto do roteiro. Não sintetizamos a cada play: síntese custa (dinheiro
 * ou quota), e o mesmo trecho é ouvido por muitos alunos.
 *
 * DOIS PROVEDORES, MESMO CONTRATO — { nome, ativo(), assinatura(), sintetizar() }:
 *   elevenlabs  voz melhor e vozes pt-BR nativas; exige assinatura paga
 *   gemini      grátis, mas o free tier só permite 10 sínteses POR DIA
 * Hoje a plataforma usa o elevenlabs (TTS_PROVIDER no .env). O gemini fica como
 * alternativa viável: se a assinatura cair, é uma variável de ambiente e uma
 * rodada de scripts/gerarAudioNarracoes.js — nada mais na plataforma sabe quem
 * sintetizou o áudio.
 *
 * Sem provedor configurado o serviço fica desligado e a narração continua pela
 * voz do navegador: a plataforma não pode ficar sem narração por falta de chave.
 */
const gemini = require('./gemini');
const elevenlabs = require('./elevenlabs');

const PROVEDORES = { gemini, elevenlabs };

const escolhido = (process.env.TTS_PROVIDER || 'elevenlabs').trim().toLowerCase();
const provedor = PROVEDORES[escolhido];

if (!provedor) {
  // Erro de digitação em TTS_PROVIDER cairia silenciosamente na voz do navegador
  // e ninguém entenderia por que as aulas pararam de ganhar áudio.
  throw new Error(
    `TTS_PROVIDER inválido: "${escolhido}". Use um de: ${Object.keys(PROVEDORES).join(', ')}.`,
  );
}

/** Há chave (e voz) configurada? Sem isso, o áudio não é gerado. */
const ttsAtivo = () => provedor.ativo();

/**
 * Identidade do áudio gravado. Vai para a coluna audio_voz: quando alguém troca
 * a voz, o modelo ou o provedor, a assinatura muda e os áudios são regerados no
 * próximo salvamento da aula — sem isso, a aula ficaria com metade dos trechos
 * numa voz e metade na outra. O nome do provedor entra na assinatura justamente
 * para que trocar de provedor invalide o que já estava gravado.
 */
const assinaturaVoz = () => `${provedor.nome}:${provedor.assinatura()}`;

/**
 * Sintetiza um roteiro. Devolve { dados: Buffer, mime, assinatura }.
 * Lança em caso de falha — quem chama decide o que fazer (ver ../narracao.js).
 */
async function sintetizar(texto) {
  if (!ttsAtivo()) {
    throw new Error(`Provedor de voz "${provedor.nome}" não configurado (ver .env).`);
  }

  const roteiro = (texto || '').trim();
  if (!roteiro) throw new Error('Roteiro vazio.');

  const { dados, mime } = await provedor.sintetizar(roteiro);
  if (!dados?.length) throw new Error(`${provedor.nome} devolveu áudio vazio.`);

  return { dados, mime, assinatura: assinaturaVoz() };
}

module.exports = { ttsAtivo, sintetizar, assinaturaVoz, provedor: provedor.nome };
