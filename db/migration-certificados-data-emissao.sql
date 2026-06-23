-- Adiciona coluna data_emissao na tabela certificados
ALTER TABLE certificados
    ADD COLUMN IF NOT EXISTS data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Preenche registros existentes com o valor de created_at
UPDATE certificados SET data_emissao = created_at WHERE data_emissao IS NULL;
