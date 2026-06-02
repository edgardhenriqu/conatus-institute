-- Migration: Adicionar campo role e criar usuário admin
-- Execute este script no banco de dados PostgreSQL

-- 1. Adicionar coluna role se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alunos' AND column_name = 'role') THEN
        ALTER TABLE alunos ADD COLUMN role VARCHAR(20) DEFAULT 'aluno';
    END IF;
END $$;

-- 2. Adicionar coluna ativo se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alunos' AND column_name = 'ativo') THEN
        ALTER TABLE alunos ADD COLUMN ativo BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Criar índice para role se não existir
CREATE INDEX IF NOT EXISTS idx_alunos_role ON alunos(role);

-- 4. Criar usuário admin (senha: admin123 com bcrypt hash)
-- Hash bcrypt de 'admin123' com salt rounds 10
INSERT INTO alunos (nome, email, senha, cpf, data_nascimento, role, ativo)
VALUES (
    'Administrador',
    'admin@conatus.com',
    '$2b$10$NsOYeDZWD2hGmGPLU0PHQ.z/zR8LmoIlkRf5/gciPgw/7iTg8//W2',
    '000.000.000-00',
    '1990-01-01',
    'admin',
    true
)
ON CONFLICT (email) DO NOTHING;
