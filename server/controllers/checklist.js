import pool from '../config/db.js';

// Criar item de checklist
export const createChecklistItem = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      descricao,
      prioridade = 'Média',
      status = 'Pendente'
    } = req.body;

    // Validar dados obrigatórios
    if (!descricao || !descricao.trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Descrição do item é obrigatória' 
      });
    }

    // Verificar se a ordem existe
    const ordemCheck = await client.query(
      'SELECT id FROM ordens_servico WHERE id = $1',
      [id]
    );

    if (ordemCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    // Inserir item de checklist
    const result = await client.query(
      `INSERT INTO checklist (
        ordem_id,
        descricao,
        prioridade,
        status,
        data_criacao,
        data_atualizacao
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *`,
      [
        id,
        descricao.trim(),
        prioridade,
        status
      ]
    );

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Item de checklist criado com sucesso',
      item: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar item de checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// Listar itens de checklist de uma ordem
export const getChecklist = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        c.id,
        c.ordem_id,
        c.descricao,
        c.prioridade,
        c.status,
        c.data_criacao,
        c.data_atualizacao
      FROM checklist c
      WHERE c.ordem_id = $1
      ORDER BY c.data_criacao ASC`,
      [id]
    );

    res.json({ checklist: result.rows });
  } catch (error) {
    console.error('Erro ao buscar checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar item de checklist
export const updateChecklistItem = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id, itemId } = req.params;
    const {
      descricao,
      prioridade,
      status
    } = req.body;

    // Verificar se o item existe
    const itemCheck = await client.query(
      'SELECT id FROM checklist WHERE id = $1 AND ordem_id = $2',
      [itemId, id]
    );
    
    if (itemCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item de checklist não encontrado' });
    }

    // Construir query de atualização dinâmica
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (descricao !== undefined) {
      updates.push(`descricao = $${paramCount++}`);
      values.push(descricao.trim());
    }
    if (prioridade !== undefined) {
      updates.push(`prioridade = $${paramCount++}`);
      values.push(prioridade);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push(`data_atualizacao = NOW()`);
    values.push(itemId, id);

    const result = await client.query(
      `UPDATE checklist 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND ordem_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    await client.query('COMMIT');

    res.json({
      message: 'Item de checklist atualizado com sucesso',
      item: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar item de checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// Deletar item de checklist
export const deleteChecklistItem = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id, itemId } = req.params;

    // Verificar se o item existe
    const itemCheck = await client.query(
      'SELECT id FROM checklist WHERE id = $1 AND ordem_id = $2',
      [itemId, id]
    );
    
    if (itemCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item de checklist não encontrado' });
    }

    // Deletar item
    await client.query(
      'DELETE FROM checklist WHERE id = $1 AND ordem_id = $2',
      [itemId, id]
    );

    await client.query('COMMIT');
    
    res.json({ message: 'Item de checklist deletado com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar item de checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

