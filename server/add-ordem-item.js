import pool from './config/db.js';

// Usage: node add-ordem-item.js --ordemId=1 --itemId=46 --quantidade=1
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (const arg of args) {
    const [k, v] = arg.replace(/^--/, '').split('=');
    parsed[k] = v !== undefined ? v : true;
  }
  return parsed;
}

async function main() {
  const { ordemId, itemId = 46, quantidade = 1 } = parseArgs();

  if (!ordemId) {
    console.error('Erro: informe --ordemId=<id da ordem>');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar se ordem existe
    const ordem = await client.query(
      'SELECT id, codigo FROM ordens_servico WHERE id = $1',
      [parseInt(ordemId)]
    );
    if (ordem.rows.length === 0) {
      throw new Error(`Ordem ${ordemId} não encontrada`);
    }

    // Verificar se item existe e obter dados
    const item = await client.query(
      'SELECT id, nome, preco FROM itens WHERE id = $1',
      [parseInt(itemId)]
    );
    if (item.rows.length === 0) {
      throw new Error(`Item ${itemId} não encontrado`);
    }

    const nomeItem = item.rows[0].nome;
    const precoUnit = Number(item.rows[0].preco);
    const qtd = Number(quantidade) || 1;
    const total = precoUnit * qtd;

    const inserted = await client.query(
      `INSERT INTO ordens_servico_itens (
         ordem_servico_id, item_id, nome_item, quantidade, preco_unitario, total, status, criado_em
       ) VALUES ($1, $2, $3, $4, $5, $6, 'Ativo', NOW())
       RETURNING *`,
      [parseInt(ordemId), parseInt(itemId), nomeItem, qtd, precoUnit, total]
    );

    await client.query('COMMIT');
    console.log('✅ Item inserido em ordens_servico_itens:', inserted.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Falha ao inserir item na ordem:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    // Encerrar pool explicitamente para terminar o processo Node
    await pool.end();
  }
}

main();


