import pool from './config/db.js';

async function seedClientes() {
  const client = await pool.connect();

  try {
    console.log('🌱 Inserindo dados de exemplo de clientes...');

    // Verificar se já existem clientes
    const checkClientes = await client.query('SELECT COUNT(*) FROM clientes');
    if (parseInt(checkClientes.rows[0].count) > 0) {
      console.log('⚠️  Já existem clientes no banco de dados.');
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

    // Dados de exemplo de clientes
    const clientes = [
      {
        nome: 'João Silva',
        cpf: '12345678901',
        cnpj: null,
        whatsapp: '11999999999',
        email: 'joao.silva@email.com',
        endereco: 'Rua das Flores, 123 - Centro - São Paulo/SP - CEP: 01000-000',
        observacoes: 'Cliente preferencial, sempre faz manutenção preventiva',
        status: 'Ativo'
      },
      {
        nome: 'Maria Santos',
        cpf: '98765432100',
        cnpj: null,
        whatsapp: '11888888888',
        email: 'maria.santos@email.com',
        endereco: 'Av. Paulista, 1000 - Bela Vista - São Paulo/SP - CEP: 01310-100',
        observacoes: null,
        status: 'Ativo'
      },
      {
        nome: 'Oficina Mecânica ABC Ltda',
        cpf: null,
        cnpj: '12345678000190',
        whatsapp: '11777777777',
        email: 'contato@oficinaabc.com.br',
        endereco: 'Rua Comercial, 500 - Vila Industrial - São Paulo/SP - CEP: 03000-000',
        observacoes: 'Cliente corporativo, pagamento à vista com desconto',
        status: 'Ativo'
      },
      {
        nome: 'Pedro Oliveira',
        cpf: '45678912300',
        cnpj: null,
        whatsapp: '11666666666',
        email: 'pedro.oliveira@email.com',
        endereco: 'Rua do Comércio, 789 - Jardim das Acácias - São Paulo/SP - CEP: 04000-000',
        observacoes: null,
        status: 'Ativo'
      },
      {
        nome: 'Ana Costa',
        cpf: '78912345600',
        cnpj: null,
        whatsapp: '11555555555',
        email: 'ana.costa@email.com',
        endereco: 'Alameda dos Mecânicos, 321 - Vila Automotiva - São Paulo/SP - CEP: 05000-000',
        observacoes: 'Prefere atendimento aos sábados',
        status: 'Ativo'
      },
      {
        nome: 'Carlos Mendes',
        cpf: '32165498700',
        cnpj: null,
        whatsapp: '11444444444',
        email: 'carlos.mendes@email.com',
        endereco: 'Rua dos Automóveis, 654 - Distrito Industrial - São Paulo/SP - CEP: 06000-000',
        observacoes: null,
        status: 'Ativo'
      },
      {
        nome: 'Juliana Ferreira',
        cpf: '65498732100',
        cnpj: null,
        whatsapp: '11333333333',
        email: 'juliana.ferreira@email.com',
        endereco: 'Av. dos Serviços, 987 - Centro Empresarial - São Paulo/SP - CEP: 07000-000',
        observacoes: 'Atende em horário comercial',
        status: 'Inativo'
      },
      {
        nome: 'Ricardo Souza',
        cpf: '98732165400',
        cnpj: null,
        whatsapp: '11222222222',
        email: 'ricardo.souza@email.com',
        endereco: 'Rua das Oficinas, 147 - Vila Mecânica - São Paulo/SP - CEP: 08000-000',
        observacoes: null,
        status: 'Ativo'
      },
      {
        nome: 'Patricia Lima',
        cpf: '14725836900',
        cnpj: null,
        whatsapp: '11111111111',
        email: 'patricia.lima@email.com',
        endereco: 'Travessa dos Reparos, 258 - Bairro Automotivo - São Paulo/SP - CEP: 09000-000',
        observacoes: 'Cliente novo, primeira visita',
        status: 'Ativo'
      },
      {
        nome: 'Bruno Alves',
        cpf: '25836914700',
        cnpj: null,
        whatsapp: '11999990000',
        email: 'bruno.alves@email.com',
        endereco: 'Praça dos Veículos, 369 - Parque Automotivo - São Paulo/SP - CEP: 10000-000',
        observacoes: null,
        status: 'Ativo'
      },
      {
        nome: 'Auto Peças Premium S.A.',
        cpf: null,
        cnpj: '98765432000111',
        whatsapp: '11987654321',
        email: 'compras@autopeçaspremium.com.br',
        endereco: 'Av. das Indústrias, 2000 - Distrito Industrial - São Paulo/SP - CEP: 11000-000',
        observacoes: 'Fornecedor regular, pagamento em 30 dias',
        status: 'Ativo'
      },
      {
        nome: 'Fernando Rocha',
        cpf: '36914725800',
        cnpj: null,
        whatsapp: '11876543210',
        email: 'fernando.rocha@email.com',
        endereco: 'Rua dos Motores, 741 - Vila Técnica - São Paulo/SP - CEP: 12000-000',
        observacoes: null,
        status: 'Ativo'
      }
    ];

    let insertedCount = 0;

    for (const cliente of clientes) {
      try {
        const result = await client.query(
          `INSERT INTO clientes (
            estabelecimento_id, nome, cpf, cnpj, whatsapp, email, 
            endereco, observacoes, status, criado_em
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING id, nome`,
          [
            estabelecimentoId,
            cliente.nome,
            cliente.cpf,
            cliente.cnpj,
            cliente.whatsapp,
            cliente.email,
            cliente.endereco,
            cliente.observacoes,
            cliente.status
          ]
        );

        insertedCount++;
        console.log(`  ✅ Cliente inserido: ${result.rows[0].nome} (ID: ${result.rows[0].id})`);
      } catch (error) {
        console.error(`  ❌ Erro ao inserir cliente ${cliente.nome}:`, error.message);
      }
    }

    console.log(`\n✅ Processo concluído! ${insertedCount} cliente(s) inserido(s) com sucesso.`);

  } catch (error) {
    console.error('❌ Erro ao inserir clientes:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedClientes();

