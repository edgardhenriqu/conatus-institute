-- =====================================================
-- MIGRAÇÃO: Construtor de Cursos Completo - Conatus Institute
-- =====================================================
-- Novas colunas em cursos e aulas + tabelas de avaliação,
-- questões, tentativas e autorizações de acesso.
-- Todas as instruções são idempotentes (IF NOT EXISTS).
-- Obs.: o servidor também executa estas instruções
-- automaticamente no boot (server/db/ensureSchema.js).
-- =====================================================

-- 1. Novas colunas em cursos
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS descricao_curta VARCHAR(300);
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS nivel VARCHAR(20) DEFAULT 'basico';
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'gratuito';
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'rascunho';
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS visivel BOOLEAN DEFAULT true;
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS publico_alvo TEXT;
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS objetivo TEXT;
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS requisitos TEXT;
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS requisitos_certificado TEXT;
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS cert_responsavel VARCHAR(255);
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS cert_texto TEXT;
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Cursos pré-existentes (seeds 1-3) ficam publicados e gratuitos
UPDATE cursos SET status = 'publicado' WHERE status = 'rascunho' AND id IN (1, 2, 3);
UPDATE cursos SET tipo = 'gratuito' WHERE tipo IS NULL AND id IN (1, 2, 3);

-- 2. Novas colunas em aulas
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS tipo_conteudo VARCHAR(20) DEFAULT 'texto';
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS material_url VARCHAR(500);
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS duracao_minutos INTEGER;
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS obrigatoria BOOLEAN DEFAULT true;

-- 3. Configuração da avaliação final (uma por curso)
CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER UNIQUE NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    num_questoes INTEGER NOT NULL DEFAULT 10,
    nota_minima INTEGER NOT NULL DEFAULT 80,
    max_tentativas INTEGER NOT NULL DEFAULT 3,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Banco de questões por curso
CREATE TABLE IF NOT EXISTS questoes (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    enunciado TEXT NOT NULL,
    alternativas JSONB NOT NULL,
    correta INTEGER NOT NULL,
    explicacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questoes_curso ON questoes(curso_id);

-- 5. Tentativas de avaliação dos alunos
CREATE TABLE IF NOT EXISTS tentativas_avaliacao (
    id SERIAL PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    nota INTEGER NOT NULL,
    aprovado BOOLEAN NOT NULL DEFAULT false,
    respostas JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tentativas_aluno_curso ON tentativas_avaliacao(aluno_id, curso_id);

-- 6. Autorizações de acesso a cursos internos
CREATE TABLE IF NOT EXISTS curso_autorizacoes (
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (curso_id, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_autorizacoes_aluno ON curso_autorizacoes(aluno_id);
