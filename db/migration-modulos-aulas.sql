-- =====================================================
-- MIGRAÇÃO: Tabelas de Módulos e Aulas - Conatus Institute
-- =====================================================
-- Execute este script no banco de dados PostgreSQL
-- para criar as tabelas de módulos e aulas dos cursos
-- =====================================================

-- 1. Criar tabela de módulos
CREATE TABLE IF NOT EXISTS modulos (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_modulos_curso ON modulos(curso_id);
RAISE NOTICE 'Tabela modulos verificada/criada';

-- 2. Criar tabela de aulas
CREATE TABLE IF NOT EXISTS aulas (
    id SERIAL PRIMARY KEY,
    modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aulas_modulo ON aulas(modulo_id);
RAISE NOTICE 'Tabela aulas verificada/criada';

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA COM SUCESSO
-- =====================================================
-- Tabelas criadas:
-- - modulos (id, curso_id, titulo, descricao, ordem)
-- - aulas (id, modulo_id, titulo, conteudo, ordem)
-- =====================================================