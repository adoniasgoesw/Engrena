import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

export const registerUser = async (req, res) => {
  try {
    const {
      // Dados do estabelecimento
      businessName,
      cnpj,
      address,
      
      // Dados do usuário
      fullName,
      cpf,
      whatsapp,
      email,
      password
    } = req.body;

    // Validações básicas
    if (!businessName || !address) {
      return res.status(400).json({ 
        error: 'Nome do estabelecimento e endereço são obrigatórios' 
      });
    }

    if (!fullName || !cpf || !email || !password || !whatsapp) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios do usuário não foram fornecidos' 
      });
    }

    // Iniciar transação
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Criar estabelecimento
      const estabelecimentoResult = await client.query(
        `INSERT INTO estabelecimentos (nome, cnpj, endereco, status)
         VALUES ($1, $2, $3, 'Ativo')
         RETURNING id`,
        [businessName, cnpj || null, address]
      );

      const estabelecimentoId = estabelecimentoResult.rows[0].id;

      // 2. Hashear senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // 3. Criar usuário
      const usuarioResult = await client.query(
        `INSERT INTO usuarios (nome, cpf, whatsapp, email, senha, cargo, estabelecimento_id, status)
         VALUES ($1, $2, $3, $4, $5, 'Administrador', $6, 'Ativo')
         RETURNING id, nome, cpf, email, cargo, status`,
        [fullName, cpf, whatsapp, email, hashedPassword, estabelecimentoId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Conta criada com sucesso!',
        user: usuarioResult.rows[0],
        estabelecimentoId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Erro no registro:', error);
    
    // Verificar se é erro de CPF duplicado
    if (error.code === '23505' && error.constraint === 'usuarios_cpf_key') {
      return res.status(400).json({ 
        error: 'Este CPF já está cadastrado' 
      });
    }
    
    // Verificar se é erro de CNPJ duplicado (apenas se CNPJ foi fornecido)
    if (error.code === '23505' && error.constraint === 'estabelecimentos_cnpj_key' && cnpj) {
      return res.status(400).json({ 
        error: 'Este CNPJ já está cadastrado' 
      });
    }

    res.status(500).json({ 
      error: 'Erro ao criar conta. Tente novamente.' 
    });
  }
};
