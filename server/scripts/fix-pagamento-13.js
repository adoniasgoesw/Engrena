import pool from '../config/db.js';

async function corrigirPagamento13() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Corrigindo pagamento ID 13...');
    
    await client.query('BEGIN');
    
    // Verificar se o pagamento existe
    const checkResult = await client.query(
      'SELECT id, forma_pagamento, parcelas, status FROM pagamentos WHERE id = $1',
      [13]
    );
    
    if (checkResult.rows.length === 0) {
      console.log('❌ Pagamento ID 13 não encontrado');
      await client.query('ROLLBACK');
      return;
    }
    
    const pagamento = checkResult.rows[0];
    console.log('📋 Pagamento atual:', pagamento);
    
    // Atualizar pagamento
    const updateResult = await client.query(
      `UPDATE pagamentos 
       SET 
         parcelas = NULL,
         status = 'pago',
         data_pagamento = CURRENT_DATE,
         valor_pago = valor_total,
         atualizado_em = NOW()
       WHERE id = $1
       RETURNING *`,
      [13]
    );
    
    await client.query('COMMIT');
    
    console.log('✅ Pagamento ID 13 atualizado com sucesso!');
    console.log('📋 Novo estado:', {
      id: updateResult.rows[0].id,
      forma_pagamento: updateResult.rows[0].forma_pagamento,
      parcelas: updateResult.rows[0].parcelas,
      status: updateResult.rows[0].status,
      data_pagamento: updateResult.rows[0].data_pagamento,
      valor_total: updateResult.rows[0].valor_total,
      valor_pago: updateResult.rows[0].valor_pago
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao corrigir pagamento:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar
corrigirPagamento13()
  .then(() => {
    console.log('✅ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro ao executar script:', error);
    process.exit(1);
  });

