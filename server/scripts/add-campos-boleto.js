import pool from '../config/db.js';

async function adicionarCamposBoleto() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adicionando campos desconto, acrescimo e juros_percentual na tabela pagamentos...');
    
    await client.query('BEGIN');
    
    // Verificar se as colunas já existem
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' 
      AND column_name IN ('desconto', 'acrescimo', 'juros_percentual')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    // Adicionar colunas que não existem
    if (!existingColumns.includes('desconto')) {
      await client.query(`
        ALTER TABLE pagamentos 
        ADD COLUMN desconto NUMERIC(10, 2) DEFAULT 0
      `);
      console.log('✅ Coluna "desconto" adicionada');
    } else {
      console.log('ℹ️  Coluna "desconto" já existe');
    }
    
    if (!existingColumns.includes('acrescimo')) {
      await client.query(`
        ALTER TABLE pagamentos 
        ADD COLUMN acrescimo NUMERIC(10, 2) DEFAULT 0
      `);
      console.log('✅ Coluna "acrescimo" adicionada');
    } else {
      console.log('ℹ️  Coluna "acrescimo" já existe');
    }
    
    if (!existingColumns.includes('juros_percentual')) {
      await client.query(`
        ALTER TABLE pagamentos 
        ADD COLUMN juros_percentual NUMERIC(5, 2) DEFAULT 0
      `);
      console.log('✅ Coluna "juros_percentual" adicionada');
    } else {
      console.log('ℹ️  Coluna "juros_percentual" já existe');
    }
    
    await client.query('COMMIT');
    console.log('✅ Campos adicionados com sucesso!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao adicionar campos:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Sempre executar quando o arquivo for chamado diretamente
adicionarCamposBoleto()
  .then(() => {
    console.log('✅ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro ao executar script:', error);
    process.exit(1);
  });

export default adicionarCamposBoleto;

