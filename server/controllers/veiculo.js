import pool from '../config/db.js';

export const getVeiculos = async (req, res) => {
  try {
    const { estabelecimento_id } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID é obrigatório' 
      });
    }

    const result = await pool.query(
      `SELECT 
        v.*,
        c.nome as cliente_nome,
        c.cpf as cliente_cpf,
        c.cnpj as cliente_cnpj
       FROM veiculos v
       LEFT JOIN clientes c ON v.cliente_id = c.id
       WHERE v.estabelecimento_id = $1
       ORDER BY v.placa ASC`,
      [estabelecimento_id]
    );

    res.json({
      veiculos: result.rows
    });

  } catch (error) {
    console.error('Erro ao buscar veículos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

export const createVeiculo = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      estabelecimento_id,
      cliente_id,
      placa,
      marca,
      modelo,
      ano,
      cor,
      observacoes,
      status = 'Ativo'
    } = req.body;
    
    // Validar dados obrigatórios
    if (!estabelecimento_id || !cliente_id || !placa || !marca || !modelo) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID, Cliente ID, Placa, Marca e Modelo são obrigatórios' 
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

    // Verificar se o cliente existe e pertence ao mesmo estabelecimento
    const clienteCheck = await client.query(
      'SELECT id FROM clientes WHERE id = $1 AND estabelecimento_id = $2',
      [cliente_id, estabelecimento_id]
    );

    if (clienteCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Cliente não encontrado ou não pertence a este estabelecimento' 
      });
    }

    // Verificar se já existe um veículo com a mesma placa para o estabelecimento
    const veiculoExistente = await client.query(
      'SELECT id FROM veiculos WHERE estabelecimento_id = $1 AND placa = $2 AND status = $3',
      [estabelecimento_id, placa, 'Ativo']
    );

    if (veiculoExistente.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Já existe um veículo com esta placa para o estabelecimento' 
      });
    }

    // Inserir novo veículo
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
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
       RETURNING *`,
      [estabelecimento_id, cliente_id, placa, marca, modelo, ano || null, cor || null, observacoes || null, status]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Veículo cadastrado com sucesso!',
      veiculo: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar veículo:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  } finally {
    client.release();
  }
};

export const updateVeiculo = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      cliente_id,
      placa,
      marca,
      modelo,
      ano,
      cor,
      observacoes,
      status
    } = req.body;

    // Verificar se o veículo existe
    const veiculoExistente = await client.query(
      'SELECT * FROM veiculos WHERE id = $1',
      [id]
    );

    if (veiculoExistente.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Veículo não encontrado' 
      });
    }

    // Se estiver atualizando a placa, verificar se não existe outra com a mesma placa
    if (placa && placa !== veiculoExistente.rows[0].placa) {
      const placaExistente = await client.query(
        'SELECT id FROM veiculos WHERE estabelecimento_id = $1 AND placa = $2 AND id != $3 AND status = $4',
        [veiculoExistente.rows[0].estabelecimento_id, placa, id, 'Ativo']
      );

      if (placaExistente.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Já existe outro veículo com esta placa para o estabelecimento' 
        });
      }
    }

    // Atualizar veículo
    const result = await client.query(
      `UPDATE veiculos 
       SET cliente_id = COALESCE($1, cliente_id),
           placa = COALESCE($2, placa),
           marca = COALESCE($3, marca),
           modelo = COALESCE($4, modelo),
           ano = COALESCE($5, ano),
           cor = COALESCE($6, cor),
           observacoes = COALESCE($7, observacoes),
           status = COALESCE($8, status)
       WHERE id = $9 
       RETURNING *`,
      [cliente_id, placa, marca, modelo, ano, cor, observacoes, status, id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Veículo atualizado com sucesso!',
      veiculo: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar veículo:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  } finally {
    client.release();
  }
};

export const deleteVeiculo = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Verificar se o veículo existe
    const veiculoExistente = await client.query(
      'SELECT * FROM veiculos WHERE id = $1',
      [id]
    );

    if (veiculoExistente.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Veículo não encontrado' 
      });
    }

    // Delete físico - excluir o veículo do banco de dados
    await client.query(
      'DELETE FROM veiculos WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Veículo excluído com sucesso!',
      deleted: true
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir veículo:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  } finally {
    client.release();
  }
};

