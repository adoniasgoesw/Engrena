import pool from '../config/db.js';

// Criar gasto do mês
export const createGastoMes = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      estabelecimento_id,
      nome_gasto,
      valor,
      data_gasto,
      descricao
    } = req.body;

    if (!estabelecimento_id || !nome_gasto || !valor || !data_gasto) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Campos obrigatórios: estabelecimento_id, nome_gasto, valor, data_gasto' 
      });
    }

    const result = await client.query(
      `INSERT INTO despesas_mes (
        estabelecimento_id, nome_gasto, valor, data_gasto, descricao, criado_em
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        estabelecimento_id,
        nome_gasto,
        parseFloat(valor),
        data_gasto,
        descricao || null
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Gasto do mês criado com sucesso',
      gasto_mes: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar gasto do mês:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// Listar gastos do mês
export const getGastosMes = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      mes,
      ano
    } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ error: 'Estabelecimento ID é obrigatório' });
    }

    let query = `
      SELECT *
      FROM despesas_mes
      WHERE estabelecimento_id = $1
    `;

    const params = [estabelecimento_id];
    let paramIndex = 2;

    if (mes && ano) {
      // Filtrar por mês/ano da data_gasto
      query += ` AND (
        EXTRACT(MONTH FROM data_gasto) = $${paramIndex} 
        AND EXTRACT(YEAR FROM data_gasto) = $${paramIndex + 1}
      )`;
      params.push(parseInt(mes));
      params.push(parseInt(ano));
      paramIndex += 2;
    }

    query += ` ORDER BY data_gasto DESC, criado_em DESC`;

    console.log('🔍 Query gastos do mês:', query);
    console.log('📋 Parâmetros:', params);

    const result = await pool.query(query, params);

    console.log('✅ Gastos do mês encontrados:', result.rows.length);

    res.json({
      gastos_mes: result.rows || []
    });
  } catch (error) {
    console.error('Erro ao buscar gastos do mês:', error);
    
    // Verificar se é erro de tabela não encontrada
    if (error.message && error.message.includes('does not exist')) {
      return res.status(500).json({
        error: 'Tabela despesas_mes não encontrada. Execute o script de criação da tabela.',
        details: error.message
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Buscar gasto do mês por ID
export const getGastoMesById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM despesas_mes WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gasto do mês não encontrado' });
    }

    res.json({
      gasto_mes: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar gasto do mês:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

// Atualizar gasto do mês
export const updateGastoMes = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      nome_gasto,
      valor,
      data_gasto,
      descricao
    } = req.body;

    // Verificar se gasto do mês existe
    const gastoExistente = await client.query(
      'SELECT * FROM despesas_mes WHERE id = $1',
      [id]
    );

    if (gastoExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Gasto do mês não encontrado' });
    }

    const result = await client.query(
      `UPDATE despesas_mes 
       SET nome_gasto = COALESCE($1, nome_gasto),
           valor = COALESCE($2, valor),
           data_gasto = COALESCE($3, data_gasto),
           descricao = COALESCE($4, descricao)
       WHERE id = $5
       RETURNING *`,
      [
        nome_gasto,
        valor ? parseFloat(valor) : null,
        data_gasto,
        descricao || null,
        id
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Gasto do mês atualizado com sucesso',
      gasto_mes: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar gasto do mês:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// Deletar gasto do mês
export const deleteGastoMes = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Verificar se gasto do mês existe
    const gastoExistente = await client.query(
      'SELECT * FROM despesas_mes WHERE id = $1',
      [id]
    );

    if (gastoExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Gasto do mês não encontrado' });
    }

    await client.query('DELETE FROM despesas_mes WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      message: 'Gasto do mês deletado com sucesso'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar gasto do mês:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  } finally {
    client.release();
  }
};






