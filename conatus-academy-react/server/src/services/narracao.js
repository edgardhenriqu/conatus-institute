/**
 * Narração dos blocos marcados com o megafone no conteúdo da aula.
 *
 * O QUE MARCA UM BLOCO PARA NARRAÇÃO
 * O instrutor anexa a imagem do megafone (o emoji-figura) no parágrafo que quer
 * narrado. Reconhecemos essa imagem pelo CONTEÚDO (md5 dos bytes), não pelo nome
 * do arquivo: o mesmo megafone já foi enviado 12 vezes com nomes diferentes
 * (image-1783973027465.png, image-1783974382829.png, …), porque cada upload gera
 * um nome novo. Pelo hash, todas as cópias — inclusive as futuras — são
 * reconhecidas sem ninguém precisar cadastrar nada.
 * O caractere 📢 também vale como marcação, para quem preferir digitar.
 *
 * FLUXO
 * HTML do Quill → blocos marcados → roteiro falado escrito por LLM → áudio
 * sintetizado → aula_narracoes. Roda ao salvar a aula no admin, em segundo plano,
 * como o índice do RAG.
 *
 * Guardamos o ÁUDIO, não só o texto: a voz é a mesma para todos os alunos, e não
 * a voz do sistema de cada máquina (ver tts/). Sem provedor de voz configurado,
 * ou se a síntese falhar, a linha fica sem áudio e o player volta à voz do
 * navegador.
 * Guardamos também o src da imagem (img_src) — é como o player encontra o <img>
 * no HTML renderizado para transformá-lo no botão de ouvir.
 */
const crypto = require('crypto');
const pool = require('../../db/connection');
const { generate } = require('./ragChat');
const { stripHtml } = require('./ragIndex');
const { ttsAtivo, sintetizar, assinaturaVoz } = require('./tts');

// md5 dos bytes da imagem do megafone. Um megafone diferente (outro arquivo,
// outra compressão) não bate — daí a lista, e a variável de ambiente para
// registrar um novo sem mexer no código.
const MD5_MEGAFONE = new Set(
  (process.env.NARRACAO_MARCADOR_MD5 || '32f375edf188092a260b404d268a7927')
    .split(',').map((h) => h.trim().toLowerCase()).filter(Boolean),
);

const MEGAFONE_EMOJI = /\u{1F4E2}\u{FE0F}?/u;

// Tags que fecham um "bloco" no HTML do Quill. Cortar por elas dá a lista de
// parágrafos/itens na ordem do conteúdo, sem parser de DOM no servidor.
const FIM_DE_BLOCO = /<\/(?:p|li|h[1-6]|blockquote|div|td|th|pre)>/i;

const hash = (texto) => crypto.createHash('sha256').update(texto).digest('hex').slice(0, 64);

const srcsDoBloco = (html) =>
  [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);

// Nome do arquivo em arquivos_upload a partir do src gravado pelo editor
// ("/api/uploads/courses/xxx.png" → "xxx.png").
const nomeArquivo = (src) => src.split('/').pop().split('?')[0];

/** Dos srcs informados, quais são a imagem do megafone (comparação por md5). */
async function srcsMarcadores(srcs) {
  if (!srcs.length || !MD5_MEGAFONE.size) return new Set();

  const porNome = new Map(srcs.map((src) => [nomeArquivo(src), src]));
  const { rows } = await pool.query(
    `SELECT nome, md5(dados) AS md5 FROM arquivos_upload WHERE nome = ANY($1::text[])`,
    [[...porNome.keys()]],
  );

  return new Set(
    rows.filter((r) => MD5_MEGAFONE.has(r.md5.toLowerCase()))
        .map((r) => porNome.get(r.nome)),
  );
}

/**
 * Blocos do HTML marcados para narração, na ordem do conteúdo.
 * Devolve [{ ordem, texto, imgSrc }] — texto sem HTML e sem o emoji; imgSrc é a
 * imagem do megafone daquele bloco (null quando a marcação foi o emoji digitado).
 */
async function extrairBlocosNarrados(html) {
  if (!html) return [];

  const blocos = html.split(FIM_DE_BLOCO);
  const marcadores = await srcsMarcadores(blocos.flatMap(srcsDoBloco));

  const saida = [];
  for (const bloco of blocos) {
    const imgSrc = srcsDoBloco(bloco).find((src) => marcadores.has(src)) || null;
    const texto = stripHtml(bloco);
    const temEmoji = MEGAFONE_EMOJI.test(texto);
    if (!imgSrc && !temEmoji) continue;

    const limpo = texto.replace(new RegExp(MEGAFONE_EMOJI, 'gu'), '').trim();
    if (!limpo) continue;   // bloco só com a imagem, sem texto: não há o que narrar

    saida.push({ ordem: saida.length, texto: limpo, imgSrc });
  }
  return saida;
}

// As regras do roteiro moram aqui, não no player: o que muda a fala é o texto.
const SYSTEM = `Você é um instrutor experiente narrando um trecho de aula para alunos adultos.
Receberá o TEXTO de um bloco do material e devolverá o ROTEIRO FALADO desse bloco.

Regras:
- Explique o conteúdo como um instrutor faria em voz alta. Não leia palavra por palavra.
- Preserve 100% do significado técnico. NÃO acrescente nenhuma informação que não esteja no texto.
- Mantenha os termos técnicos exatamente como estão. Não os simplifique nem os traduza.
- Linguagem profissional, objetiva e didática, em português do Brasil.
- Escreva em frases curtas e completas, uma ideia por frase: o player faz uma pausa entre as frases.
- Duração alvo: aproximadamente 140 a 160 palavras por minuto de fala. Seja conciso — o roteiro
  deve ter mais ou menos o mesmo tamanho do texto original, nunca o dobro.
- O aluno está vendo o material na tela enquanto ouve. NÃO anuncie títulos, não descreva imagens,
  não diga "neste slide" nem "como você pode ver".
- Não use marcadores, listas, emojis, asteriscos ou qualquer marcação. Devolva apenas o texto
  corrido a ser falado, nada mais — sem preâmbulo e sem comentários seus.`;

