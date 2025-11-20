-- Criar tabela de despesas fixas
CREATE TABLE IF NOT EXISTS despesas_fixas (
  id SERIAL PRIMARY KEY,
  estabelecimento_id INTEGER NOT NULL,
  usuario_id INTEGER,
  categoria VARCHAR(100) NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  parcela_atual INTEGER,
  total_parcelas INTEGER,
  data_vencimento DATE,
  data_pagamento DATE,
  recorrente BOOLEAN DEFAULT false,
  descricao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_estabelecimento_despesa_fixa FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  CONSTRAINT fk_usuario_despesa_fixa FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_estabelecimento_id ON despesas_fixas(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_usuario_id ON despesas_fixas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_data_vencimento ON despesas_fixas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_recorrente ON despesas_fixas(recorrente);







