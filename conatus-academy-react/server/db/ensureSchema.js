/**
 * Garante que o schema do construtor de cursos exista.
 * Executado no boot do servidor — todas as instruções são idempotentes,
 * espelhando db/migration-curso-builder.sql.
 */
const pool = require('./connection');

const STATEMENTS = [
  // cursos — novos campos
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS descricao_curta VARCHAR(300)`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS categoria VARCHAR(100)`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS nivel VARCHAR(20) DEFAULT 'basico'`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'gratuito'`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'rascunho'`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS visivel BOOLEAN DEFAULT true`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS publico_alvo TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS objetivo TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS requisitos TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS requisitos_certificado TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS cert_responsavel VARCHAR(255)`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS cert_texto TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  // seeds existentes ficam publicados
  `UPDATE cursos SET status = 'publicado' WHERE status = 'rascunho' AND id IN (1, 2, 3)`,
  // aulas — novos campos
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS descricao TEXT`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS tipo_conteudo VARCHAR(20) DEFAULT 'texto'`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS video_url VARCHAR(500)`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS material_url VARCHAR(500)`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS duracao_minutos INTEGER`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS obrigatoria BOOLEAN DEFAULT true`,
  // avaliação (config por curso)
  `CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER UNIQUE NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    num_questoes INTEGER NOT NULL DEFAULT 10,
    nota_minima INTEGER NOT NULL DEFAULT 80,
    max_tentativas INTEGER NOT NULL DEFAULT 3,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // questões
  `CREATE TABLE IF NOT EXISTS questoes (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    enunciado TEXT NOT NULL,
    alternativas JSONB NOT NULL,
    correta INTEGER NOT NULL,
    explicacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_questoes_curso ON questoes(curso_id)`,
  // tentativas
  `CREATE TABLE IF NOT EXISTS tentativas_avaliacao (
    id SERIAL PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    nota INTEGER NOT NULL,
    aprovado BOOLEAN NOT NULL DEFAULT false,
    respostas JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tentativas_aluno_curso ON tentativas_avaliacao(aluno_id, curso_id)`,
  // autorizações de cursos internos
  `CREATE TABLE IF NOT EXISTS curso_autorizacoes (
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (curso_id, aluno_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_autorizacoes_aluno ON curso_autorizacoes(aluno_id)`,
  // admin@conatus.com é o superadmin: único perfil que pode alterar cargos
  `UPDATE alunos SET role = 'superadmin' WHERE email = 'admin@conatus.com' AND role != 'superadmin'`,
];

async function ensureSchema() {
  for (const sql of STATEMENTS) {
    await pool.query(sql);
  }
  console.log('Schema do construtor de cursos verificado/atualizado.');
}

module.exports = ensureSchema;
