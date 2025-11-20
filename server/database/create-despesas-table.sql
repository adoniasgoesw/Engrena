-- Criar tabela de despesas
CREATE TABLE IF NOT EXISTS despesas (
  id SERIAL PRIMARY KEY,
  estabelecimento_id INTEGER NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'fixa', 'fisica', 'alimentar', 'outros'
  categoria VARCHAR(100) NOT NULL, -- 'aluguel', 'luz', 'agua', 'salario', 'outros'
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  funcionario_id INTEGER, -- Para despesas de salário
  recorrente BOOLEAN DEFAULT false, -- Se é despesa recorrente (todo mês)
  data_vencimento DATE,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'Pendente', -- 'Pendente', 'Pago', 'Vencido'
  mes_referencia INTEGER, -- Mês da despesa (1-12)
  ano_referencia INTEGER, -- Ano da despesa
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_estabelecimento FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  CONSTRAINT fk_funcionario FOREIGN KEY (funcionario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_despesas_estabelecimento_id ON despesas(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_despesas_mes_ano ON despesas(mes_referencia, ano_referencia);
CREATE INDEX IF NOT EXISTS idx_despesas_status ON despesas(status);
CREATE INDEX IF NOT EXISTS idx_despesas_tipo ON despesas(tipo);
CREATE INDEX IF NOT EXISTS idx_despesas_data_vencimento ON despesas(data_vencimento);







