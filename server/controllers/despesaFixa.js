import pool from '../config/db.js';

// Criar despesa fixa
export const createDespesaFixa = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      estabelecimento_id,
      usuario_id,
      categoria,
      valor,
      data_vencimento,
      data_pagamento,
      descricao
    } = req.body;

    if (!estabelecimento_id || !categoria || !valor) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Campos obrigatórios: estabelecimento_id, categoria, valor' 
      });
    }

    const result = await client.query(
      `INSERT INTO despesas_fixas (
        estabelecimento_id, usuario_id, categoria, valor,
        data_vencimento, data_pagamento, descricao, criado_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        estabelecimento_id,
        usuario_id || null,
        categoria,
        parseFloat(valor),
        data_vencimento || null,
        data_pagamento || null,
        descricao || null
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Despesa fixa criada com sucesso',
      despesa_fixa: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar despesa fixa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// Listar despesas fixas
export const getDespesasFixas = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      usuario_id,
      categoria,
      mes,
      ano
    } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ error: 'Estabelecimento ID é obrigatório' });
    }

    let query = `
      SELECT 
        df.*,
        u.nome as usuario_nome
      FROM despesas_fixas df
      LEFT JOIN usuarios u ON df.usuario_id = u.id
      WHERE df.estabelecimento_id = $1
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (usuario_id) {
      query += ` AND df.usuario_id = $${paramIndex}`;
      params.push(usuario_id);
      paramIndex++;
    }

    if (categoria) {
      query += ` AND df.categoria = $${paramIndex}`;
      params.push(categoria);
      paramIndex++;
    }

    if (mes && ano) {
      // Despesas fixas aparecem em todos os meses a partir do mês de criação
      // Se o mês/ano selecionado for >= ao mês/ano de criação, mostra a despesa
      query += ` AND (
        (EXTRACT(YEAR FROM df.criado_em) < $${paramIndex + 1})
        OR (EXTRACT(YEAR FROM df.criado_em) = $${paramIndex + 1} AND EXTRACT(MONTH FROM df.criado_em) <= $${paramIndex})
      )`;
      params.push(parseInt(mes));
      params.push(parseInt(ano));
      paramIndex += 2;
    }

    query += ` ORDER BY df.data_vencimento DESC, df.criado_em DESC`;

    console.log('🔍 Query despesas fixas:', query);
    console.log('📋 Parâmetros:', params);

    const result = await pool.query(query, params);

    console.log('✅ Despesas fixas encontradas:', result.rows.length);

    res.json({
      despesas_fixas: result.rows || []
    });
  } catch (error) {
    console.error('Erro ao buscar despesas fixas:', error);
    
    // Verificar se é erro de tabela não encontrada
    if (error.message && error.message.includes('does not exist')) {
      return res.status(500).json({
        error: 'Tabela despesas_fixas não encontrada. Execute o script de criação da tabela.',
        details: error.message
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Buscar despesa fixa por ID
export const getDespesaFixaById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        df.*,
        u.nome as usuario_nome
      FROM despesas_fixas df
      LEFT JOIN usuarios u ON df.usuario_id = u.id
      WHERE df.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Despesa fixa não encontrada' });
    }

    res.json({
      despesa_fixa: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar despesa fixa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Atualizar despesa fixa
export const updateDespesaFixa = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      usuario_id,
      categoria,
      valor,
      data_vencimento,
      data_pagamento,
      descricao
    } = req.body;

    // Verificar se despesa fixa existe
    const despesaExistente = await client.query(
      'SELECT * FROM despesas_fixas WHERE id = $1',
      [id]
    );

    if (despesaExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Despesa fixa não encontrada' });
    }

    const result = await client.query(
      `UPDATE despesas_fixas 
       SET usuario_id = COALESCE($1, usuario_id),
           categoria = COALESCE($2, categoria),
           valor = COALESCE($3, valor),
           data_vencimento = $4,
           data_pagamento = $5,
           descricao = COALESCE($6, descricao)
       WHERE id = $7
       RETURNING *`,
      [
        usuario_id || null,
        categoria,
        valor ? parseFloat(valor) : null,
        data_vencimento || null,
        data_pagamento || null,
        descricao || null,
        id
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Despesa fixa atualizada com sucesso',
      despesa_fixa: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar despesa fixa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// Deletar despesa fixa
export const deleteDespesaFixa = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Verificar se despesa fixa existe
    const despesaExistente = await client.query(
      'SELECT * FROM despesas_fixas WHERE id = $1',
      [id]
    );

    if (despesaExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Despesa fixa não encontrada' });
    }

    await client.query('DELETE FROM despesas_fixas WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      message: 'Despesa fixa deletada com sucesso'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar despesa fixa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  } finally {
    client.release();
  }
};

