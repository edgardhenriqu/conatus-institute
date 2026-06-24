require('dotenv').config({ path: '.env' });
const pool = require('./server/db/connection');

async function test() {
  try {
    const c = await pool.query('SELECT id, nome FROM cursos WHERE nome ILIKE \'%Fundamentos de Procedimentos Operacionais%\'');
    console.log('Cursos:', c.rows);
    if (c.rows.length > 0) {
      const id = c.rows[0].id;
      const a = await pool.query('SELECT * FROM avaliacoes WHERE curso_id = $1', [id]);
      console.log('Avaliacao:', a.rows);
      const q = await pool.query('SELECT count(*) as total FROM questoes WHERE curso_id = $1', [id]);
      console.log('Questoes:', q.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
