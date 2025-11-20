# Instruções para Adicionar Campos de Desconto, Acréscimo e Juros

## Problema
A tabela `pagamentos` não possui os campos `desconto`, `acrescimo` e `juros_percentual` necessários para o funcionamento completo dos boletos.

## Solução

Execute o seguinte SQL no seu banco de dados PostgreSQL (Neon, Supabase, ou local):

```sql
ALTER TABLE pagamentos 
ADD COLUMN IF NOT EXISTS desconto NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS acrescimo NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS juros_percentual NUMERIC(5, 2) DEFAULT 0;
```

## Como executar

### Opção 1: Via SQL Editor do Neon/Supabase
1. Acesse o painel do seu banco de dados (Neon ou Supabase)
2. Abra o SQL Editor
3. Cole o SQL acima
4. Execute o comando

### Opção 2: Via psql (linha de comando)
```bash
psql -h seu-host -U seu-usuario -d seu-database -f server/scripts/add-campos-boleto.sql
```

### Opção 3: Via script Node.js (quando o servidor estiver rodando)
```bash
node server/scripts/add-campos-boleto.js
```

## Verificação

Após executar, verifique se as colunas foram adicionadas:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'pagamentos' 
AND column_name IN ('desconto', 'acrescimo', 'juros_percentual');
```

Você deve ver 3 linhas retornadas com os campos adicionados.



