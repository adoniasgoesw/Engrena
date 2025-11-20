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

async function addParcelaToDespesas() {
  const client = await pool.connect();

  try {
    console.log('🔧 Adicionando coluna parcela na tabela despesas...');

    const sqlPath = path.join(__dirname, 'add-parcela-to-despesas.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('✅ Coluna parcela adicionada com sucesso!');

    // Verificar se a coluna foi criada
    const checkColumn = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'despesas' AND column_name = 'parcela'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('\n📋 Coluna parcela na tabela despesas:');
      const col = checkColumn.rows[0];
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    }

  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('ℹ️  Coluna parcela já existe na tabela despesas');
    } else {
      console.error('❌ Erro ao adicionar coluna parcela:', error);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

addParcelaToDespesas();







