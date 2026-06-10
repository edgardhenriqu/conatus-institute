-- =====================================================
-- MIGRAÇÃO: Adiciona ON DELETE CASCADE nas FKs de alunos
-- =====================================================
-- Execute no banco PostgreSQL (via psql ou cliente):
--   \i db/migration-cascade-delete.sql
-- OU via Docker:
--   docker exec -i <container> psql -U postgres -d conatus < db/migration-cascade-delete.sql
-- =====================================================

BEGIN;

-- matriculas.aluno_id → ON DELETE CASCADE
ALTER TABLE matriculas
  DROP CONSTRAINT IF EXISTS matriculas_aluno_id_fkey;

ALTER TABLE matriculas
  ADD CONSTRAINT matriculas_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE;

-- certificados.aluno_id → ON DELETE CASCADE
ALTER TABLE certificados
  DROP CONSTRAINT IF EXISTS certificados_aluno_id_fkey;

ALTER TABLE certificados
  ADD CONSTRAINT certificados_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE;

-- progresso_aulas.aluno_id → ON DELETE CASCADE
ALTER TABLE progresso_aulas
  DROP CONSTRAINT IF EXISTS progresso_aulas_aluno_id_fkey;

ALTER TABLE progresso_aulas
  ADD CONSTRAINT progresso_aulas_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE;

COMMIT;
