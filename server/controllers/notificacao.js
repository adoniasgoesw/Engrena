import pool from '../config/db.js';

// Criar notificação
export const createNotificacao = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      tipo,
      referencia_id,
      titulo,
      mensagem,
      remetente_id,
      destinatario_id,
      prioridade = 'Normal'
    } = req.body;

    // Validar dados obrigatórios
    if (!tipo || !titulo || !mensagem) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Tipo, título e mensagem são obrigatórios' 
      });
    }

    // Se houver destinatário, verificar se existe
    if (destinatario_id) {
      const destinatarioCheck = await client.query(
        'SELECT id FROM usuarios WHERE id = $1',
        [destinatario_id]
      );
      
      if (destinatarioCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Destinatário não encontrado' });
      }
    }

    // Se houver remetente, verificar se existe
    if (remetente_id) {
      const remetenteCheck = await client.query(
        'SELECT id FROM usuarios WHERE id = $1',
        [remetente_id]
      );
      
      if (remetenteCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Remetente não encontrado' });
      }
    }

    const {
      referencia_tipo,
      link_url,
      metadata = {}
    } = req.body;

    // Inserir notificação
    const result = await client.query(
      `INSERT INTO notificacoes (
        tipo,
        referencia_id,
        referencia_tipo,
        titulo,
        mensagem,
        remetente_id,
        destinatario_id,
        prioridade,
        aberta,
        link_url,
        metadata,
        data_criacao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        tipo,
        referencia_id || null,
        referencia_tipo || null,
        titulo,
        mensagem,
        remetente_id || null,
        destinatario_id || null,
        prioridade,
        true, // aberta = true significa não lida
        link_url || null,
        JSON.stringify(metadata)
      ]
    );

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Notificação criada com sucesso',
      notificacao: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// Listar notificações de um usuário
export const getNotificacoes = async (req, res) => {
  try {
    const { usuario_id } = req.query;
    
    if (!usuario_id) {
      return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    }

    const result = await pool.query(
      `SELECT 
        n.*,
        rem.nome as remetente_nome,
        rem.cargo as remetente_cargo,
        dest.nome as destinatario_nome,
        dest.cargo as destinatario_cargo,
        COALESCE(os_solicitacao.codigo, os_ordem.codigo) as ordem_codigo,
        os_ordem.cliente_id as ordem_cliente_id,
        os_ordem.previsao_saida as ordem_previsao_saida,
        os_ordem.descricao as ordem_descricao,
        os_ordem.observacoes as ordem_observacoes,
        os_ordem.total as ordem_total,
        os_ordem.status as ordem_status,
        os_ordem.resposavel as ordem_responsavel_id,
        resp.nome as responsavel_nome,
        c.nome as cliente_nome,
        v.marca as veiculo_marca,
        v.modelo as veiculo_modelo,
        v.placa as veiculo_placa
      FROM notificacoes n
      LEFT JOIN usuarios rem ON n.remetente_id = rem.id
      LEFT JOIN usuarios dest ON n.destinatario_id = dest.id
      LEFT JOIN solicitacoes s ON n.referencia_id = s.id 
        AND (n.tipo = 'Solicitação' OR n.tipo LIKE 'Solicitação%')
      LEFT JOIN ordens_servico os_solicitacao ON s.ordem_servico_id = os_solicitacao.id OR s.ordem_id = os_solicitacao.id
      LEFT JOIN ordens_servico os_ordem ON n.referencia_id = os_ordem.id 
        AND (n.tipo = 'Ordem' OR n.tipo LIKE 'Ordem%')
      LEFT JOIN clientes c ON os_ordem.cliente_id = c.id
      LEFT JOIN veiculos v ON os_ordem.veiculo_id = v.id
      LEFT JOIN usuarios resp ON os_ordem.resposavel = resp.id
      WHERE (
        n.destinatario_id = $1 
        OR (n.destinatario_id IS NULL AND n.remetente_id != $1)
        OR (n.tipo IN ('pagamento_realizado', 'pagamento_aprovado') AND n.destinatario_id IS NULL)
      )
      ORDER BY n.aberta DESC, n.data_criacao DESC
      LIMIT 50`,
      [usuario_id]
    );

    res.json({ notificacoes: result.rows });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Marcar notificação como lida
export const marcarComoLida = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Verificar se a notificação existe
    const notificacaoCheck = await client.query(
      'SELECT id FROM notificacoes WHERE id = $1',
      [id]
    );
    
    if (notificacaoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    // Atualizar notificação
    // aberta = false significa lida
    const result = await client.query(
      `UPDATE notificacoes 
       SET aberta = false, lida_em = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    
    res.json({
      message: 'Notificação marcada como lida',
      notificacao: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// Marcar todas como lidas
export const marcarTodasComoLidas = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    }

    // Atualizar todas as notificações não lidas do usuário
    // aberta = false significa lida
    const result = await client.query(
      `UPDATE notificacoes 
       SET aberta = false, lida_em = NOW()
       WHERE (
         destinatario_id = $1 
         OR (destinatario_id IS NULL AND remetente_id != $1)
         OR (tipo IN ('pagamento_realizado', 'pagamento_aprovado') AND destinatario_id IS NULL)
       )
       AND aberta = true
       RETURNING id`,
      [usuario_id]
    );

    await client.query('COMMIT');
    
    res.json({
      message: `${result.rows.length} notificação(ões) marcada(s) como lida(s)`,
      quantidade: result.rows.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// Deletar notificação
export const deleteNotificacao = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Verificar se a notificação existe
    const notificacaoCheck = await client.query(
      'SELECT id FROM notificacoes WHERE id = $1',
      [id]
    );
    
    if (notificacaoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    // Deletar notificação
    await client.query(
      'DELETE FROM notificacoes WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');
    
    res.json({ message: 'Notificação deletada com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

