import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

// Listar usuários
export const getUsuarios = async (req, res) => {
  try {
    const { estabelecimento_id } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID é obrigatório' 
      });
    }

    const result = await pool.query(
      `SELECT id, nome, cargo, status, email, whatsapp
       FROM usuarios 
       WHERE estabelecimento_id = $1 AND status = 'Ativo'
       ORDER BY nome ASC`,
      [estabelecimento_id]
    );

    res.json({
      usuarios: result.rows
    });

  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

// Criar usuário (vinculado a um estabelecimento existente)
export const createUsuario = async (req, res) => {
  try {
    const {
      estabelecimento_id,
      nome,
      cpf,
      whatsapp,
      email,
      senha,
      cargo = 'Atendente',
      status = 'Ativo'
    } = req.body;

    if (!estabelecimento_id || !nome || !cpf || !email || !senha || !whatsapp || !cargo) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    // Verificar estabelecimento
    const est = await pool.query(
      'SELECT id FROM estabelecimentos WHERE id = $1',
      [estabelecimento_id]
    );
    if (est.rows.length === 0) {
      return res.status(400).json({ error: 'Estabelecimento não encontrado' });
    }

    // Hash da senha
    const hashed = await bcrypt.hash(senha, 10);

    // Inserir usuário
    const result = await pool.query(
      `INSERT INTO usuarios (estabelecimento_id, nome, cpf, whatsapp, email, senha, cargo, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nome, cpf, whatsapp, email, cargo, status`,
      [
        estabelecimento_id,
        nome,
        cpf,
        whatsapp,
        email,
        hashed,
        cargo,
        status
      ]
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      usuario: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'CPF ou e-mail já cadastrado' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar usuário
export const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cpf, whatsapp, email, senha, cargo, status } = req.body;

    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });

    const sets = [];
    const params = [];
    let idx = 1;

    if (nome !== undefined) { sets.push(`nome = $${idx++}`); params.push(nome); }
    if (cpf !== undefined) { sets.push(`cpf = $${idx++}`); params.push(cpf); }
    if (whatsapp !== undefined) { sets.push(`whatsapp = $${idx++}`); params.push(whatsapp); }
    if (email !== undefined) { sets.push(`email = $${idx++}`); params.push(email); }
    if (cargo !== undefined) { sets.push(`cargo = $${idx++}`); params.push(cargo); }
    if (status !== undefined) { sets.push(`status = $${idx++}`); params.push(status); }
    if (senha !== undefined && senha !== '') {
      const hashed = await bcrypt.hash(senha, 10);
      sets.push(`senha = $${idx++}`);
      params.push(hashed);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    params.push(id);
    const sql = `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, nome, cpf, whatsapp, email, cargo, status`;
    const result = await pool.query(sql, params);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    res.json({ message: 'Usuário atualizado com sucesso', usuario: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'CPF ou e-mail já cadastrado' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar usuário
export const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};



