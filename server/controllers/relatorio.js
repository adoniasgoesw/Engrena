import pool from '../config/db.js';

// Função auxiliar para formatar data (converte para YYYY-MM-DD)
const formatarData = (data) => {
  if (!data) return null;
  // Se já está no formato YYYY-MM-DD, retornar
  if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return data;
  }
  // Se está no formato DD/MM/YYYY, converter
  if (data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
  }
  // Se tem T (formato ISO), pegar só a data
  if (data.includes('T')) {
    return data.split('T')[0];
  }
  return data;
};

// Função principal para gerar relatórios
export const getRelatorio = async (req, res) => {
  try {
    const { tipo, estabelecimento_id } = req.query;

    if (!tipo || !estabelecimento_id) {
      return res.status(400).json({
        error: 'Tipo de relatório e estabelecimento_id são obrigatórios'
      });
    }

    switch (tipo) {
      case 'ordem-servico':
        return await getRelatorioOrdensServico(req, res);
      case 'clientes':
        return await getRelatorioClientes(req, res);
      case 'veiculos':
        return await getRelatorioVeiculos(req, res);
      case 'produtos':
        return await getRelatorioProdutos(req, res);
      case 'servicos':
        return await getRelatorioServicos(req, res);
      case 'categorias':
        return await getRelatorioCategorias(req, res);
      case 'financeiro':
        return await getRelatorioFinanceiro(req, res);
      default:
        return res.status(400).json({
          error: 'Tipo de relatório inválido'
        });
    }
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório de Ordens de Serviço
const getRelatorioOrdensServico = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      data_inicio,
      data_fim,
      responsavel_id,
      cliente_id,
      veiculo_id
    } = req.query;

    console.log('📊 Parâmetros do relatório:', { estabelecimento_id, data_inicio, data_fim, responsavel_id, cliente_id, veiculo_id });

    let query = `
      SELECT 
        os.*,
        c.nome as cliente_nome,
        v.placa as veiculo_placa,
        v.modelo as veiculo_modelo,
        u.nome as responsavel_nome
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      LEFT JOIN usuarios u ON os.resposavel = u.id
      WHERE os.estabelecimento_id = $1
        AND os.status = 'Finalizado'
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    // Se há filtro de data, usar data_fechamento. Se não há, mostrar todas as ordens finalizadas
    if (data_inicio || data_fim) {
      query += ` AND os.data_fechamento IS NOT NULL`;
      
      if (data_inicio) {
        const dataInicioFormatada = formatarData(data_inicio);
        console.log('📅 Data início formatada:', dataInicioFormatada);
        query += ` AND DATE(os.data_fechamento) >= $${paramIndex}::date`;
        params.push(dataInicioFormatada);
        paramIndex++;
      }

      if (data_fim) {
        const dataFimFormatada = formatarData(data_fim);
        console.log('📅 Data fim formatada:', dataFimFormatada);
        query += ` AND DATE(os.data_fechamento) <= $${paramIndex}::date`;
        params.push(dataFimFormatada);
        paramIndex++;
      }
    }

    if (responsavel_id) {
      query += ` AND os.resposavel = $${paramIndex}`;
      params.push(responsavel_id);
      paramIndex++;
    }

    if (cliente_id) {
      query += ` AND os.cliente_id = $${paramIndex}`;
      params.push(cliente_id);
      paramIndex++;
    }

    if (veiculo_id) {
      query += ` AND os.veiculo_id = $${paramIndex}`;
      params.push(veiculo_id);
      paramIndex++;
    }

    // Ordenar por data_fechamento se existir, senão por data_abertura
    query += ` ORDER BY COALESCE(os.data_fechamento, os.data_abertura) DESC`;

    console.log('🔍 Query executada:', query);
    console.log('📋 Parâmetros:', params);

    const result = await pool.query(query, params);

    console.log('✅ Resultados encontrados:', result.rows.length);

    res.json({
      dados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de ordens de serviço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório de Clientes
const getRelatorioClientes = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      data_inicio,
      data_fim,
      ordenar_por = 'total_vendas',
      ordem = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        c.id,
        c.nome,
        c.email,
        c.telefone,
        COUNT(DISTINCT os.id) as total_ordens,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(osi.total), 0)
           FROM ordens_servico_itens osi
           WHERE osi.ordem_servico_id = os.id
           AND osi.status = 'Ativo')
        ), 0) as total_vendas,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(osi.total), 0)
           FROM ordens_servico_itens osi
           WHERE osi.ordem_servico_id = os.id
           AND osi.status = 'Ativo')
          -
          (SELECT COALESCE(SUM(osi.quantidade * COALESCE(i.preco_custo, 0)), 0)
           FROM ordens_servico_itens osi
           LEFT JOIN itens i ON osi.item_id = i.id
           WHERE osi.ordem_servico_id = os.id
           AND osi.status = 'Ativo')
        ), 0) as lucro
      FROM clientes c
      LEFT JOIN ordens_servico os ON os.cliente_id = c.id
        AND os.status = 'Finalizado'
        AND os.data_fechamento IS NOT NULL
      WHERE c.estabelecimento_id = $1
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (data_inicio) {
      const dataInicioFormatada = formatarData(data_inicio);
      query += ` AND DATE(os.data_fechamento) >= $${paramIndex}::date`;
      params.push(dataInicioFormatada);
      paramIndex++;
    }

    if (data_fim) {
      const dataFimFormatada = formatarData(data_fim);
      query += ` AND DATE(os.data_fechamento) <= $${paramIndex}::date`;
      params.push(dataFimFormatada);
      paramIndex++;
    }

    query += ` GROUP BY c.id, c.nome, c.email, c.telefone`;

    // Ordenação
    const orderBy = ordenar_por === 'lucro' ? 'lucro' : 'total_vendas';
    const orderDirection = ordem === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${orderBy} ${orderDirection}`;

    const result = await pool.query(query, params);

    res.json({
      dados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de clientes:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório de Veículos
const getRelatorioVeiculos = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      data_inicio,
      data_fim,
      ordenar_por = 'total_vendas',
      ordem = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        v.id,
        v.placa,
        v.modelo,
        v.marca,
        v.ano,
        c.nome as cliente_nome,
        COUNT(DISTINCT os.id) as total_ordens,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(osi.total), 0)
           FROM ordens_servico_itens osi
           WHERE osi.ordem_servico_id = os.id
           AND osi.status = 'Ativo')
        ), 0) as total_vendas,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(osi.total), 0)
           FROM ordens_servico_itens osi
           WHERE osi.ordem_servico_id = os.id
           AND osi.status = 'Ativo')
          -
          (SELECT COALESCE(SUM(osi.quantidade * COALESCE(i.preco_custo, 0)), 0)
           FROM ordens_servico_itens osi
           LEFT JOIN itens i ON osi.item_id = i.id
           WHERE osi.ordem_servico_id = os.id
           AND osi.status = 'Ativo')
        ), 0) as lucro
      FROM veiculos v
      LEFT JOIN ordens_servico os ON os.veiculo_id = v.id
        AND os.status = 'Finalizado'
        AND os.data_fechamento IS NOT NULL
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.estabelecimento_id = $1
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (data_inicio) {
      const dataInicioFormatada = formatarData(data_inicio);
      query += ` AND DATE(os.data_fechamento) >= $${paramIndex}::date`;
      params.push(dataInicioFormatada);
      paramIndex++;
    }

    if (data_fim) {
      const dataFimFormatada = formatarData(data_fim);
      query += ` AND DATE(os.data_fechamento) <= $${paramIndex}::date`;
      params.push(dataFimFormatada);
      paramIndex++;
    }

    query += ` GROUP BY v.id, v.placa, v.modelo, v.marca, v.ano, c.nome`;

    // Ordenação
    const orderBy = ordenar_por === 'lucro' ? 'lucro' : 'total_vendas';
    const orderDirection = ordem === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${orderBy} ${orderDirection}`;

    const result = await pool.query(query, params);

    res.json({
      dados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de veículos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório de Produtos
const getRelatorioProdutos = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      data_inicio,
      data_fim,
      categoria_id
    } = req.query;

    let query = `
      SELECT 
        p.id,
        p.nome,
        p.descricao,
        cat.nome as categoria_nome,
        SUM(osi.quantidade) as quantidade_vendida,
        COALESCE(SUM(osi.total), 0) as total_vendas,
        COALESCE(SUM(osi.quantidade * COALESCE(p.preco_custo, 0)), 0) as total_custo,
        COALESCE(SUM(osi.total), 0) - COALESCE(SUM(osi.quantidade * COALESCE(p.preco_custo, 0)), 0) as lucro
      FROM produtos p
      LEFT JOIN categorias cat ON p.categoria_id = cat.id
      LEFT JOIN ordens_servico_itens osi ON osi.item_id = p.id
        AND osi.status = 'Ativo'
      LEFT JOIN ordens_servico os ON os.id = osi.ordem_servico_id
        AND os.status = 'Finalizado'
        AND os.data_fechamento IS NOT NULL
      WHERE p.estabelecimento_id = $1
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (data_inicio) {
      const dataInicioFormatada = formatarData(data_inicio);
      query += ` AND DATE(os.data_fechamento) >= $${paramIndex}::date`;
      params.push(dataInicioFormatada);
      paramIndex++;
    }

    if (data_fim) {
      const dataFimFormatada = formatarData(data_fim);
      query += ` AND DATE(os.data_fechamento) <= $${paramIndex}::date`;
      params.push(dataFimFormatada);
      paramIndex++;
    }

    if (categoria_id) {
      query += ` AND p.categoria_id = $${paramIndex}`;
      params.push(categoria_id);
      paramIndex++;
    }

    query += ` GROUP BY p.id, p.nome, p.descricao, cat.nome`;
    query += ` ORDER BY total_vendas DESC`;

    const result = await pool.query(query, params);

    res.json({
      dados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de produtos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório de Serviços
const getRelatorioServicos = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      data_inicio,
      data_fim,
      categoria_id
    } = req.query;

    let query = `
      SELECT 
        s.id,
        s.nome,
        s.descricao,
        cat.nome as categoria_nome,
        COUNT(osi.id) as quantidade_vendida,
        COALESCE(SUM(osi.total), 0) as total_vendas
      FROM itens s
      LEFT JOIN categorias cat ON s.categoria_id = cat.id
      LEFT JOIN ordens_servico_itens osi ON osi.servico_id = s.id
        AND osi.status = 'Ativo'
      LEFT JOIN ordens_servico os ON os.id = osi.ordem_servico_id
        AND os.status = 'Finalizado'
        AND os.data_fechamento IS NOT NULL
      WHERE cat.estabelecimento_id = $1
        AND s.tipo = 'servico'
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (data_inicio) {
      const dataInicioFormatada = formatarData(data_inicio);
      query += ` AND DATE(os.data_fechamento) >= $${paramIndex}::date`;
      params.push(dataInicioFormatada);
      paramIndex++;
    }

    if (data_fim) {
      const dataFimFormatada = formatarData(data_fim);
      query += ` AND DATE(os.data_fechamento) <= $${paramIndex}::date`;
      params.push(dataFimFormatada);
      paramIndex++;
    }

    if (categoria_id) {
      query += ` AND s.categoria_id = $${paramIndex}`;
      params.push(categoria_id);
      paramIndex++;
    }

    query += ` GROUP BY s.id, s.nome, s.descricao, cat.nome`;
    query += ` ORDER BY total_vendas DESC`;

    const result = await pool.query(query, params);

    res.json({
      dados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de serviços:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório de Categorias
const getRelatorioCategorias = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      data_inicio,
      data_fim
    } = req.query;

    let query = `
      SELECT 
        cat.id,
        cat.nome,
        COUNT(DISTINCT os.id) as total_ordens,
        COALESCE(SUM(osi.total), 0) as total_vendas
      FROM categorias cat
      LEFT JOIN produtos p ON p.categoria_id = cat.id
      LEFT JOIN ordens_servico_itens osi ON osi.item_id = p.id
        AND osi.status = 'Ativo'
      LEFT JOIN ordens_servico os ON os.id = osi.ordem_servico_id
        AND os.status = 'Finalizado'
        AND os.data_fechamento IS NOT NULL
      WHERE cat.estabelecimento_id = $1
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (data_inicio) {
      const dataInicioFormatada = formatarData(data_inicio);
      query += ` AND DATE(os.data_fechamento) >= $${paramIndex}::date`;
      params.push(dataInicioFormatada);
      paramIndex++;
    }

    if (data_fim) {
      const dataFimFormatada = formatarData(data_fim);
      query += ` AND DATE(os.data_fechamento) <= $${paramIndex}::date`;
      params.push(dataFimFormatada);
      paramIndex++;
    }

    query += ` GROUP BY cat.id, cat.nome`;
    query += ` ORDER BY total_vendas DESC`;

    const result = await pool.query(query, params);

    res.json({
      dados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de categorias:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório Financeiro
const getRelatorioFinanceiro = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      subtipo,
      data_inicio,
      data_fim,
      cliente_id
    } = req.query;

    if (!subtipo) {
      return res.status(400).json({
        error: 'Subtipo de relatório financeiro é obrigatório'
      });
    }

    switch (subtipo) {
      case 'ordem-servico':
        return await getRelatorioFinanceiroOrdemServico(req, res);
      case 'cliente':
        return await getRelatorioFinanceiroCliente(req, res);
      case 'veiculo':
        return await getRelatorioFinanceiroVeiculo(req, res);
      case 'produto':
        return await getRelatorioFinanceiroProduto(req, res);
      case 'categoria':
        return await getRelatorioFinanceiroCategoria(req, res);
      default:
        return res.status(400).json({
          error: 'Subtipo de relatório financeiro inválido'
        });
    }
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório Financeiro por Ordem de Serviço
const getRelatorioFinanceiroOrdemServico = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      data_inicio,
      data_fim,
      cliente_id
    } = req.query;

    let query = `
      SELECT 
        os.id,
        os.codigo as numero_ordem,
        os.data_fechamento,
        c.nome as cliente_nome,
        COALESCE(SUM(osi.total), 0) as faturamento,
        COALESCE(SUM(osi.quantidade * COALESCE(i.preco_custo, 0)), 0) as custo,
        COALESCE(SUM(osi.total), 0) - COALESCE(SUM(osi.quantidade * COALESCE(i.preco_custo, 0)), 0) as lucro
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN ordens_servico_itens osi ON osi.ordem_servico_id = os.id
        AND osi.status = 'Ativo'
      LEFT JOIN itens i ON osi.item_id = i.id
      WHERE os.estabelecimento_id = $1
        AND os.status = 'Finalizado'
        AND os.data_fechamento IS NOT NULL
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (data_inicio) {
      const dataInicioFormatada = formatarData(data_inicio);
      query += ` AND DATE(os.data_fechamento) >= $${paramIndex}::date`;
      params.push(dataInicioFormatada);
      paramIndex++;
    }

    if (data_fim) {
      const dataFimFormatada = formatarData(data_fim);
      query += ` AND DATE(os.data_fechamento) <= $${paramIndex}::date`;
      params.push(dataFimFormatada);
      paramIndex++;
    }

    if (cliente_id) {
      query += ` AND os.cliente_id = $${paramIndex}`;
      params.push(cliente_id);
      paramIndex++;
    }

    query += ` GROUP BY os.id, os.codigo, os.data_fechamento, c.nome`;
    query += ` ORDER BY os.data_fechamento DESC`;

    const result = await pool.query(query, params);

    res.json({
      dados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro por ordem de serviço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório Financeiro por Cliente
const getRelatorioFinanceiroCliente = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      data_inicio,
      data_fim
    } = req.query;

    let query = `
      SELECT 
        c.id,
        c.nome,
        COUNT(DISTINCT os.id) as total_ordens,
        COALESCE(SUM(osi.total), 0) as faturamento,
        COALESCE(SUM(osi.quantidade * COALESCE(i.preco_custo, 0)), 0) as custo,
        COALESCE(SUM(osi.total), 0) - COALESCE(SUM(osi.quantidade * COALESCE(i.preco_custo, 0)), 0) as lucro
      FROM clientes c
      LEFT JOIN ordens_servico os ON os.cliente_id = c.id
        AND os.status = 'Finalizado'
      LEFT JOIN ordens_servico_itens osi ON osi.ordem_servico_id = os.id
        AND osi.status = 'Ativo'
      LEFT JOIN itens i ON osi.item_id = i.id
      WHERE c.estabelecimento_id = $1
        AND os.status = 'Finalizado'
        AND os.data_fechamento IS NOT NULL
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (data_inicio) {
      const dataInicioFormatada = formatarData(data_inicio);
      query += ` AND DATE(os.data_fechamento) >= $${paramIndex}::date`;
      params.push(dataInicioFormatada);
      paramIndex++;
    }

    if (data_fim) {
      const dataFimFormatada = formatarData(data_fim);
      query += ` AND DATE(os.data_fechamento) <= $${paramIndex}::date`;
      params.push(dataFimFormatada);
      paramIndex++;
    }

    query += ` GROUP BY c.id, c.nome`;
    query += ` ORDER BY faturamento DESC`;

    const result = await pool.query(query, params);

    res.json({
      dados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro por cliente:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório Financeiro por Veículo
const getRelatorioFinanceiroVeiculo = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      data_inicio,
      data_fim
    } = req.query;

    let query = `
      SELECT 
        v.id,
        v.placa,
        v.modelo,
        v.marca,
        COUNT(DISTINCT os.id) as total_ordens,
        COALESCE(SUM(osi.total), 0) as faturamento,
        COALESCE(SUM(osi.quantidade * COALESCE(i.preco_custo, 0)), 0) as custo,
        COALESCE(SUM(osi.total), 0) - COALESCE(SUM(osi.quantidade * COALESCE(i.preco_custo, 0)), 0) as lucro
      FROM veiculos v
      LEFT JOIN ordens_servico os ON os.veiculo_id = v.id
        AND os.status = 'Finalizado'
      LEFT JOIN ordens_servico_itens osi ON osi.ordem_servico_id = os.id
        AND osi.status = 'Ativo'
      LEFT JOIN itens i ON osi.item_id = i.id
      WHERE v.estabelecimento_id = $1
        AND os.status = 'Finalizado'
        AND os.data_fechamento IS NOT NULL
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (data_inicio) {
      const dataInicioFormatada = formatarData(data_inicio);
      query += ` AND DATE(os.data_fechamento) >= $${paramIndex}::date`;
      params.push(dataInicioFormatada);
      paramIndex++;
    }

    if (data_fim) {
      const dataFimFormatada = formatarData(data_fim);
      query += ` AND DATE(os.data_fechamento) <= $${paramIndex}::date`;
      params.push(dataFimFormatada);
      paramIndex++;
    }

    query += ` GROUP BY v.id, v.placa, v.modelo, v.marca`;
    query += ` ORDER BY faturamento DESC`;

    const result = await pool.query(query, params);

    res.json({
      dados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro por veículo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório Financeiro por Produto
const getRelatorioFinanceiroProduto = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      data_inicio,
      data_fim
    } = req.query;

    let query = `
      SELECT 
        p.id,
        p.nome,
        SUM(osi.quantidade) as quantidade_vendida,
        COALESCE(SUM(osi.total), 0) as faturamento,
        COALESCE(SUM(osi.quantidade * COALESCE(p.preco_custo, 0)), 0) as custo,
        COALESCE(SUM(osi.total), 0) - COALESCE(SUM(osi.quantidade * COALESCE(p.preco_custo, 0)), 0) as lucro
      FROM produtos p
      LEFT JOIN ordens_servico_itens osi ON osi.item_id = p.id
        AND osi.status = 'Ativo'
      LEFT JOIN ordens_servico os ON os.id = osi.ordem_servico_id
        AND os.status = 'Finalizado'
        AND os.data_fechamento IS NOT NULL
      WHERE p.estabelecimento_id = $1
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (data_inicio) {
      const dataInicioFormatada = formatarData(data_inicio);
      query += ` AND DATE(os.data_fechamento) >= $${paramIndex}::date`;
      params.push(dataInicioFormatada);
      paramIndex++;
    }

    if (data_fim) {
      const dataFimFormatada = formatarData(data_fim);
      query += ` AND DATE(os.data_fechamento) <= $${paramIndex}::date`;
      params.push(dataFimFormatada);
      paramIndex++;
    }

    query += ` GROUP BY p.id, p.nome`;
    query += ` ORDER BY faturamento DESC`;

    const result = await pool.query(query, params);

    res.json({
      dados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro por produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Relatório Financeiro por Categoria
const getRelatorioFinanceiroCategoria = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      data_inicio,
      data_fim
    } = req.query;

    let query = `
      SELECT 
        cat.id,
        cat.nome,
        COUNT(DISTINCT os.id) as total_ordens,
        COALESCE(SUM(osi.total), 0) as faturamento,
        COALESCE(SUM(osi.quantidade * COALESCE(p.preco_custo, 0)), 0) as custo,
        COALESCE(SUM(osi.total), 0) - COALESCE(SUM(osi.quantidade * COALESCE(p.preco_custo, 0)), 0) as lucro
      FROM categorias cat
      LEFT JOIN produtos p ON p.categoria_id = cat.id
      LEFT JOIN ordens_servico_itens osi ON osi.item_id = p.id
        AND osi.status = 'Ativo'
      LEFT JOIN ordens_servico os ON os.id = osi.ordem_servico_id
        AND os.status = 'Finalizado'
        AND os.data_fechamento IS NOT NULL
      WHERE cat.estabelecimento_id = $1
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (data_inicio) {
      const dataInicioFormatada = formatarData(data_inicio);
      query += ` AND DATE(os.data_fechamento) >= $${paramIndex}::date`;
      params.push(dataInicioFormatada);
      paramIndex++;
    }

    if (data_fim) {
      const dataFimFormatada = formatarData(data_fim);
      query += ` AND DATE(os.data_fechamento) <= $${paramIndex}::date`;
      params.push(dataFimFormatada);
      paramIndex++;
    }

    query += ` GROUP BY cat.id, cat.nome`;
    query += ` ORDER BY faturamento DESC`;

    const result = await pool.query(query, params);

    res.json({
      dados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro por categoria:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};




