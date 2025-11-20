-- Criar tabela de movimentações do caixa
CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
  id SERIAL PRIMARY KEY,
  caixa_id INTEGER NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_caixa FOREIGN KEY (caixa_id) REFERENCES caixas(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa_id ON movimentacoes_caixa(caixa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_criado_em ON movimentacoes_caixa(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_caixa(tipo);


















