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
  // empresa (texto livre, opcional) — informada pelo aluno no cadastro; é o
  // empregador declarado, NÃO confundir com empresa_id (vínculo com empresa
  // parceira usado no controle de acesso a cursos).
  `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS empresa VARCHAR(150)`,
  // cargo (texto livre) — informado pelo aluno no cadastro (função/posição
  // que ocupa na empresa declarada). Nasce NULL para contas já existentes.
  `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cargo VARCHAR(120)`,
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
  // ordem de exibição das alternativas por questão na tentativa (embaralhamento):
  // { questaoId: [origIdx por posição] } — usada para a revisão mostrar a mesma
  // ordem que o aluno viu. Nulo em tentativas antigas (cai na ordem canônica).
  `ALTER TABLE tentativas_avaliacao ADD COLUMN IF NOT EXISTS ordens JSONB`,
  // autorizações de cursos internos
  `CREATE TABLE IF NOT EXISTS curso_autorizacoes (
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (curso_id, aluno_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_autorizacoes_aluno ON curso_autorizacoes(aluno_id)`,

  // ── Controle de acesso a cursos (público / restrito / pago) ─────────────────
  // Substitui o antigo conceito de "tipo" (gratuito/interno/pago) por um modelo
  // escalável: modo de acesso no curso + regras cumulativas (funcionários,
  // empresas parceiras, usuários específicos). Ver server/src/services/accessControl.js.

  // Fabricantes / empresas parceiras (sem ENUM — cadastráveis em runtime)
  `CREATE TABLE IF NOT EXISTS empresas (
    id     SERIAL PRIMARY KEY,
    nome   VARCHAR(120) NOT NULL,
    slug   VARCHAR(60) UNIQUE NOT NULL,
    ativo  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // vínculo usuário → empresa (um aluno pode pertencer a um fabricante parceiro)
  `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS idx_alunos_empresa ON alunos(empresa_id)`,
  // modo de acesso do curso — 'publico' | 'restrito' | 'pago'
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS acesso VARCHAR(20) DEFAULT 'publico'`,
  // regras de liberação (heterogêneas; discriminador = tipo)
  `CREATE TABLE IF NOT EXISTS curso_acesso_regras (
    id         SERIAL PRIMARY KEY,
    curso_id   INTEGER NOT NULL REFERENCES cursos(id)   ON DELETE CASCADE,
    tipo       VARCHAR(20) NOT NULL,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
    aluno_id   UUID    REFERENCES alunos(id)   ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT regra_coerente CHECK (
      (tipo = 'funcionarios' AND empresa_id IS NULL AND aluno_id IS NULL) OR
      (tipo = 'empresa'      AND empresa_id IS NOT NULL AND aluno_id IS NULL) OR
      (tipo = 'usuario'      AND aluno_id  IS NOT NULL AND empresa_id IS NULL)
    )
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_regra_func    ON curso_acesso_regras(curso_id)             WHERE tipo = 'funcionarios'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_regra_empresa ON curso_acesso_regras(curso_id, empresa_id) WHERE tipo = 'empresa'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_regra_usuario ON curso_acesso_regras(curso_id, aluno_id)   WHERE tipo = 'usuario'`,
  `CREATE INDEX IF NOT EXISTS idx_regras_curso ON curso_acesso_regras(curso_id)`,

  // Seed dos fabricantes parceiros
  `INSERT INTO empresas (nome, slug) VALUES
     ('Huawei','huawei'),('Vertiv','vertiv'),('Schneider','schneider'),
     ('Delta','delta'),('Cummins','cummins')
   ON CONFLICT (slug) DO NOTHING`,

  // Migração retrocompatível 'tipo' (legado) → 'acesso' + regras.
  // É ONE-SHOT: guardada por uma flag para nunca reprocessar em boots futuros
  // (assim edições posteriores de acesso/tipo jamais são revertidas).
  //   gratuito → publico | interno → restrito + regra 'funcionarios' | pago → pago
  `CREATE TABLE IF NOT EXISTS schema_flags (
    chave VARCHAR(60) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `UPDATE cursos SET acesso = 'restrito'
    WHERE tipo = 'interno' AND acesso = 'publico'
      AND NOT EXISTS (SELECT 1 FROM schema_flags WHERE chave = 'acesso_migrado')`,
  `UPDATE cursos SET acesso = 'pago'
    WHERE tipo = 'pago' AND acesso = 'publico'
      AND NOT EXISTS (SELECT 1 FROM schema_flags WHERE chave = 'acesso_migrado')`,
  `INSERT INTO curso_acesso_regras (curso_id, tipo)
   SELECT id, 'funcionarios' FROM cursos
    WHERE tipo = 'interno'
      AND NOT EXISTS (SELECT 1 FROM schema_flags WHERE chave = 'acesso_migrado')
   ON CONFLICT DO NOTHING`,
  `INSERT INTO curso_acesso_regras (curso_id, tipo, aluno_id)
   SELECT curso_id, 'usuario', aluno_id FROM curso_autorizacoes
    WHERE NOT EXISTS (SELECT 1 FROM schema_flags WHERE chave = 'acesso_migrado')
   ON CONFLICT DO NOTHING`,
  `INSERT INTO schema_flags (chave) VALUES ('acesso_migrado') ON CONFLICT DO NOTHING`,
  // admin@conatus.com é o superadmin: único perfil que pode alterar cargos
  `UPDATE alunos SET role = 'superadmin' WHERE email = 'admin@conatus.com' AND role != 'superadmin'`,
  // Diretor — topo absoluto da hierarquia, acima do superadmin. Exclusivo do
  // Giovanni Henrique da Silva, fixado por e-mail e reaplicado a cada boot.
  // Aplica-se assim que a conta com esse e-mail existir.
  `UPDATE alunos SET role = 'diretor' WHERE email = 'giovanni.silva@conatusprocedures.com' AND role != 'diretor'`,
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
  // imagens enviadas pelo construtor de cursos (capas, imagens de aula, assinatura).
  // Ficam no banco — e não no disco — porque o filesystem do Replit é efêmero e
  // não é compartilhado com o ambiente local: um arquivo salvo em disco num
  // ambiente aparecia "quebrado" no outro. O nome carrega timestamp (imutável),
  // o que permite cache agressivo na rota que serve esses arquivos.
  `CREATE TABLE IF NOT EXISTS arquivos_upload (
    nome VARCHAR(255) PRIMARY KEY,
    mime VARCHAR(60) NOT NULL,
    dados BYTEA NOT NULL,
    tamanho INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // ── Assistente RAG (busca semântica sobre o conteúdo das aulas) ─────────────
  // pgvector no Supabase (extensão no schema public — verificado). Cada aula é
  // quebrada em pedaços de texto; o assistente busca os trechos mais próximos
  // da pergunta, escopados por curso. Ver server/src/services/ragIndex.js.
  // A dimensão 768 casa com outputDimensionality do gemini-embedding-001 e fica
  // dentro do limite de índice do pgvector (~2000).
  `CREATE EXTENSION IF NOT EXISTS vector`,
  `CREATE TABLE IF NOT EXISTS aula_chunks (
    id SERIAL PRIMARY KEY,
    aula_id   INTEGER NOT NULL REFERENCES aulas(id)  ON DELETE CASCADE,
    curso_id  INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    ordem     INTEGER NOT NULL,
    texto     TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_aula_chunks_curso ON aula_chunks(curso_id)`,
  `CREATE INDEX IF NOT EXISTS idx_aula_chunks_aula ON aula_chunks(aula_id)`,
  `CREATE INDEX IF NOT EXISTS idx_aula_chunks_vec
     ON aula_chunks USING hnsw (embedding vector_cosine_ops)`,

  // ── Narração dos blocos marcados com 📢 ────────────────────────────────────
  // Cada bloco do conteúdo da aula que contém o megafone vira um roteiro falado,
  // reescrito por LLM ao salvar a aula (ver services/narracao.js). Guardamos o
  // roteiro, não áudio: quem fala é o navegador do aluno (Web Speech API).
  // origem_hash é o hash do texto do bloco — se o instrutor não mexeu naquele
  // bloco, não regeramos o roteiro (economiza chamada de LLM a cada salvamento).
  `CREATE TABLE IF NOT EXISTS aula_narracoes (
    id SERIAL PRIMARY KEY,
    aula_id     INTEGER NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
    ordem       INTEGER NOT NULL,
    origem_hash VARCHAR(64) NOT NULL,
    texto_origem TEXT NOT NULL,
    roteiro     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (aula_id, ordem)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_aula_narracoes_aula ON aula_narracoes(aula_id)`,
  // src da imagem do megafone que dispara este trecho. É por ele que o player
  // acha o <img> no HTML já renderizado e o transforma em botão de ouvir.
  `ALTER TABLE aula_narracoes ADD COLUMN IF NOT EXISTS img_src TEXT`,
];

async function ensureSchema() {
  for (const sql of STATEMENTS) {
    await pool.query(sql);
  }
  console.log('Schema do construtor de cursos verificado/atualizado.');
}

module.exports = ensureSchema;
