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

async function createContasBancariasTable() {
  const client = await pool.connect();

  try {
    console.log('🔧 Criando tabela contas_bancarias...');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'create-contas-bancarias-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar o SQL
    await client.query(sql);

    console.log('✅ Tabela contas_bancarias criada com sucesso!');

    // Verificar a estrutura da tabela
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'contas_bancarias'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Estrutura da tabela contas_bancarias:');
    tableStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Tabela contas_bancarias já existe');
    } else {
      console.error('❌ Erro ao criar tabela:', error);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

createContasBancariasTable();