async function gerarRoteiro(texto, tituloAula) {
  const prompt = `AULA: ${tituloAula || '(sem título)'}\n\nTEXTO DO BLOCO:\n${texto}`;
  const roteiro = (await generate({ system: SYSTEM, prompt })).trim();
  if (!roteiro) throw new Error('Roteiro de narração vazio.');
  return roteiro;
}

/**
 * Grava o áudio do trecho, se ele ainda não existir na voz configurada hoje.
 *
 * `atual` é a linha que já estava no banco com o MESMO roteiro (ou null, quando o
 * roteiro acabou de ser reescrito e o áudio velho já foi zerado).
 *
 * Falha de síntese não derruba a sincronização: o roteiro já está salvo, e sem
 * áudio o aluno ouve pela voz do navegador. Na próxima vez que a aula for salva,
 * o áudio continua faltando e tentamos de novo.
 */
async function garantirAudio(aulaId, ordem, roteiro) {
  if (!ttsAtivo()) return;

  try {
    const { dados, mime, assinatura } = await sintetizar(roteiro);
    await pool.query(
      `UPDATE aula_narracoes SET audio = $3, audio_mime = $4, audio_voz = $5
        WHERE aula_id = $1 AND ordem = $2`,
      [aulaId, ordem, dados, mime, assinatura],
    );
  } catch (e) {
    console.error(`[Narração] Falha ao sintetizar áudio (aula ${aulaId}, trecho ${ordem}):`, e.message);
  }
}

/**
 * Sincroniza as narrações de uma aula com o conteúdo atual.
 * Idempotente: gera só os blocos novos/alterados e descarta os que sumiram.
 * Devolve quantos blocos narrados a aula tem agora.
 */
async function sincronizarNarracoes(aulaId) {
  const { rows } = await pool.query('SELECT id, titulo, conteudo FROM aulas WHERE id = $1', [aulaId]);
  const aula = rows[0];
  if (!aula) return 0;

  const blocos = await extrairBlocosNarrados(aula.conteudo);

  // Sem megafone no conteúdo: a aula não tem narração (e perde a que tinha).
  if (blocos.length === 0) {
    await pool.query('DELETE FROM aula_narracoes WHERE aula_id = $1', [aulaId]);
    return 0;
  }

  const atuais = await pool.query(
    `SELECT ordem, origem_hash, roteiro, audio_voz, (audio IS NOT NULL) AS tem_audio
       FROM aula_narracoes WHERE aula_id = $1`, [aulaId]);
  const porOrdem = new Map(atuais.rows.map((r) => [r.ordem, r]));

  for (const { ordem, texto, imgSrc } of blocos) {
    const h = hash(texto);
    const atual = porOrdem.get(ordem);
    const intacto = atual?.origem_hash === h;

    // Bloco intacto: aproveita o roteiro, mas atualiza o img_src — o instrutor
    // pode ter trocado a figura do megafone sem tocar no texto.
    if (intacto) {
      await pool.query('UPDATE aula_narracoes SET img_src = $3 WHERE aula_id = $1 AND ordem = $2',
        [aulaId, ordem, imgSrc]);

      // O áudio pode faltar mesmo com o roteiro intacto: aula narrada antes de o
      // ElevenLabs existir aqui, síntese que falhou, ou voz trocada no .env.
      const gravado = atual.tem_audio && atual.audio_voz === assinaturaVoz();
      if (!gravado) await garantirAudio(aulaId, ordem, atual.roteiro);
      continue;
    }

    const roteiro = await gerarRoteiro(texto, aula.titulo);

    // Roteiro novo, áudio velho fala outra coisa: zeramos as três colunas na
    // mesma escrita do roteiro. Entre este INSERT e a síntese o trecho fica sem
    // áudio — e é isso que queremos, porque o player prefere a voz do navegador
    // a falar um texto que não é mais o da aula.
    await pool.query(
      `INSERT INTO aula_narracoes (aula_id, ordem, origem_hash, texto_origem, roteiro, img_src)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (aula_id, ordem)
       DO UPDATE SET origem_hash = EXCLUDED.origem_hash,
                     texto_origem = EXCLUDED.texto_origem,
                     roteiro = EXCLUDED.roteiro,
                     img_src = EXCLUDED.img_src,
                     audio = NULL,
                     audio_mime = NULL,
                     audio_voz = NULL,
                     created_at = CURRENT_TIMESTAMP`,
      [aulaId, ordem, h, texto, roteiro, imgSrc],
    );

    await garantirAudio(aulaId, ordem, roteiro);
  }

  // O instrutor pode ter removido megafones: sobra linha com ordem alta.
  await pool.query('DELETE FROM aula_narracoes WHERE aula_id = $1 AND ordem >= $2',
    [aulaId, blocos.length]);

  return blocos.length;
}

module.exports = { extrairBlocosNarrados, sincronizarNarracoes, gerarRoteiro, MD5_MEGAFONE };
