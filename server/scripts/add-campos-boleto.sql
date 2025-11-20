-- Script para adicionar campos de desconto, acréscimo e juros na tabela pagamentos
-- Execute este script no seu banco de dados PostgreSQL

ALTER TABLE pagamentos 
ADD COLUMN IF NOT EXISTS desconto NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS acrescimo NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS juros_percentual NUMERIC(5, 2) DEFAULT 0;

-- Comentários sobre os campos
COMMENT ON COLUMN pagamentos.desconto IS 'Valor do desconto aplicado no pagamento';
COMMENT ON COLUMN pagamentos.acrescimo IS 'Valor do acréscimo aplicado no pagamento';
COMMENT ON COLUMN pagamentos.juros_percentual IS 'Percentual de juros ao dia aplicado após o vencimento';



