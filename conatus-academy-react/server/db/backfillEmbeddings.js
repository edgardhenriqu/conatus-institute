/**
 * Indexa (ou reindexa) o conteúdo de TODAS as aulas para o assistente RAG.
 * Rode uma vez após criar a tabela aula_chunks; seguro repetir (indexAula
 * apaga os pedaços antigos de cada aula antes de reinserir).
 *
 *   cd conatus-academy-react/server && node db/backfillEmbeddings.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const pool = require('./connection');
const ensureSchema = require('./ensureSchema');
const { indexAula } = require('../src/services/ragIndex');

(async () => {
  await ensureSchema(); // garante que aula_chunks exista

  const { rows: aulas } = await pool.query(
    `SELECT a.id, a.titulo, a.descricao, a.conteudo, m.curso_id
       FROM aulas a JOIN modulos m ON m.id = a.modulo_id
      ORDER BY a.id`,
  );
  console.log(`${aulas.length} aulas encontradas. Indexando...`);

  let indexadas = 0, vazias = 0, erros = 0, totalChunks = 0;
  for (const aula of aulas) {
    try {
      const n = await indexAula(aula);
      if (n > 0) { indexadas++; totalChunks += n; } else { vazias++; }
      process.stdout.write(
        `\r  aula ${aula.id} → ${n} pedaços | ok=${indexadas} vazias=${vazias} erros=${erros}      `,
      );
    } catch (e) {
      erros++;
      console.error(`\n  ERRO na aula ${aula.id}: ${e.message}`);
    }
  }

  console.log(
    `\nConcluído: ${indexadas} aulas indexadas (${totalChunks} pedaços), ` +
    `${vazias} sem texto, ${erros} erros.`,
  );
  await pool.end();
})().catch((e) => {
  console.error('Backfill falhou:', e);
  process.exit(1);
});
