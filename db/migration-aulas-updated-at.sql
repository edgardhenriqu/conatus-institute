-- Corrige a edição de aulas.
-- O UPDATE em /admin/aulas/:id faz `SET updated_at = CURRENT_TIMESTAMP`,
-- mas a tabela `aulas` criada pelo init.sql não tinha essa coluna,
-- causando erro 500 ("Erro ao salvar aula") ao tentar editar uma aula já criada.

ALTER TABLE aulas
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
