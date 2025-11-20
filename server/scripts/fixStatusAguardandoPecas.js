import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Criar pool de conexões para o script
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function fixStatusAguardandoPecas() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando correção de status "Aguardando peça" para "Aguardando Peças"...');
    
    // Primeiro, listar todos os status que contêm "aguardando" para debug
    const allStatusCheck = await client.query(
      `SELECT DISTINCT status, COUNT(*) as quantidade
       FROM ordens_servico
       WHERE LOWER(status) LIKE '%aguardando%'
       GROUP BY status
       ORDER BY status`
    );
    
    if (allStatusCheck.rows.length > 0) {
      console.log('\n🔍 Status encontrados com "aguardando":');
      allStatusCheck.rows.forEach(row => {
        console.log(`   - "${row.status}": ${row.quantidade} registro(s)`);
      });
    }
    
    // Verificar quantos registros precisam ser corrigidos
    const checkResult = await client.query(
      `SELECT COUNT(*) as count FROM ordens_servico WHERE LOWER(TRIM(status)) = 'aguardando peça'`
    );
    const countToFix = parseInt(checkResult.rows[0].count);
    console.log(`\n📊 Registros encontrados para corrigir: ${countToFix}`);
    
    // Mostrar registros que serão corrigidos
    if (countToFix > 0) {
      const recordsToFix = await client.query(
        `SELECT id, codigo, status FROM ordens_servico WHERE LOWER(TRIM(status)) = 'aguardando peça'`
      );
      console.log('\n📝 Registros que serão corrigidos:');
      recordsToFix.rows.forEach(row => {
        console.log(`   - ID ${row.id}: ${row.codigo} (status atual: "${row.status}")`);
      });
    }
    
    if (countToFix === 0) {
      console.log('✅ Nenhum registro precisa ser corrigido.');
      return;
    }
    
    // Atualizar registros (usando LOWER e TRIM para garantir que pegue todas as variações)
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE ordens_servico 
       SET status = 'Aguardando Peças' 
       WHERE LOWER(TRIM(status)) = 'aguardando peça'`
    );
    await client.query('COMMIT');
    
    console.log(`✅ ${result.rowCount} registro(s) atualizado(s) com sucesso!`);
    
    // Verificar status únicos após a correção
    const statusResult = await client.query(
      `SELECT DISTINCT status, COUNT(*) as quantidade
       FROM ordens_servico
       GROUP BY status
       ORDER BY status`
    );
    
    console.log('\n📋 Status únicos na tabela ordens_servico:');
    statusResult.rows.forEach(row => {
      console.log(`   - ${row.status}: ${row.quantidade} registro(s)`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao corrigir status:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

fixStatusAguardandoPecas();

