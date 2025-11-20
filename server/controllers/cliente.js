import pool from '../config/db.js';

export const createCliente = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Dados recebidos:', req.body);
    
    const {
      estabelecimento_id,
      nome,
      cpf,
      cnpj,
      whatsapp,
      email,
      endereco,
      observacoes,
      status = 'Ativo'
    } = req.body;

    // Validar dados obrigatórios
    if (!estabelecimento_id || !nome) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID e nome são obrigatórios' 
      });
    }

    // Verificar se o estabelecimento existe
    const estabelecimentoCheck = await client.query(
      'SELECT id FROM estabelecimentos WHERE id = $1 AND status = $2',
      [estabelecimento_id, 'Ativo']
    );

    if (estabelecimentoCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Estabelecimento não encontrado ou inativo' 
      });
    }

    // Inserir novo cliente
    console.log('Inserindo cliente com dados:', { estabelecimento_id, nome, cpf, cnpj, whatsapp, email, endereco, observacoes, status });
    
    const result = await client.query(
      `INSERT INTO clientes (estabelecimento_id, nome, cpf, cnpj, whatsapp, email, endereco, observacoes, status, criado_em) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
       RETURNING *`,
      [
        estabelecimento_id, 
        nome, 
        cpf || null, 
        cnpj || null, 
        whatsapp || null, 
        email || null, 
        endereco || null, 
        observacoes || null, 
        status
      ]
    );

    console.log('Cliente inserido:', result.rows[0]);
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Cliente cadastrado com sucesso!',
      cliente: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar cliente:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  } finally {
    client.release();
  }
};

export const getClientes = async (req, res) => {
  try {
    const { estabelecimento_id } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID é obrigatório' 
      });
    }

    const result = await pool.query(
      `SELECT * FROM clientes 
       WHERE estabelecimento_id = $1
       ORDER BY nome ASC`,
      [estabelecimento_id]
    );

    res.json({
      clientes: result.rows
    });

  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

export const updateCliente = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      nome,
      cpf,
      cnpj,
      whatsapp,
      email,
      endereco,
      observacoes,
      status
    } = req.body;

    // Verificar se o cliente existe
    const clienteExistente = await client.query(
      'SELECT * FROM clientes WHERE id = $1',
      [id]
    );

    if (clienteExistente.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Cliente não encontrado' 
      });
    }

    // Atualizar cliente
    const result = await client.query(
      `UPDATE clientes 
       SET nome = COALESCE($1, nome), 
           cpf = COALESCE($2, cpf), 
           cnpj = COALESCE($3, cnpj),
           whatsapp = COALESCE($4, whatsapp),
           email = COALESCE($5, email),
           endereco = COALESCE($6, endereco),
           observacoes = COALESCE($7, observacoes),
           status = COALESCE($8, status)
       WHERE id = $9 
       RETURNING *`,
      [nome, cpf, cnpj, whatsapp, email, endereco, observacoes, status, id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Cliente atualizado com sucesso!',
      cliente: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  } finally {
    client.release();
  }
};

export const deleteCliente = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Verificar se o cliente existe
    const clienteExistente = await client.query(
      'SELECT * FROM clientes WHERE id = $1',
      [id]
    );

    if (clienteExistente.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Cliente não encontrado' 
      });
    }

    // Soft delete - apenas alterar status para 'Inativo'
    const result = await client.query(
      `UPDATE clientes 
       SET status = 'Inativo'
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Cliente removido com sucesso!',
      cliente: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao remover cliente:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  } finally {
    client.release();
  }
};

