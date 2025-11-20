import pool from '../config/db.js';

// Criar despesa
export const createDespesa = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      estabelecimento_id,
      tipo,
      categoria,
      descricao,
      valor,
      funcionario_id,
      parcela,
      recorrente,
      data_vencimento,
      data_pagamento,
      mes_referencia,
      ano_referencia
    } = req.body;

    if (!estabelecimento_id || !tipo || !categoria || !descricao || !valor) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Campos obrigatórios: estabelecimento_id, tipo, categoria, descricao, valor' });
    }

    // Determinar status baseado na data de pagamento
    let status = 'Pendente';
    if (data_pagamento) {
      status = 'Pago';
    } else if (data_vencimento) {
      const hoje = new Date();
      const vencimento = new Date(data_vencimento);
      if (vencimento < hoje) {
        status = 'Vencido';
      }
    }

    // Se não informado, usar mês/ano atual
    const hoje = new Date();
    const mes = mes_referencia || (hoje.getMonth() + 1);
    const ano = ano_referencia || hoje.getFullYear();

    const result = await client.query(
      `INSERT INTO despesas (
        estabelecimento_id, tipo, categoria, descricao, valor,
        funcionario_id, parcela, recorrente, data_vencimento, data_pagamento,
        status, mes_referencia, ano_referencia, criado_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        estabelecimento_id,
        tipo,
        categoria,
        descricao,
        parseFloat(valor),
        funcionario_id || null,
        parcela || null,
        recorrente || false,
        data_vencimento || null,
        data_pagamento || null,
        status,
        mes,
        ano
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Despesa criada com sucesso',
      despesa: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar despesa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// Listar despesas
export const getDespesas = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      mes,
      ano,
      tipo,
      categoria,
      status,
      funcionario_id
    } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ error: 'Estabelecimento ID é obrigatório' });
    }

    let query = `
      SELECT 
        d.*,
        u.nome as funcionario_nome
      FROM despesas d
      LEFT JOIN usuarios u ON d.funcionario_id = u.id
      WHERE d.estabelecimento_id = $1
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (mes && String(mes).trim() !== '') {
      query += ` AND d.mes_referencia = $${paramIndex}`;
      params.push(parseInt(mes));
      paramIndex++;
    }

    if (ano && String(ano).trim() !== '') {
      query += ` AND d.ano_referencia = $${paramIndex}`;
      params.push(parseInt(ano));
      paramIndex++;
    }

    if (tipo && String(tipo).trim() !== '') {
      query += ` AND d.tipo = $${paramIndex}`;
      params.push(tipo);
      paramIndex++;
    }

    if (categoria && String(categoria).trim() !== '') {
      query += ` AND d.categoria = $${paramIndex}`;
      params.push(categoria);
      paramIndex++;
    }

    if (status && String(status).trim() !== '') {
      query += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (funcionario_id && String(funcionario_id).trim() !== '') {
      query += ` AND d.funcionario_id = $${paramIndex}`;
      params.push(parseInt(funcionario_id));
      paramIndex++;
    }

    query += ` ORDER BY d.data_vencimento DESC, d.criado_em DESC`;

    const result = await pool.query(query, params);

    res.json({
      despesas: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar despesas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Buscar despesa por ID
export const getDespesaById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        d.*,
        u.nome as funcionario_nome
      FROM despesas d
      LEFT JOIN usuarios u ON d.funcionario_id = u.id
      WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    res.json({
      despesa: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar despesa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Atualizar despesa
export const updateDespesa = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      tipo,
      categoria,
      descricao,
      valor,
      funcionario_id,
      parcela,
      recorrente,
      data_vencimento,
      data_pagamento,
      mes_referencia,
      ano_referencia
    } = req.body;

    // Verificar se despesa existe
    const despesaExistente = await client.query(
      'SELECT * FROM despesas WHERE id = $1',
      [id]
    );

    if (despesaExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    // Determinar status
    let status = 'Pendente';
    if (data_pagamento) {
      status = 'Pago';
    } else if (data_vencimento) {
      const hoje = new Date();
      const vencimento = new Date(data_vencimento);
      if (vencimento < hoje) {
        status = 'Vencido';
      }
    }

    const result = await client.query(
      `UPDATE despesas 
       SET tipo = COALESCE($1, tipo),
           categoria = COALESCE($2, categoria),
           descricao = COALESCE($3, descricao),
           valor = COALESCE($4, valor),
           funcionario_id = $5,
           parcela = $6,
           recorrente = COALESCE($7, recorrente),
           data_vencimento = $8,
           data_pagamento = $9,
           status = $10,
           mes_referencia = COALESCE($11, mes_referencia),
           ano_referencia = COALESCE($12, ano_referencia),
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        tipo,
        categoria,
        descricao,
        valor ? parseFloat(valor) : null,
        funcionario_id || null,
        parcela || null,
        recorrente,
        data_vencimento || null,
        data_pagamento || null,
        status,
        mes_referencia,
        ano_referencia,
        id
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Despesa atualizada com sucesso',
      despesa: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar despesa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// Deletar despesa
export const deleteDespesa = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Verificar se despesa existe
    const despesaExistente = await client.query(
      'SELECT * FROM despesas WHERE id = $1',
      [id]
    );

    if (despesaExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    await client.query('DELETE FROM despesas WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      message: 'Despesa deletada com sucesso'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar despesa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// Buscar receita do mês para despesas (baseada em caixas fechados)
export const getReceitaMensalDespesas = async (req, res) => {
  try {
    const { estabelecimento_id, mes, ano } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ error: 'Estabelecimento ID é obrigatório' });
    }

    const mesAtual = mes || new Date().getMonth() + 1;
    const anoAtual = ano || new Date().getFullYear();

    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(receita_total), 0) as receita_total,
        COUNT(*) as total_caixas
      FROM caixas
      WHERE estabelecimento_id = $1
        AND status = false
        AND EXTRACT(MONTH FROM data_fechamento) = $2
        AND EXTRACT(YEAR FROM data_fechamento) = $3`,
      [estabelecimento_id, mesAtual, anoAtual]
    );

    res.json({
      receita_total: parseFloat(result.rows[0].receita_total || 0),
      total_caixas: parseInt(result.rows[0].total_caixas || 0),
      mes: mesAtual,
      ano: anoAtual
    });
  } catch (error) {
    console.error('Erro ao buscar receita mensal:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Buscar total de despesas do mês
export const getDespesasMensal = async (req, res) => {
  try {
    const { estabelecimento_id, mes, ano } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ error: 'Estabelecimento ID é obrigatório' });
    }

    const mesAtual = mes || new Date().getMonth() + 1;
    const anoAtual = ano || new Date().getFullYear();

    // Buscar de despesas_fixas e despesas_mes
    // Despesas fixas: aparecem em todos os meses a partir do mês de criação
    // Gastos do mês: aparecem apenas no mês específico
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(valor), 0) as total_despesas,
        COUNT(*) as total_registros
      FROM (
        SELECT valor, criado_em
        FROM despesas_fixas
        WHERE estabelecimento_id = $1
          AND (
            (EXTRACT(YEAR FROM criado_em) < $3)
            OR (EXTRACT(YEAR FROM criado_em) = $3 AND EXTRACT(MONTH FROM criado_em) <= $2)
          )
        UNION ALL
        SELECT valor, criado_em
        FROM despesas_mes
        WHERE estabelecimento_id = $1
          AND EXTRACT(MONTH FROM data_gasto) = $2
          AND EXTRACT(YEAR FROM data_gasto) = $3
      ) AS todas_despesas`,
      [estabelecimento_id, mesAtual, anoAtual]
    );

    res.json({
      total_despesas: parseFloat(result.rows[0].total_despesas || 0),
      total_registros: parseInt(result.rows[0].total_registros || 0),
      despesas_pagas: 0, // Não temos status na tabela despesas_fixas
      despesas_pendentes: 0,
      despesas_vencidas: 0,
      mes: mesAtual,
      ano: anoAtual
    });
  } catch (error) {
    console.error('Erro ao buscar despesas mensal:', error);
    
    // Verificar se é erro de tabela não encontrada
    if (error.message && error.message.includes('does not exist')) {
      return res.status(500).json({
        error: 'Tabela despesas_fixas não encontrada. Execute o script de criação da tabela.',
        details: 'Execute: node server/database/create-despesas-fixas.js',
        code: 'TABLE_NOT_FOUND'
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

