import pool from '../config/db.js';

// Criar serviço
export const createServico = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      estabelecimento_id,
      categoria_id,
      nome,
      preco,
      tempo_servico,
      status
    } = req.body;

    // Verificar se a categoria existe
    const categoriaExistente = await client.query(
      'SELECT id FROM categorias WHERE id = $1 AND estabelecimento_id = $2',
      [categoria_id, estabelecimento_id]
    );

    if (categoriaExistente.rows.length === 0) {
      return res.status(400).json({
        error: 'Categoria não encontrada'
      });
    }

    // Obter URL da imagem do Cloudinary
    let imagem = null;
    if (req.file) {
      imagem = req.file.secure_url || req.file.url || req.file.path;
      console.log('URL da imagem do Cloudinary:', imagem);
    }

    // Criar serviço (tipo = 'servico')
    const result = await client.query(
      `INSERT INTO itens (
        categoria_id, nome, tipo, preco, tempo_servico, 
        status, imagem, criado_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [
        categoria_id,
        nome,
        'servico', // Tipo fixo como serviço
        parseFloat(preco),
        parseInt(tempo_servico) || null,
        status || 'Ativo',
        imagem
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Serviço cadastrado com sucesso!',
      servico: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar serviço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  } finally {
    client.release();
  }
};

// Listar serviços
export const getServicos = async (req, res) => {
  try {
    const { estabelecimento_id } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({
        error: 'ID do estabelecimento é obrigatório'
      });
    }

    const result = await pool.query(
      `SELECT 
        i.*,
        c.nome as categoria_nome,
        c.imagem as categoria_imagem
      FROM itens i
      LEFT JOIN categorias c ON i.categoria_id = c.id
      WHERE c.estabelecimento_id = $1 AND i.tipo = 'servico'
      ORDER BY i.criado_em DESC`,
      [estabelecimento_id]
    );

    res.json({
      servicos: result.rows
    });

  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

// Atualizar serviço
export const updateServico = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      categoria_id,
      nome,
      preco,
      tempo_servico,
      status
    } = req.body;

    // Verificar se o serviço existe
    const servicoExistente = await client.query(
      'SELECT id FROM itens WHERE id = $1',
      [id]
    );

    if (servicoExistente.rows.length === 0) {
      return res.status(404).json({
        error: 'Serviço não encontrado'
      });
    }

    // Verificar se a categoria existe (se fornecida)
    if (categoria_id) {
      const categoriaExistente = await client.query(
        'SELECT id FROM categorias WHERE id = $1',
        [categoria_id]
      );

      if (categoriaExistente.rows.length === 0) {
        return res.status(400).json({
          error: 'Categoria não encontrada'
        });
      }
    }

    // Obter URL da imagem do Cloudinary se foi enviada
    let imagem = null;
    if (req.file) {
      imagem = req.file.secure_url || req.file.url || req.file.path;
    }

    // Atualizar serviço
    const result = await client.query(
      `UPDATE itens SET 
        categoria_id = COALESCE($1, categoria_id),
        nome = COALESCE($2, nome),
        preco = COALESCE($3, preco),
        tempo_servico = COALESCE($4, tempo_servico),
        status = COALESCE($5, status),
        imagem = COALESCE($6, imagem)
      WHERE id = $7
      RETURNING *`,
      [
        categoria_id || null,
        nome || null,
        preco ? parseFloat(preco) : null,
        tempo_servico ? parseInt(tempo_servico) : null,
        status || null,
        imagem,
        id
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Serviço atualizado com sucesso!',
      servico: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar serviço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  } finally {
    client.release();
  }
};

// Deletar serviço (soft delete)
export const deleteServico = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Verificar se o serviço existe
    const servicoExistente = await client.query(
      'SELECT id FROM itens WHERE id = $1 AND tipo = $2',
      [id, 'servico']
    );

    if (servicoExistente.rows.length === 0) {
      return res.status(404).json({
        error: 'Serviço não encontrado'
      });
    }

    // Soft delete - marcar como inativo
    await client.query(
      'UPDATE itens SET status = $1 WHERE id = $2',
      ['Inativo', id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Serviço removido com sucesso!'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao remover serviço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  } finally {
    client.release();
  }
};

// Toggle status do serviço
export const toggleStatusServico = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { status } = req.body;

    // Verificar se o serviço existe
    const servicoExistente = await client.query(
      'SELECT id, status FROM itens WHERE id = $1',
      [id]
    );

    if (servicoExistente.rows.length === 0) {
      return res.status(404).json({
        error: 'Serviço não encontrado'
      });
    }

    // Atualizar status
    const result = await client.query(
      'UPDATE itens SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    await client.query('COMMIT');

    res.json({
      message: `Serviço ${status === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`,
      servico: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao alterar status do serviço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  } finally {
    client.release();
  }
};

