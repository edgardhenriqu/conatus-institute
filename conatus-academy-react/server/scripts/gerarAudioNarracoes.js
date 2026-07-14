/**
 * Gera o áudio dos trechos narrados que ainda não têm — as aulas narradas antes
 * de a voz existir aqui, as sínteses que falharam, e os trechos gravados com uma
 * voz (ou provedor) que não é mais o configurado.
 *
 *   cd server && node scripts/gerarAudioNarracoes.js              # gera o que falta
 *   cd server && node scripts/gerarAudioNarracoes.js --dry        # só relata
 *   cd server && node scripts/gerarAudioNarracoes.js --aula 131,132   # só estas aulas
 *
 * O --aula existe para não gastar a cota do dia de uma vez: dá para ouvir a voz
 * em algumas aulas antes de mandar gerar o resto.
 *
 * No dia a dia isso não é necessário: salvar a aula no admin já sincroniza a
 * narração (services/narracao.js). O script existe para NÃO precisar reabrir e
 * salvar dezenas de aulas antigas uma a uma.
 *
 * É seguro rodar de novo: só toca nos trechos sem áudio na voz atual. Sintetizar
 * consome quota (ou créditos, no ElevenLabs) — o --dry mostra o tamanho da conta
 * antes de você pagá-la.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const pool = require('../db/connection');
const { ttsAtivo, sintetizar, assinaturaVoz, provedor } = require('../src/services/tts');

const SECO = process.argv.includes('--dry');

// --aula 131,132 → [131, 132]; sem a flag, lista vazia = todas as aulas.
const posAula = process.argv.indexOf('--aula');
const AULAS = posAula === -1 ? [] : (process.argv[posAula + 1] || '')
  .split(',')
  .map((n) => Number(n.trim()))
  .filter(Number.isInteger);

async function main() {
  if (!ttsAtivo()) {
    console.error(`Provedor de voz "${provedor}" não configurado — verifique o .env.`);
    console.error('  gemini      → GEMINI_API_KEY');
    console.error('  elevenlabs  → ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID');
    process.exit(1);
  }

  const voz = assinaturaVoz();

  // IS DISTINCT FROM (e não <>) porque audio_voz é NULL nas linhas antigas, e
  // NULL <> 'x' não é verdadeiro — as linhas antigas ficariam de fora.
  // O segundo termo do AND some quando não há --aula (lista vazia = todas).
  const { rows } = await pool.query(
    `SELECT n.aula_id, n.ordem, n.roteiro, a.titulo
       FROM aula_narracoes n
       JOIN aulas a ON a.id = n.aula_id
      WHERE (n.audio IS NULL OR n.audio_voz IS DISTINCT FROM $1)
        AND ($2::int[] = '{}' OR n.aula_id = ANY($2::int[]))
      ORDER BY n.aula_id, n.ordem`,
    [voz, AULAS],
  );

  if (!rows.length) {
    console.log(`Nada a fazer: todos os trechos já têm áudio na voz ${voz}.`);
    return;
  }

  const caracteres = rows.reduce((soma, r) => soma + r.roteiro.length, 0);
  console.log(`${rows.length} trecho(s) sem áudio na voz ${voz} — ~${caracteres} caracteres a sintetizar.`);
  if (SECO) return console.log('(--dry: nada foi gerado)');

  let ok = 0;
  let falhas = 0;
  let cotaEsgotada = false;

  // Sequencial, de propósito: a API tem limite de requisições simultâneas, e o
  // script não tem pressa — quem espera é o admin, não o aluno.
  for (const { aula_id: aulaId, ordem, roteiro, titulo } of rows) {
    try {
      const { dados, mime, assinatura } = await sintetizar(roteiro);
      await pool.query(
        `UPDATE aula_narracoes SET audio = $3, audio_mime = $4, audio_voz = $5
          WHERE aula_id = $1 AND ordem = $2`,
        [aulaId, ordem, dados, mime, assinatura],
      );
      ok += 1;
      console.log(`  ✓ aula ${aulaId} (${titulo}) · trecho ${ordem} — ${(dados.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      // Cota DIÁRIA estourada (o free tier do Gemini dá 10 sínteses por dia):
      // insistir só rende uma enxurrada de 429 e esconde o que já deu certo.
      // Paramos aqui — o que falta continua faltando, e amanhã o script pega
      // exatamente de onde parou.
      if (/PerDay|RESOURCE_EXHAUSTED|quota/i.test(e.message)) {
        cotaEsgotada = true;
        break;
      }
      falhas += 1;
      console.error(`  ✗ aula ${aulaId} · trecho ${ordem}: ${e.message}`);
    }
  }

  console.log(`\nConcluído: ${ok} gerado(s), ${falhas} falha(s).`);

  if (cotaEsgotada) {
    const restam = rows.length - ok - falhas;
    console.log(`\nCota do provedor esgotada — ${restam} trecho(s) ficaram sem áudio.`);
    console.log('Eles continuam narrados pela voz do navegador. Rode o script de novo');
    console.log('quando a cota renovar (no free tier do Gemini, no dia seguinte).');
  } else if (falhas) {
    console.log('Rode de novo para tentar os que falharam.');
  }
}

main()
  .catch((e) => {
    console.error('Falha:', e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
