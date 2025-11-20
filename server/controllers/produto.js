import pool from '../config/db.js';

// Criar produto
export const createProduto = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      estabelecimento_id,
      categoria_id,
      nome,
      tipo,
      preco,
      preco_custo,
      estoque,
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

    // Criar produto (tipo = 'produto')
    const result = await client.query(
      `INSERT INTO itens (
        categoria_id, nome, tipo, preco, preco_custo, 
        estoque, status, imagem, criado_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        categoria_id,
        nome,
        'produto', // Tipo fixo como produto
        parseFloat(preco),
        parseFloat(preco_custo) || null,
        parseInt(estoque) || null,
        status || 'Ativo',
        req.file ? (req.file.secure_url || req.file.url || req.file.path) : null
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Produto cadastrado com sucesso!',
      produto: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  } finally {
    client.release();
  }
};

// Listar produtos
export const getProdutos = async (req, res) => {
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
      WHERE c.estabelecimento_id = $1 AND i.tipo = 'produto'
      ORDER BY i.criado_em DESC`,
      [estabelecimento_id]
    );

    res.json({
      produtos: result.rows
    });

  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

// Buscar produto por ID
export const getProdutoById = async (req, res) => {
  try {
    const { id } = req.params;
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
      WHERE i.id = $1 AND c.estabelecimento_id = $2`,
      [id, estabelecimento_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    res.json({
      produto: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

// Atualizar produto
export const updateProduto = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      categoria_id,
      nome,
      preco,
      preco_custo,
      estoque,
      status
    } = req.body;

    // Verificar se o produto existe
    const produtoExistente = await client.query(
      'SELECT id FROM itens WHERE id = $1',
      [id]
    );

    if (produtoExistente.rows.length === 0) {
      return res.status(404).json({
        error: 'Produto não encontrado'
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

    // Atualizar produto
    const result = await client.query(
      `UPDATE itens SET 
        categoria_id = COALESCE($1, categoria_id),
        nome = COALESCE($2, nome),
        preco = COALESCE($3, preco),
        preco_custo = COALESCE($4, preco_custo),
        estoque = COALESCE($5, estoque),
        status = COALESCE($6, status),
        imagem = COALESCE($7, imagem)
      WHERE id = $8
      RETURNING *`,
      [
        categoria_id || null,
        nome || null,
        preco ? parseFloat(preco) : null,
        preco_custo ? parseFloat(preco_custo) : null,
        estoque ? parseInt(estoque) : null,
        status || null,
        req.file ? (req.file.secure_url || req.file.url || req.file.path) : null,
        id
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Produto atualizado com sucesso!',
      produto: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  } finally {
    client.release();
  }
};

// Deletar produto (soft delete)
export const deleteProduto = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Verificar se o produto existe
    const produtoExistente = await client.query(
      'SELECT id FROM itens WHERE id = $1',
      [id]
    );

    if (produtoExistente.rows.length === 0) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    // Soft delete - marcar como inativo
    await client.query(
      'UPDATE itens SET status = $1 WHERE id = $2',
      ['Inativo', id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Produto removido com sucesso!'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao remover produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  } finally {
    client.release();
  }
};

// Toggle status do produto
export const toggleStatusProduto = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { status } = req.body;

    // Verificar se o produto existe
    const produtoExistente = await client.query(
      'SELECT id, status FROM itens WHERE id = $1',
      [id]
    );

    if (produtoExistente.rows.length === 0) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    // Atualizar status
    const result = await client.query(
      'UPDATE itens SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    await client.query('COMMIT');

    res.json({
      message: `Produto ${status === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`,
      produto: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao alterar status do produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  } finally {
    client.release();
  }
};





