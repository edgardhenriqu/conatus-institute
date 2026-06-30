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
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS cert_assinatura TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  // perfil instrutor — instrutor_id em cursos (db/migration-instrutor.sql)
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS instrutor_id UUID REFERENCES alunos(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS idx_cursos_instrutor ON cursos(instrutor_id)`,
  // seeds existentes ficam publicados
  `UPDATE cursos SET status = 'publicado' WHERE status = 'rascunho' AND id IN (1, 2, 3)`,
  // aulas — novos campos
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS descricao TEXT`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS tipo_conteudo VARCHAR(20) DEFAULT 'texto'`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS video_url VARCHAR(500)`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS material_url VARCHAR(500)`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS duracao_minutos INTEGER`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS obrigatoria BOOLEAN DEFAULT true`,
  // updated_at em aulas — sem ela o UPDATE de edição de aula dá erro 500
  // (db/migration-aulas-updated-at.sql)
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  // updated_at em alunos — sem ela o UPDATE de edição de aluno (admin) dá erro 500
  `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  // updated_at em matriculas — sem ela o salvar progresso (recalcularProgresso) dá erro 500
  `ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
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
  // verificação de e-mail no cadastro.
  // A coluna nasce com DEFAULT true para que contas JÁ existentes não sejam
  // bloqueadas; em seguida o default vira false, de modo que apenas novos
  // cadastros (feitos pela aplicação) comecem como "não verificados".
  `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE alunos ALTER COLUMN email_verificado SET DEFAULT false`,
  // tokens de confirmação de e-mail (apenas o hash é armazenado)
  `CREATE TABLE IF NOT EXISTS email_verificacoes (
    id SERIAL PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_email_verif_hash ON email_verificacoes(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_email_verif_aluno ON email_verificacoes(aluno_id)`,
  // tokens de redefinição de senha (apenas o hash é armazenado)
  `CREATE TABLE IF NOT EXISTS senha_resets (
    id SERIAL PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_senha_reset_hash ON senha_resets(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_senha_reset_aluno ON senha_resets(aluno_id)`,
  // histórico de senhas (hashes) para impedir reutilização das últimas senhas
  `CREATE TABLE IF NOT EXISTS senha_historico (
    id SERIAL PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    senha_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_senha_hist_aluno ON senha_historico(aluno_id)`,
  // data de emissão dos certificados (db/migration-certificados-data-emissao.sql)
  `ALTER TABLE certificados ADD COLUMN IF NOT EXISTS data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  `UPDATE certificados SET data_emissao = created_at WHERE data_emissao IS NULL`,
];

async function ensureSchema() {
  for (const sql of STATEMENTS) {
    await pool.query(sql);
  }
  console.log('Schema do construtor de cursos verificado/atualizado.');
}

module.exports = ensureSchema;
