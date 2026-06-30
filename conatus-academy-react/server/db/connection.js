const { Pool } = require('pg');

// SSL é exigido por bancos gerenciados (ex.: Supabase). Em dev/Docker local
// deixe DB_SSL ausente/false. Em produção (Supabase) use DB_SSL=true.
//
// Por segurança, a verificação do certificado fica ATIVADA por padrão. Como o
// certificado do Supabase é assinado por uma CA própria, baixe o CA em
// Project Settings → Database → "SSL Configuration" e aponte DB_SSL_CA para o
// arquivo .crt. Sem o CA, defina DB_SSL_NO_VERIFY=true apenas em ambiente de
// confiança (rede privada/teste) — isso desativa a verificação e expõe a MITM.
const fs = require('fs');
const path = require('path');

// Raiz do app (conatus-academy-react), onde fica o .env e o supabase-ca.crt.
// Resolver o CA contra essa base evita ENOENT quando o node é iniciado de
// dentro de server/ (cwd = server) com DB_SSL_CA relativo.
const APP_ROOT = path.join(__dirname, '..', '..');

function buildSsl() {
  if (process.env.DB_SSL !== 'true') return false;
  if (process.env.DB_SSL_CA) {
    const caPath = path.isAbsolute(process.env.DB_SSL_CA)
      ? process.env.DB_SSL_CA
      : path.resolve(APP_ROOT, process.env.DB_SSL_CA);
    return { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true };
  }
  if (process.env.DB_SSL_NO_VERIFY === 'true') {
    return { rejectUnauthorized: false };
  }
  return { rejectUnauthorized: true };
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: '-c client_encoding=UTF8',
  ssl: buildSsl()
});

pool.on('connect', () => {
  console.log('Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Erro na conexão com o banco:', err);
  process.exit(1);
});

module.exports = pool;
