/**
 * Migra uploads antigos do disco (server/uploads/courses) para a tabela
 * arquivos_upload. Executado no boot — idempotente: só insere o que ainda
 * não existe no banco. Motivo: o disco do Replit é efêmero e não é
 * compartilhado com o ambiente local; o banco é a única fonte durável.
 */
const fs = require('fs');
const path = require('path');
const pool = require('./connection');

const DIR = path.join(__dirname, '..', 'uploads', 'courses');
const MIMES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

async function migrateUploads() {
  if (!fs.existsSync(DIR)) return;
  for (const nome of fs.readdirSync(DIR)) {
    const mime = MIMES[path.extname(nome).toLowerCase()];
    if (!mime) continue;
    // Checa antes de ler para não carregar arquivos grandes à toa a cada boot.
    const existe = await pool.query('SELECT 1 FROM arquivos_upload WHERE nome = $1', [nome]);
    if (existe.rows.length) continue;
    const dados = fs.readFileSync(path.join(DIR, nome));
    await pool.query(
      `INSERT INTO arquivos_upload (nome, mime, dados, tamanho)
       VALUES ($1, $2, $3, $4) ON CONFLICT (nome) DO NOTHING`,
      [nome, mime, dados, dados.length]
    );
    console.log(`Upload migrado do disco para o banco: ${nome}`);
  }
}

module.exports = migrateUploads;
