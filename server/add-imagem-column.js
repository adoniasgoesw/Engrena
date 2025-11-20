import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addImagemColumn() {
  const client = await pool.connect();

  try {
    console.log('🔧 Adicionando coluna "imagem" na tabela "itens"...');

    // Verificar se a coluna já existe
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'itens' 
      AND column_name = 'imagem'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Coluna "imagem" já existe na tabela "itens"');
      return;
    }

    // Adicionar a coluna imagem
    await client.query(`
      ALTER TABLE itens 
      ADD COLUMN imagem TEXT
    `);

    console.log('✅ Coluna "imagem" adicionada com sucesso na tabela "itens"');

    // Verificar a estrutura da tabela
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'itens'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Estrutura atual da tabela "itens":');
    tableStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addImagemColumn();





