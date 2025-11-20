import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

export const loginUser = async (req, res) => {
  try {
    const { cpf, password } = req.body;

    // Validações básicas
    if (!cpf || !password) {
      return res.status(400).json({ 
        error: 'CPF e senha são obrigatórios' 
      });
    }

    // Buscar usuário pelo CPF
    const userResult = await pool.query(
      `SELECT u.*, e.nome as estabelecimento_nome, e.cnpj as estabelecimento_cnpj, e.endereco as estabelecimento_endereco
       FROM usuarios u
       JOIN estabelecimentos e ON u.estabelecimento_id = e.id
       WHERE u.cpf = $1 AND u.status = 'Ativo'`,
      [cpf]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'CPF não encontrado ou usuário inativo' 
      });
    }

    const user = userResult.rows[0];

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.senha);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Senha incorreta' 
      });
    }

    // Remover senha da resposta
    const { senha, ...userWithoutPassword } = user;

    // Aqui você pode implementar JWT ou sessão
    // Por enquanto, vamos retornar os dados do usuário
    res.status(200).json({
      message: 'Login realizado com sucesso',
      user: {
        id: userWithoutPassword.id,
        nome: userWithoutPassword.nome,
        cpf: userWithoutPassword.cpf,
        email: userWithoutPassword.email,
        whatsapp: userWithoutPassword.whatsapp,
        cargo: userWithoutPassword.cargo,
        estabelecimento: {
          id: userWithoutPassword.estabelecimento_id,
          nome: userWithoutPassword.estabelecimento_nome,
          cnpj: userWithoutPassword.estabelecimento_cnpj,
          endereco: userWithoutPassword.estabelecimento_endereco
        }
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao fazer login' 
    });
  }
};