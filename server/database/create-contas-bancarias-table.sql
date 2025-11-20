-- Criar tabela de contas bancárias / provedores
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id SERIAL PRIMARY KEY,
  nome_conta VARCHAR(100) NOT NULL,
  provedor VARCHAR(50) NOT NULL,
  nome_provedor VARCHAR(100) NOT NULL,
  access_token TEXT NOT NULL, -- Criptografado
  public_key TEXT NOT NULL, -- Criptografado
  client_id VARCHAR(100),
  client_secret VARCHAR(100),
  webhook_url TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_provedor ON contas_bancarias(provedor);
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_ativo ON contas_bancarias(ativo);
