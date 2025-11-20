import pool from '../config/db.js';

// Criar movimentação
export const createMovimentacao = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      caixa_id,
      tipo,
      descricao,
      valor,
      usuario_id
    } = req.body;

    // Validar dados obrigatórios
    if (!caixa_id || !tipo || !descricao || !valor) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Caixa ID, tipo, descrição e valor são obrigatórios' 
      });
    }

    if (tipo !== 'entrada' && tipo !== 'saida') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Tipo deve ser "entrada" ou "saida"' 
      });
    }

    // Verificar se o caixa existe e está aberto
    const caixaResult = await client.query(
      'SELECT * FROM caixas WHERE id = $1 AND status = $2',
      [caixa_id, true]
    );

    if (caixaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Caixa não encontrado ou já fechado' });
    }

    const caixa = caixaResult.rows[0];
    
    // Calcular saldo anterior (saldo atual do caixa antes da movimentação)
    // saldo_total é uma coluna GENERATED: valor_abertura + entradas - saidas
    let saldoAnterior = parseFloat(caixa.saldo_total || 0);
    if (isNaN(saldoAnterior)) {
      // Se saldo_total não estiver disponível, calcular manualmente
      const valorAbertura = parseFloat(caixa.valor_abertura || 0);
      const entradas = parseFloat(caixa.entradas || 0);
      const saidas = parseFloat(caixa.saidas || 0);
      saldoAnterior = valorAbertura + entradas - saidas;
    }
    
    // Calcular valor da movimentação
    const valorMovimentacao = parseFloat(valor) || 0;
    
    // Calcular novas entradas/saidas
    const entradasAtuais = parseFloat(caixa.entradas || 0);
    const saidasAtuais = parseFloat(caixa.saidas || 0);
    
    const novasEntradas = tipo === 'entrada' 
      ? entradasAtuais + valorMovimentacao 
      : entradasAtuais;
    
    const novasSaidas = tipo === 'saida' 
      ? saidasAtuais + valorMovimentacao 
      : saidasAtuais;
    
    // Atualizar entradas/saidas na tabela caixas
    await client.query(
      `UPDATE caixas 
       SET entradas = $1, 
           saidas = $2,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [novasEntradas, novasSaidas, caixa_id]
    );
    
    // Inserir na tabela fluxo_caixa
    const result = await client.query(
      `INSERT INTO fluxo_caixa (
        caixa_id,
        tipo,
        descricao,
        valor,
        usuario_id,
        saldo_anterior,
        data_movimento,
        criado_em
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        caixa_id,
        tipo,
        descricao,
        valorMovimentacao,
        usuario_id || null,
        saldoAnterior
      ]
    );

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Movimentação criada com sucesso',
      movimentacao: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar movimentação:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  } finally {
    client.release();
  }
};

// Listar movimentações
export const getMovimentacoes = async (req, res) => {
  try {
    const { caixa_id } = req.query;
    
    if (!caixa_id) {
      return res.status(400).json({ 
        error: 'ID do caixa é obrigatório' 
      });
    }

    const result = await pool.query(
      `SELECT 
        m.*,
        c.estabelecimento_id
      FROM fluxo_caixa m
      INNER JOIN caixas c ON m.caixa_id = c.id
      WHERE m.caixa_id = $1
      ORDER BY m.criado_em DESC`,
      [caixa_id]
    );

    res.json({
      movimentacoes: result.rows
    });

  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

// Buscar movimentações do caixa aberto
export const getMovimentacoesCaixaAberto = async (req, res) => {
  try {
    const { estabelecimento_id } = req.query;
    
    if (!estabelecimento_id) {
      return res.status(400).json({ 
        error: 'ID do estabelecimento é obrigatório' 
      });
    }

    // Buscar caixa aberto
    const caixaResult = await pool.query(
      `SELECT id FROM caixas 
       WHERE estabelecimento_id = $1 AND status = $2 
       ORDER BY criado_em DESC 
       LIMIT 1`,
      [estabelecimento_id, true]
    );

    if (caixaResult.rows.length === 0) {
      return res.json({
        movimentacoes: []
      });
    }

    const caixaId = caixaResult.rows[0].id;

    // Buscar movimentações do caixa aberto
    const result = await pool.query(
      `SELECT 
        m.*,
        c.estabelecimento_id
      FROM fluxo_caixa m
      INNER JOIN caixas c ON m.caixa_id = c.id
      WHERE m.caixa_id = $1
      ORDER BY m.criado_em DESC`,
      [caixaId]
    );

    res.json({
      movimentacoes: result.rows
    });

  } catch (error) {
    console.error('Erro ao buscar movimentações do caixa aberto:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};




