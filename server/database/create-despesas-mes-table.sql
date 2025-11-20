-- Criar tabela de gastos do mês
CREATE TABLE IF NOT EXISTS despesas_mes (
  id SERIAL PRIMARY KEY,
  estabelecimento_id INTEGER NOT NULL,
  nome_gasto VARCHAR(150) NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data_gasto DATE NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_estabelecimento_mes FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_despesas_mes_estabelecimento_id ON despesas_mes(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_despesas_mes_data_gasto ON despesas_mes(data_gasto);






