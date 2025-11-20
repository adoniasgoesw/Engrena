import pool from '../config/db.js';

export const createCategoria = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Dados recebidos:', req.body);
    console.log('Arquivo recebido:', req.file);
    
    const {
      estabelecimento_id,
      nome,
      status = 'Ativo'
    } = req.body;
    
    // Obter URL da imagem do Cloudinary
    // CloudinaryStorage retorna a URL em req.file.path ou req.file.secure_url
    let imagem = null;
    if (req.file) {
      // Priorizar secure_url (HTTPS), senão usar path ou url
      imagem = req.file.secure_url || req.file.url || req.file.path;
      console.log('URL da imagem do Cloudinary:', imagem);
    }

    // Validar dados obrigatórios
    if (!estabelecimento_id || !nome) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID e nome são obrigatórios' 
      });
    }

    if (!imagem) {
      return res.status(400).json({ 
        error: 'Imagem da categoria é obrigatória' 
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

    // Verificar se já existe uma categoria com o mesmo nome para o estabelecimento
    const categoriaExistente = await client.query(
      'SELECT id FROM categorias WHERE estabelecimento_id = $1 AND nome = $2 AND status = $3',
      [estabelecimento_id, nome, 'Ativo']
    );

    if (categoriaExistente.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Já existe uma categoria com este nome para o estabelecimento' 
      });
    }

    // Inserir nova categoria
    console.log('Inserindo categoria com dados:', { estabelecimento_id, nome, imagem, status });
    
    const result = await client.query(
      `INSERT INTO categorias (estabelecimento_id, nome, imagem, status, criado_em) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING *`,
      [estabelecimento_id, nome, imagem || null, status]
    );

    console.log('Categoria inserida:', result.rows[0]);
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Categoria cadastrada com sucesso!',
      categoria: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar categoria:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  } finally {
    client.release();
  }
};

export const getCategorias = async (req, res) => {
  try {
    const { estabelecimento_id } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID é obrigatório' 
      });
    }

    // Listar todas as categorias do estabelecimento (ativas e inativas)
    const result = await pool.query(
      `SELECT * FROM categorias 
       WHERE estabelecimento_id = $1
       ORDER BY status DESC, nome ASC`,
      [estabelecimento_id]
    );

    res.json({
      categorias: result.rows
    });

  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

export const updateCategoria = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      nome,
      imagem,
      status
    } = req.body;

    // Verificar se a categoria existe
    const categoriaExistente = await client.query(
      'SELECT * FROM categorias WHERE id = $1',
      [id]
    );

    if (categoriaExistente.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Categoria não encontrada' 
      });
    }

    // Atualizar categoria
    const result = await client.query(
      `UPDATE categorias 
       SET nome = COALESCE($1, nome), 
           imagem = COALESCE($2, imagem), 
           status = COALESCE($3, status)
       WHERE id = $4 
       RETURNING *`,
      [nome, imagem, status, id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Categoria atualizada com sucesso!',
      categoria: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  } finally {
    client.release();
  }
};

export const deleteCategoria = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Verificar se a categoria existe
    const categoriaExistente = await client.query(
      'SELECT * FROM categorias WHERE id = $1',
      [id]
    );

    if (categoriaExistente.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Categoria não encontrada' 
      });
    }

    // Soft delete - apenas alterar status para 'Inativo'
    const result = await client.query(
      `UPDATE categorias 
       SET status = 'Inativo'
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Categoria removida com sucesso!',
      categoria: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao remover categoria:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  } finally {
    client.release();
  }
};
