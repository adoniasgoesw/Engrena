import pool from './config/db.js';

// Define as chaves que caracterizam duplicidade (ajuste conforme necessário)
// Mantemos a mais antiga (menor id) e removemos as demais
const DUP_KEYS = `
  estabelecimento_id,
  cliente_id,
  veiculo_id,
  COALESCE(TRIM(descricao), ''),
  COALESCE(previsao_saida::timestamp::date::text, ''),
  COALESCE(status, '')
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Encontrar duplicadas (ids a deletar)
    const toDelete = await client.query(
      `WITH ranked AS (
         SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY ${DUP_KEYS}
                  ORDER BY id ASC
                ) AS rn
         FROM ordens_servico
       )
       SELECT id FROM ranked WHERE rn > 1`
    );

    const ids = toDelete.rows.map(r => r.id);
    if (ids.length === 0) {
      console.log('✅ Nenhuma ordem duplicada encontrada.');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`🔎 Encontradas ${ids.length} ordens duplicadas. Excluindo...`);

    // Deletar em lote
    const del = await client.query(
      'DELETE FROM ordens_servico WHERE id = ANY($1::int[])',
      [ids]
    );

    await client.query('COMMIT');
    console.log(`🗑️  Removidas ${del.rowCount} ordens duplicadas.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao remover duplicadas:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();




























