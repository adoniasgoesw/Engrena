import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createMovimentacoesTable() {
  const client = await pool.connect();

  try {
    console.log('🔧 Criando tabela movimentacoes_caixa...');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'create-movimentacoes-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar o SQL
    await client.query(sql);

    console.log('✅ Tabela movimentacoes_caixa criada com sucesso!');

    // Verificar a estrutura da tabela
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'movimentacoes_caixa'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Estrutura da tabela movimentacoes_caixa:');
    tableStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Tabela movimentacoes_caixa já existe');
    } else {
      console.error('❌ Erro ao criar tabela:', error);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

createMovimentacoesTable();


















