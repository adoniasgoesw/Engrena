import pool from '../config/db.js';

async function insertTestCaixas() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Inserindo caixas de teste...');
    
    // Buscar o primeiro estabelecimento ativo
    const estabelecimentoResult = await client.query(
      "SELECT id FROM estabelecimentos WHERE status = 'Ativo' LIMIT 1"
    );
    
    if (estabelecimentoResult.rows.length === 0) {
      console.error('❌ Nenhum estabelecimento ativo encontrado.');
      return;
    }
    
    const estabelecimentoId = estabelecimentoResult.rows[0].id;
    console.log(`✅ Usando estabelecimento_id: ${estabelecimentoId}`);
    
    // Buscar um usuário para usar como aberto_por e fechado_por
    const usuarioResult = await client.query(
      `SELECT id FROM usuarios WHERE estabelecimento_id = $1 LIMIT 1`,
      [estabelecimentoId]
    );
    
    if (usuarioResult.rows.length === 0) {
      console.error('❌ Nenhum usuário encontrado.');
      return;
    }
    
    const usuarioId = usuarioResult.rows[0].id;
    console.log(`✅ Usando usuario_id: ${usuarioId}`);
    
    // Dados dos caixas de teste
    const caixasTeste = [
      {
        mes: 'jun',
        ano: 2025,
        mesNumero: 6,
        valorAbertura: 1000.00,
        entradas: 2500.00,
        saidas: 500.00,
        receitaTotal: 3000.00,
        dataAbertura: '2025-06-01 08:00:00',
        dataFechamento: '2025-06-30 18:00:00'
      },
      {
        mes: 'jul',
        ano: 2025,
        mesNumero: 7,
        valorAbertura: 1200.00,
        entradas: 3200.00,
        saidas: 600.00,
        receitaTotal: 3800.00,
        dataAbertura: '2025-07-01 08:00:00',
        dataFechamento: '2025-07-31 18:00:00'
      },
      {
        mes: 'ago',
        ano: 2025,
        mesNumero: 8,
        valorAbertura: 1500.00,
        entradas: 2800.00,
        saidas: 400.00,
        receitaTotal: 3900.00,
        dataAbertura: '2025-08-01 08:00:00',
        dataFechamento: '2025-08-31 18:00:00'
      },
      {
        mes: 'set',
        ano: 2025,
        mesNumero: 9,
        valorAbertura: 1800.00,
        entradas: 3500.00,
        saidas: 700.00,
        receitaTotal: 4600.00,
        dataAbertura: '2025-09-01 08:00:00',
        dataFechamento: '2025-09-30 18:00:00'
      },
      {
        mes: 'out',
        ano: 2025,
        mesNumero: 10,
        valorAbertura: 2000.00,
        entradas: 4200.00,
        saidas: 800.00,
        receitaTotal: 5400.00,
        dataAbertura: '2025-10-01 08:00:00',
        dataFechamento: '2025-10-31 18:00:00'
      }
    ];
    
    // Inserir cada caixa
    for (const caixa of caixasTeste) {
      const result = await client.query(
        `INSERT INTO caixas (
          estabelecimento_id,
          valor_abertura,
          data_abertura,
          entradas,
          saidas,
          receita_total,
          data_fechamento,
          status,
          aberto_por,
          fechado_por,
          criado_em,
          atualizado_em
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $3, $7)
        RETURNING id, receita_total, data_fechamento`,
        [
          estabelecimentoId,
          caixa.valorAbertura,
          caixa.dataAbertura,
          caixa.entradas,
          caixa.saidas,
          caixa.receitaTotal,
          caixa.dataFechamento,
          false, // fechado
          usuarioId,
          usuarioId
        ]
      );
      
      console.log(`✅ Caixa ${caixa.mes}/2025 inserido: ID ${result.rows[0].id}, Receita: R$ ${caixa.receitaTotal.toFixed(2)}`);
    }
    
    await client.query('COMMIT');
    console.log('\n✅ Todos os caixas de teste foram inseridos com sucesso!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao inserir caixas de teste:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

insertTestCaixas();

