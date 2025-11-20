import pool from './config/db.js';

async function seedVeiculos() {
  const client = await pool.connect();

  try {
    console.log('🌱 Inserindo dados de exemplo de veículos...');

    // Verificar se já existem veículos
    const checkVeiculos = await client.query('SELECT COUNT(*) FROM veiculos');
    if (parseInt(checkVeiculos.rows[0].count) > 0) {
      console.log('⚠️  Já existem veículos no banco de dados.');
      const confirm = process.argv[2] === '--force';
      if (!confirm) {
        console.log('💡 Use --force para inserir mesmo assim');
        return;
      }
    }

    // Buscar o primeiro estabelecimento ativo
    const estabelecimentoResult = await client.query(
      "SELECT id FROM estabelecimentos WHERE status = 'Ativo' LIMIT 1"
    );

    if (estabelecimentoResult.rows.length === 0) {
      console.error('❌ Nenhum estabelecimento ativo encontrado. Crie um estabelecimento primeiro.');
      return;
    }

    const estabelecimentoId = estabelecimentoResult.rows[0].id;
    console.log(`✅ Usando estabelecimento_id: ${estabelecimentoId}`);

    // Buscar clientes ativos do estabelecimento
    const clientesResult = await client.query(
      `SELECT id, nome FROM clientes 
       WHERE estabelecimento_id = $1 AND status = 'Ativo' 
       ORDER BY id LIMIT 15`,
      [estabelecimentoId]
    );

    if (clientesResult.rows.length === 0) {
      console.error('❌ Nenhum cliente ativo encontrado. Execute primeiro o script seed-clientes.js');
      return;
    }

    const clientes = clientesResult.rows;
    console.log(`✅ Encontrados ${clientes.length} cliente(s) ativo(s)`);

    // Dados de exemplo de veículos
    const veiculosData = [
      { marca: 'Honda', modelo: 'Civic', ano: 2020, cor: 'Branco', placa: 'ABC-1234' },
      { marca: 'Toyota', modelo: 'Corolla', ano: 2019, cor: 'Preto', placa: 'DEF-5678' },
      { marca: 'Ford', modelo: 'Focus', ano: 2021, cor: 'Prata', placa: 'GHI-9012' },
      { marca: 'Volkswagen', modelo: 'Gol', ano: 2018, cor: 'Vermelho', placa: 'JKL-3456' },
      { marca: 'Chevrolet', modelo: 'Onix', ano: 2022, cor: 'Azul', placa: 'MNO-7890' },
      { marca: 'Fiat', modelo: 'Uno', ano: 2017, cor: 'Branco', placa: 'PQR-1234' },
      { marca: 'Hyundai', modelo: 'HB20', ano: 2020, cor: 'Preto', placa: 'STU-5678' },
      { marca: 'Renault', modelo: 'Kwid', ano: 2021, cor: 'Amarelo', placa: 'VWX-9012' },
      { marca: 'Nissan', modelo: 'Versa', ano: 2019, cor: 'Prata', placa: 'YZA-3456' },
      { marca: 'Peugeot', modelo: '208', ano: 2022, cor: 'Vermelho', placa: 'BCD-7890' },
      { marca: 'Honda', modelo: 'Fit', ano: 2020, cor: 'Azul', placa: 'EFG-2345' },
      { marca: 'Ford', modelo: 'Ranger', ano: 2021, cor: 'Branco', placa: 'HIJ-6789' },
      { marca: 'Toyota', modelo: 'Hilux', ano: 2020, cor: 'Prata', placa: 'KLM-0123' },
      { marca: 'Volkswagen', modelo: 'Polo', ano: 2019, cor: 'Preto', placa: 'NOP-4567' },
      { marca: 'Chevrolet', modelo: 'Tracker', ano: 2022, cor: 'Verde', placa: 'QRS-8901' },
    ];

    let insertedCount = 0;

    // Distribuir veículos entre os clientes disponíveis
    for (let i = 0; i < veiculosData.length; i++) {
      const veiculo = veiculosData[i];
      const clienteIndex = i % clientes.length; // Rotaciona entre os clientes
      const clienteId = clientes[clienteIndex].id;
      const clienteNome = clientes[clienteIndex].nome;

      try {
        // Verificar se a placa já existe
        const placaExistente = await client.query(
          'SELECT id FROM veiculos WHERE placa = $1 AND estabelecimento_id = $2',
          [veiculo.placa, estabelecimentoId]
        );

        if (placaExistente.rows.length > 0) {
          console.log(`  ⚠️  Placa ${veiculo.placa} já existe, pulando...`);
          continue;
        }

        const result = await client.query(
          `INSERT INTO veiculos (
            estabelecimento_id, 
            cliente_id, 
            placa, 
            marca, 
            modelo, 
            ano, 
            cor, 
            observacoes, 
            status, 
            criado_em
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING id, placa, marca, modelo`,
          [
            estabelecimentoId,
            clienteId,
            veiculo.placa,
            veiculo.marca,
            veiculo.modelo,
            veiculo.ano,
            veiculo.cor,
            null, // observacoes
            'Ativo'
          ]
        );

        insertedCount++;
        console.log(`  ✅ Veículo inserido: ${result.rows[0].marca} ${result.rows[0].modelo} - ${result.rows[0].placa} (Cliente: ${clienteNome})`);
      } catch (error) {
        console.error(`  ❌ Erro ao inserir veículo ${veiculo.placa}:`, error.message);
      }
    }

    console.log(`\n✅ Processo concluído! ${insertedCount} veículo(s) inserido(s) com sucesso.`);

  } catch (error) {
    console.error('❌ Erro ao inserir veículos:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedVeiculos();





























