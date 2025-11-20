import pool from '../config/db.js';

// Função helper para buscar caixa aberto por estabelecimento_id
export const getCaixaAbertoByEstabelecimento = async (estabelecimento_id, client = null) => {
  const queryClient = client || pool;
  
  const result = await queryClient.query(
    `SELECT id, receita_total 
     FROM caixas 
     WHERE estabelecimento_id = $1 AND status = $2 
     ORDER BY criado_em DESC 
     LIMIT 1`,
    [estabelecimento_id, true]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
};

// Criar/Abrir caixa
export const createCaixa = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      estabelecimento_id,
      valor_abertura,
      aberto_por
    } = req.body;

    // Validar dados obrigatórios
    if (!estabelecimento_id || !valor_abertura || !aberto_por) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Estabelecimento ID, valor de abertura e usuário são obrigatórios' 
      });
    }

    // Verificar se já existe um caixa aberto para este estabelecimento
    const caixaAbertoCheck = await client.query(
      'SELECT id FROM caixas WHERE estabelecimento_id = $1 AND status = $2',
      [estabelecimento_id, true]
    );

    if (caixaAbertoCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Já existe um caixa aberto para este estabelecimento' 
      });
    }

    // Verificar se o estabelecimento existe
    const estabelecimentoCheck = await client.query(
      'SELECT id FROM estabelecimentos WHERE id = $1 AND status = $2',
      [estabelecimento_id, 'Ativo']
    );

    if (estabelecimentoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Estabelecimento não encontrado ou inativo' 
      });
    }

    // Verificar se o usuário existe
    const usuarioCheck = await client.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [aberto_por]
    );

    if (usuarioCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Inserir caixa
    // Nota: saldo_total é uma coluna GENERATED, então não precisa ser inserida
    const result = await client.query(
      `INSERT INTO caixas (
        estabelecimento_id,
        valor_abertura,
        data_abertura,
        status,
        aberto_por,
        entradas,
        saidas,
        criado_em,
        atualizado_em
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        estabelecimento_id,
        parseFloat(valor_abertura) || 0,
        true, // status = aberto
        aberto_por,
        0, // entradas inicial
        0 // saidas inicial
      ]
    );

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Caixa aberto com sucesso',
      caixa: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao abrir caixa:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  } finally {
    client.release();
  }
};

// Listar caixas
export const getCaixas = async (req, res) => {
  try {
    const { estabelecimento_id, status } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID é obrigatório' 
      });
    }

    let query = `
      SELECT 
        c.*,
        u_aberto.nome as aberto_por_nome,
        u_fechado.nome as fechado_por_nome
      FROM caixas c
      LEFT JOIN usuarios u_aberto ON c.aberto_por = u_aberto.id
      LEFT JOIN usuarios u_fechado ON c.fechado_por = u_fechado.id
      WHERE c.estabelecimento_id = $1
    `;

    const params = [estabelecimento_id];

    // Se tiver filtro de status
    if (status !== undefined) {
      query += ` AND c.status = $2`;
      params.push(status === 'true' || status === true);
    }

    query += ` ORDER BY c.criado_em DESC`;

    const result = await pool.query(query, params);

    res.json({
      caixas: result.rows
    });

  } catch (error) {
    console.error('Erro ao buscar caixas:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

// Buscar caixa aberto
export const getCaixaAberto = async (req, res) => {
  try {
    const { estabelecimento_id } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID é obrigatório' 
      });
    }

    const result = await pool.query(
      `SELECT 
        c.*,
        u_aberto.nome as aberto_por_nome,
        u_fechado.nome as fechado_por_nome
      FROM caixas c
      LEFT JOIN usuarios u_aberto ON c.aberto_por = u_aberto.id
      LEFT JOIN usuarios u_fechado ON c.fechado_por = u_fechado.id
      WHERE c.estabelecimento_id = $1 AND c.status = $2
      ORDER BY c.criado_em DESC
      LIMIT 1`,
      [estabelecimento_id, true]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Nenhum caixa aberto encontrado' 
      });
    }

    res.json({
      caixa: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao buscar caixa aberto:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

// Buscar detalhes completos de um caixa (com movimentações)
export const getCaixaDetalhes = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ 
        error: 'ID do caixa é obrigatório' 
      });
    }

    // Buscar dados do caixa com informações dos usuários
    const caixaResult = await pool.query(
      `SELECT 
        c.*,
        u_aberto.nome as aberto_por_nome,
        u_fechado.nome as fechado_por_nome
      FROM caixas c
      LEFT JOIN usuarios u_aberto ON c.aberto_por = u_aberto.id
      LEFT JOIN usuarios u_fechado ON c.fechado_por = u_fechado.id
      WHERE c.id = $1`,
      [id]
    );

    if (caixaResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Caixa não encontrado' 
      });
    }

    const caixa = caixaResult.rows[0];

    // Buscar movimentações do caixa
    const movimentacoesResult = await pool.query(
      `SELECT 
        m.*,
        u.nome as usuario_nome
      FROM fluxo_caixa m
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.caixa_id = $1
      ORDER BY m.criado_em ASC`,
      [id]
    );

    res.json({
      caixa: caixa,
      movimentacoes: movimentacoesResult.rows
    });

  } catch (error) {
    console.error('Erro ao buscar detalhes do caixa:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

// Fechar caixa
export const fecharCaixa = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      valor_fechamento,
      fechado_por
    } = req.body;

    // Validar dados obrigatórios
    if (!valor_fechamento || !fechado_por) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Valor de fechamento e usuário são obrigatórios' 
      });
    }

    // Buscar caixa atual
    const caixaResult = await client.query(
      'SELECT * FROM caixas WHERE id = $1',
      [id]
    );

    if (caixaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Caixa não encontrado' });
    }

    const caixa = caixaResult.rows[0];

    if (!caixa.status) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Este caixa já está fechado' });
    }

    // Verificar se o usuário existe
    const usuarioCheck = await client.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [fechado_por]
    );

    if (usuarioCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Calcular diferença: valor_fechamento - saldo_total
    const valorFechamento = parseFloat(valor_fechamento) || 0;
    const diferenca = valorFechamento - caixa.saldo_total;

    // Atualizar caixa
    const result = await client.query(
      `UPDATE caixas 
      SET 
        valor_fechamento = $1,
        data_fechamento = CURRENT_TIMESTAMP,
        diferenca = $2,
        status = $3,
        fechado_por = $4,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *`,
      [
        valorFechamento,
        diferenca,
        false, // status = fechado
        fechado_por,
        id
      ]
    );

    await client.query('COMMIT');
    
    res.json({
      message: 'Caixa fechado com sucesso',
      caixa: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao fechar caixa:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  } finally {
    client.release();
  }
};

// Buscar receita_total do caixa aberto
export const getReceitaTotalCaixaAberto = async (req, res) => {
  try {
    const { estabelecimento_id } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID é obrigatório' 
      });
    }

    const caixaAberto = await getCaixaAbertoByEstabelecimento(estabelecimento_id);
    
    if (!caixaAberto) {
      return res.status(404).json({ 
        error: 'Nenhum caixa aberto encontrado',
        receita_total: 0
      });
    }

    res.json({
      receita_total: parseFloat(caixaAberto.receita_total || 0),
      caixa_id: caixaAberto.id
    });

  } catch (error) {
    console.error('Erro ao buscar receita total:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

// Atualizar entradas/saídas do caixa
export const updateCaixa = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      entradas,
      saidas,
      total_vendas
    } = req.body;

    // Buscar caixa atual
    const caixaResult = await client.query(
      'SELECT * FROM caixas WHERE id = $1 AND status = $2',
      [id, true]
    );

    if (caixaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Caixa não encontrado ou já fechado' });
    }

    const caixa = caixaResult.rows[0];
    
    // Calcular novos valores - usar valores atuais se não forem fornecidos
    const novasEntradas = entradas !== undefined ? parseFloat(entradas) : caixa.entradas || 0;
    const novasSaidas = saidas !== undefined ? parseFloat(saidas) : caixa.saidas || 0;
    const novoTotalVendas = total_vendas !== undefined ? parseFloat(total_vendas) : caixa.total_vendas || 0;
    
    // Nota: saldo_total é uma coluna GENERATED, então não precisa ser atualizada manualmente
    // O PostgreSQL calculará automaticamente: saldo_total = valor_abertura + entradas - saidas

    // Atualizar caixa
    const result = await client.query(
      `UPDATE caixas 
      SET 
        entradas = $1,
        saidas = $2,
        total_vendas = $3,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`,
      [
        novasEntradas,
        novasSaidas,
        novoTotalVendas,
        id
      ]
    );

    await client.query('COMMIT');
    
    res.json({
      message: 'Caixa atualizado com sucesso',
      caixa: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar caixa:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  } finally {
    client.release();
  }
};

// Buscar receita mensal (soma das receitas totais dos caixas abertos e fechados do mês)
export const getReceitaMensal = async (req, res) => {
  try {
    const { estabelecimento_id, ano, mes } = req.query;
    
    if (!estabelecimento_id || !ano || !mes) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID, ano e mês são obrigatórios' 
      });
    }

    // Buscar soma das receitas totais de todos os caixas (abertos e fechados) do mês/ano especificado
    // Para caixas fechados: usar data_fechamento
    // Para caixas abertos: usar data_abertura
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(receita_total), 0) as receita_mensal
      FROM caixas
      WHERE estabelecimento_id = $1
        AND (
          -- Caixas fechados do mês/ano especificado
          (status = false 
           AND data_fechamento IS NOT NULL
           AND EXTRACT(YEAR FROM data_fechamento) = $2
           AND EXTRACT(MONTH FROM data_fechamento) = $3)
          OR
          -- Caixas abertos do mês/ano especificado (ainda em andamento)
          (status = true 
           AND data_abertura IS NOT NULL
           AND EXTRACT(YEAR FROM data_abertura) = $2
           AND EXTRACT(MONTH FROM data_abertura) = $3)
        )`,
      [estabelecimento_id, ano, mes]
    );

    const receitaMensal = parseFloat(result.rows[0]?.receita_mensal || 0);

    res.json({
      receita_mensal: receitaMensal
    });

  } catch (error) {
    console.error('Erro ao buscar receita mensal:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};

// Buscar faturamento mensal (mesma lógica da receita mensal - soma das receitas totais dos caixas)
export const getFaturamentoMensal = async (req, res) => {
  try {
    const { estabelecimento_id, ano, mes } = req.query;
    
    if (!estabelecimento_id || !ano || !mes) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID, ano e mês são obrigatórios' 
      });
    }

    // Buscar faturamento como soma das receitas totais de todos os caixas (abertos e fechados) do mês/ano especificado
    // Mesma lógica da receita mensal para manter consistência
    // Para caixas fechados: usar data_fechamento
    // Para caixas abertos: usar data_abertura
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(receita_total), 0) as faturamento
      FROM caixas
      WHERE estabelecimento_id = $1
        AND (
          -- Caixas fechados do mês/ano especificado
          (status = false 
           AND data_fechamento IS NOT NULL
           AND EXTRACT(YEAR FROM data_fechamento) = $2
           AND EXTRACT(MONTH FROM data_fechamento) = $3)
          OR
          -- Caixas abertos do mês/ano especificado (ainda em andamento)
          (status = true 
           AND data_abertura IS NOT NULL
           AND EXTRACT(YEAR FROM data_abertura) = $2
           AND EXTRACT(MONTH FROM data_abertura) = $3)
        )`,
      [estabelecimento_id, ano, mes]
    );

    const faturamento = parseFloat(result.rows[0]?.faturamento || 0);

    res.json({
      faturamento: faturamento
    });

  } catch (error) {
    console.error('Erro ao buscar faturamento mensal:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};

// Contar número de ordens por mês/ano
export const getContagemOrdensMensal = async (req, res) => {
  try {
    const { estabelecimento_id, ano, mes } = req.query;
    
    if (!estabelecimento_id || !ano || !mes) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID, ano e mês são obrigatórios' 
      });
    }

    const result = await pool.query(
      `SELECT COUNT(*) as total_ordens
      FROM ordens_servico
      WHERE estabelecimento_id = $1
        AND EXTRACT(YEAR FROM criado_em) = $2
        AND EXTRACT(MONTH FROM criado_em) = $3`,
      [estabelecimento_id, ano, mes]
    );

    const totalOrdens = parseInt(result.rows[0]?.total_ordens || 0);

    res.json({
      total_ordens: totalOrdens
    });

  } catch (error) {
    console.error('Erro ao contar ordens mensais:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};

// Contar número de ordens por ano
export const getContagemOrdensAnual = async (req, res) => {
  try {
    const { estabelecimento_id, ano } = req.query;
    
    if (!estabelecimento_id || !ano) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID e ano são obrigatórios' 
      });
    }

    const result = await pool.query(
      `SELECT COUNT(*) as total_ordens
      FROM ordens_servico
      WHERE estabelecimento_id = $1
        AND EXTRACT(YEAR FROM criado_em) = $2`,
      [estabelecimento_id, ano]
    );

    const totalOrdens = parseInt(result.rows[0]?.total_ordens || 0);

    res.json({
      total_ordens: totalOrdens
    });

  } catch (error) {
    console.error('Erro ao contar ordens anuais:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};

// Buscar faturamento anual (mesma lógica da receita mensal - soma das receitas totais dos caixas)
export const getFaturamentoAnual = async (req, res) => {
  try {
    const { estabelecimento_id, ano } = req.query;
    
    if (!estabelecimento_id || !ano) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID e ano são obrigatórios' 
      });
    }

    // Buscar faturamento anual como soma das receitas totais de todos os caixas (abertos e fechados) do ano especificado
    // Mesma lógica da receita mensal para manter consistência
    // Para caixas fechados: usar data_fechamento
    // Para caixas abertos: usar data_abertura
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(receita_total), 0) as faturamento
      FROM caixas
      WHERE estabelecimento_id = $1
        AND (
          -- Caixas fechados do ano especificado
          (status = false 
           AND data_fechamento IS NOT NULL
           AND EXTRACT(YEAR FROM data_fechamento) = $2)
          OR
          -- Caixas abertos do ano especificado (ainda em andamento)
          (status = true 
           AND data_abertura IS NOT NULL
           AND EXTRACT(YEAR FROM data_abertura) = $2)
        )`,
      [estabelecimento_id, ano]
    );

    const faturamento = parseFloat(result.rows[0]?.faturamento || 0);

    res.json({
      faturamento: faturamento
    });

  } catch (error) {
    console.error('Erro ao buscar faturamento anual:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};

// Buscar Top 5 produtos e serviços mais vendidos (mensal)
export const getTopItensVendidos = async (req, res) => {
  try {
    const { estabelecimento_id, ano, mes } = req.query;
    
    if (!estabelecimento_id || !ano || !mes) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID, ano e mês são obrigatórios' 
      });
    }

    // Buscar Top 5 produtos mais vendidos do mês
    // Agrupa por item_id, soma quantidade e total, filtra por mês/ano
    const topProdutos = await pool.query(
      `SELECT 
        osi.item_id,
        COALESCE(osi.nome_item, i.nome) as nome_item,
        SUM(osi.quantidade) as quantidade_total,
        SUM(osi.total) as valor_total
      FROM ordens_servico_itens osi
      INNER JOIN ordens_servico os ON osi.ordem_servico_id = os.id
      INNER JOIN itens i ON osi.item_id = i.id
      WHERE os.estabelecimento_id = $1
        AND i.tipo = 'produto'
        AND osi.status = 'Ativo'
        AND EXTRACT(YEAR FROM osi.criado_em) = $2
        AND EXTRACT(MONTH FROM osi.criado_em) = $3
      GROUP BY osi.item_id, COALESCE(osi.nome_item, i.nome)
      ORDER BY quantidade_total DESC
      LIMIT 5`,
      [estabelecimento_id, ano, mes]
    );

    // Buscar Top 5 serviços mais vendidos do mês
    const topServicos = await pool.query(
      `SELECT 
        osi.item_id,
        COALESCE(osi.nome_item, i.nome) as nome_item,
        SUM(osi.quantidade) as quantidade_total,
        SUM(osi.total) as valor_total
      FROM ordens_servico_itens osi
      INNER JOIN ordens_servico os ON osi.ordem_servico_id = os.id
      INNER JOIN itens i ON osi.item_id = i.id
      WHERE os.estabelecimento_id = $1
        AND i.tipo = 'servico'
        AND osi.status = 'Ativo'
        AND EXTRACT(YEAR FROM osi.criado_em) = $2
        AND EXTRACT(MONTH FROM osi.criado_em) = $3
      GROUP BY osi.item_id, COALESCE(osi.nome_item, i.nome)
      ORDER BY quantidade_total DESC
      LIMIT 5`,
      [estabelecimento_id, ano, mes]
    );

    res.json({
      produtos: topProdutos.rows.map(row => ({
        item_id: row.item_id,
        nome: row.nome_item,
        quantidade: parseInt(row.quantidade_total) || 0,
        valor_total: parseFloat(row.valor_total) || 0
      })),
      servicos: topServicos.rows.map(row => ({
        item_id: row.item_id,
        nome: row.nome_item,
        quantidade: parseInt(row.quantidade_total) || 0,
        valor_total: parseFloat(row.valor_total) || 0
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar top itens vendidos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};

// Buscar Top 5 clientes que mais gastam (mensal)
export const getTopClientesFrequentes = async (req, res) => {
  try {
    const { estabelecimento_id, ano, mes } = req.query;
    
    if (!estabelecimento_id || !ano || !mes) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID, ano e mês são obrigatórios' 
      });
    }

    // Buscar Top 5 clientes que mais gastam do mês
    // Agrupa por cliente_id, soma o valor_total de todos os boletos do mês
    const topClientes = await pool.query(
      `SELECT 
        p.cliente_id,
        c.nome as cliente_nome,
        COALESCE(SUM(p.valor_total), 0) as total_gasto
      FROM pagamentos p
      INNER JOIN clientes c ON p.cliente_id = c.id
      INNER JOIN ordens_servico os ON p.ordem_id = os.id
      WHERE os.estabelecimento_id = $1
        AND p.cliente_id IS NOT NULL
        AND p.valor_total IS NOT NULL
        AND EXTRACT(YEAR FROM p.criado_em) = $2
        AND EXTRACT(MONTH FROM p.criado_em) = $3
      GROUP BY p.cliente_id, c.nome
      ORDER BY total_gasto DESC
      LIMIT 5`,
      [estabelecimento_id, ano, mes]
    );

    res.json({
      clientes: topClientes.rows.map(row => ({
        cliente_id: row.cliente_id,
        nome: row.cliente_nome,
        total_gasto: parseFloat(row.total_gasto) || 0
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar top clientes frequentes:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};





