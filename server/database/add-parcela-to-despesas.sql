-- Adicionar coluna parcela na tabela despesas
ALTER TABLE despesas 
ADD COLUMN IF NOT EXISTS parcela VARCHAR(50);

-- Comentário na coluna
COMMENT ON COLUMN despesas.parcela IS 'Número da parcela (ex: 1/12, 2/12). Apenas para despesas não recorrentes.';







