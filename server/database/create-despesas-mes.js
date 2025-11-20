import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createDespesasMesTable() {
  const client = await pool.connect();

  try {
    console.log('🔧 Criando tabela despesas_mes...');

    const sqlPath = path.join(__dirname, 'create-despesas-mes-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('✅ Tabela despesas_mes criada com sucesso!');

    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'despesas_mes'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Estrutura da tabela despesas_mes:');
    tableStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Tabela despesas_mes já existe');
    } else {
      console.error('❌ Erro ao criar tabela:', error);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

createDespesasMesTable();






