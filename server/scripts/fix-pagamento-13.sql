-- Script para corrigir o pagamento ID 13
-- Alterar parcelas para NULL (à vista), status para 'pago' e valor_pago

UPDATE pagamentos 
SET 
  parcelas = NULL,
  status = 'pago',
  data_pagamento = CURRENT_DATE,
  valor_pago = valor_total,
  atualizado_em = NOW()
WHERE id = 13;

-- Verificar se foi atualizado
SELECT id, ordem_id, forma_pagamento, parcelas, status, data_pagamento, valor_total, valor_pago
FROM pagamentos 
WHERE id = 13;

