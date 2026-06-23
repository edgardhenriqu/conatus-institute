-- Adiciona o perfil Instrutor: coluna instrutor_id em cursos

-- 1. Adiciona instrutor_id na tabela cursos
ALTER TABLE cursos
  ADD COLUMN IF NOT EXISTS instrutor_id UUID REFERENCES alunos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cursos_instrutor ON cursos(instrutor_id);

-- 2. Garante que o role 'instrutor' seja aceito (não há CHECK constraint no schema atual, mas registra a intenção)
-- O controle de roles válidos é feito no middleware da aplicação.
