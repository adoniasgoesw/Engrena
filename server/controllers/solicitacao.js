import pool from '../config/db.js';

// Função auxiliar para obter nome do solicitante
const getNomeSolicitante = async (client, solicitanteId) => {
  try {
    const result = await client.query(
      'SELECT nome FROM usuarios WHERE id = $1',
      [solicitanteId]
    );
    return result.rows[0]?.nome || 'Usuário';
  } catch (error) {
    return 'Usuário';
  }
};

// Criar solicitação
export const createSolicitacao = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      ordem_servico_id,
      solicitante_id,
      destinatario_id,
      assunto,
      tipo,
      descricao,
      prioridade = 'Média',
      status = 'Pendente'
    } = req.body;

    // Validar dados obrigatórios
    if (!ordem_servico_id || !solicitante_id || !assunto || !tipo || !descricao) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Ordem de serviço, solicitante, assunto, tipo e descrição são obrigatórios' 
      });
    }

    // Verificar se a ordem existe
    const ordemCheck = await client.query(
      'SELECT id FROM ordens_servico WHERE id = $1',
      [ordem_servico_id]
    );
    
    if (ordemCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    // Verificar se o solicitante existe
    const solicitanteCheck = await client.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [solicitante_id]
    );
    
    if (solicitanteCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Solicitante não encontrado' });
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

    // Inserir solicitação (incluindo ordem_id que é sinônimo de ordem_servico_id)
    const result = await client.query(
      `INSERT INTO solicitacoes (
        ordem_servico_id,
        ordem_id,
        solicitante_id,
        destinatario_id,
        assunto,
        tipo,
        descricao,
        prioridade,
        status,
        data_criacao,
        data_atualizacao
      ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        ordem_servico_id,
        solicitante_id,
        destinatario_id || null,
        assunto,
        tipo,
        descricao,
        prioridade,
        status
      ]
    );

    // Se for "Solicitação de peça", atualizar status da ordem para "Aguardando Peças"
    let ordemAtualizada = null;
    if (tipo === 'Solicitação de peça') {
      const ordemUpdateResult = await client.query(
        `UPDATE ordens_servico 
         SET status = 'Aguardando Peças'
         WHERE id = $1
         RETURNING *`,
        [ordem_servico_id]
      );
      
      if (ordemUpdateResult.rows.length > 0) {
        ordemAtualizada = ordemUpdateResult.rows[0];
        console.log(`✅ Status da ordem ${ordem_servico_id} atualizado para 'Aguardando Peças'`);
      }
    }

    await client.query('COMMIT');
    
    // Criar notificação para o destinatário
    if (destinatario_id) {
      try {
        // Buscar nome do solicitante
        const nomeSolicitante = await getNomeSolicitante(client, solicitante_id);
        
        const notificacaoData = {
          tipo: 'Solicitação',
          referencia_id: result.rows[0].id,
          titulo: `Nova Solicitação: ${assunto}`,
          mensagem: `${nomeSolicitante} enviou uma solicitação de "${tipo}" para você: ${descricao.substring(0, 150)}${descricao.length > 150 ? '...' : ''}`,
          remetente_id: solicitante_id,
          destinatario_id: destinatario_id,
          prioridade: prioridade === 'Urgente' ? 'Urgente' : prioridade === 'Alta' ? 'Alta' : 'Normal'
        };

        await client.query('BEGIN');
        await client.query(
          `INSERT INTO notificacoes (
            tipo, referencia_id, titulo, mensagem, remetente_id, destinatario_id, prioridade, aberta, data_criacao
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            notificacaoData.tipo,
            notificacaoData.referencia_id,
            notificacaoData.titulo,
            notificacaoData.mensagem,
            notificacaoData.remetente_id,
            notificacaoData.destinatario_id,
            notificacaoData.prioridade,
            false
          ]
        );
        await client.query('COMMIT');
        
        // Disparar evento para notificar o frontend (via WebSocket ou outro método)
        // Por enquanto, o frontend faz polling, mas podemos adicionar aqui uma notificação
        console.log(`✅ Notificação criada para usuário ${destinatario_id}`);
      } catch (notifError) {
        console.error('Erro ao criar notificação:', notifError);
        // Não falhar a criação da solicitação se a notificação falhar
      }
    }
    
    res.status(201).json({
      message: 'Solicitação criada com sucesso',
      solicitacao: result.rows[0],
      ordem: ordemAtualizada // Retornar ordem atualizada se foi modificada
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar solicitação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// Listar solicitações de uma ordem
export const getSolicitacoes = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID da ordem é obrigatório' });
    }

    const result = await pool.query(
      `SELECT 
        s.*,
        sol.nome as solicitante_nome,
        sol.cargo as solicitante_cargo,
        dest.nome as destinatario_nome,
        dest.cargo as destinatario_cargo
      FROM solicitacoes s
      LEFT JOIN usuarios sol ON s.solicitante_id = sol.id
      LEFT JOIN usuarios dest ON s.destinatario_id = dest.id
      WHERE s.ordem_servico_id = $1
      ORDER BY s.data_criacao DESC`,
      [id]
    );

    res.json({ solicitacoes: result.rows });
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar solicitação
export const updateSolicitacao = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id, solicitacaoId } = req.params;
    const {
      assunto,
      tipo,
      descricao,
      prioridade,
      status,
      destinatario_id,
      usuario_responsavel_id
    } = req.body;

    // Buscar solicitação atual para comparar status
    const solicitacaoAtual = await client.query(
      `SELECT s.*, sol.nome as solicitante_nome, dest.nome as destinatario_nome
       FROM solicitacoes s
       LEFT JOIN usuarios sol ON s.solicitante_id = sol.id
       LEFT JOIN usuarios dest ON s.destinatario_id = dest.id
       WHERE s.id = $1 AND s.ordem_servico_id = $2`,
      [solicitacaoId, id]
    );
    
    if (solicitacaoAtual.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    const solicitacao = solicitacaoAtual.rows[0];
    const statusAnterior = solicitacao.status;

    // Construir query de atualização dinâmica
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (assunto !== undefined) {
      updates.push(`assunto = $${paramCount++}`);
      values.push(assunto);
    }
    if (tipo !== undefined) {
      updates.push(`tipo = $${paramCount++}`);
      values.push(tipo);
    }
    if (descricao !== undefined) {
      updates.push(`descricao = $${paramCount++}`);
      values.push(descricao);
    }
    if (prioridade !== undefined) {
      updates.push(`prioridade = $${paramCount++}`);
      values.push(prioridade);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (destinatario_id !== undefined) {
      updates.push(`destinatario_id = $${paramCount++}`);
      values.push(destinatario_id || null);
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push(`data_atualizacao = NOW()`);
    values.push(solicitacaoId, id);

    const result = await client.query(
      `UPDATE solicitacoes 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND ordem_servico_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    // Se for "Solicitação de peça" finalizada, verificar se deve voltar status da ordem para "Em Andamento"
    let ordemAtualizada = null;
    if (solicitacao.tipo === 'Solicitação de peça' && status === 'Finalizado') {
      // Verificar se a ordem está "Aguardando Peças"
      const ordemCheck = await client.query(
        'SELECT id, status FROM ordens_servico WHERE id = $1 AND status = $2',
        [id, 'Aguardando Peças']
      );
      
      if (ordemCheck.rows.length > 0) {
        // Verificar se não há outras solicitações de peça pendentes ou em andamento
        const outrasSolicitacoes = await client.query(
          `SELECT COUNT(*) as count 
           FROM solicitacoes 
           WHERE ordem_servico_id = $1 
           AND tipo = 'Solicitação de peça' 
           AND id != $2 
           AND status NOT IN ('Finalizado', 'Cancelado', 'Recusada')`,
          [id, solicitacaoId]
        );
        
        const outrasCount = parseInt(outrasSolicitacoes.rows[0]?.count || 0);
        
        // Se não houver outras solicitações de peça pendentes, voltar ordem para "Em Andamento"
        if (outrasCount === 0) {
          const ordemUpdateResult = await client.query(
            `UPDATE ordens_servico 
             SET status = 'Em Andamento'
             WHERE id = $1
             RETURNING *`,
            [id]
          );
          
          if (ordemUpdateResult.rows.length > 0) {
            ordemAtualizada = ordemUpdateResult.rows[0];
            console.log(`✅ Status da ordem ${id} atualizado para 'Em Andamento' após finalizar solicitação de peça`);
          }
        }
      }
    }

    // Criar notificações se o status mudou para Em Andamento (aceita) ou Recusada
    if (status !== undefined && status !== statusAnterior && (status === 'Em Andamento' || status === 'Recusada')) {
      try {
        // Buscar nome do usuário responsável (quem aceitou/recusou)
        const responsavelNome = usuario_responsavel_id 
          ? await getNomeSolicitante(client, usuario_responsavel_id)
          : 'Sistema';

        // Notificação para o solicitante
        if (solicitacao.solicitante_id) {
          const tituloSolicitante = status === 'Em Andamento' 
            ? `Solicitação Aceita: ${solicitacao.assunto || 'Sua solicitação'}`
            : `Solicitação Recusada: ${solicitacao.assunto || 'Sua solicitação'}`;
          
          const mensagemSolicitante = status === 'Em Andamento'
            ? `Sua solicitação "${solicitacao.assunto || 'solicitação'}" foi aceita por ${responsavelNome}.`
            : `Sua solicitação "${solicitacao.assunto || 'solicitação'}" foi recusada por ${responsavelNome}.`;

          // Usar tipo específico para diferenciar aceita/recusada
          const tipoNotificacao = status === 'Em Andamento' ? 'Solicitação Aceita' : 'Solicitação Recusada';

          await client.query(
            `INSERT INTO notificacoes (
              tipo, referencia_id, titulo, mensagem, remetente_id, destinatario_id, prioridade, aberta, data_criacao
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              tipoNotificacao,
              solicitacaoId,
              tituloSolicitante,
              mensagemSolicitante,
              usuario_responsavel_id || null,
              solicitacao.solicitante_id,
              solicitacao.prioridade === 'Urgente' ? 'Urgente' : solicitacao.prioridade === 'Alta' ? 'Alta' : 'Normal',
              false
            ]
          );
        }

        // Notificação para quem aceitou/recusou (se for diferente do solicitante)
        if (usuario_responsavel_id && usuario_responsavel_id !== solicitacao.solicitante_id) {
          const tituloResponsavel = status === 'Em Andamento'
            ? `Você Aceitou: ${solicitacao.assunto || 'Solicitação'}`
            : `Você Recusou: ${solicitacao.assunto || 'Solicitação'}`;
          
          const mensagemResponsavel = status === 'Em Andamento'
            ? `Você aceitou a solicitação "${solicitacao.assunto || 'solicitação'}" de ${solicitacao.solicitante_nome || 'um usuário'}.`
            : `Você recusou a solicitação "${solicitacao.assunto || 'solicitação'}" de ${solicitacao.solicitante_nome || 'um usuário'}.`;

          // Usar tipo específico para diferenciar aceita/recusada
          const tipoNotificacaoResponsavel = status === 'Em Andamento' ? 'Solicitação Aceita' : 'Solicitação Recusada';

          await client.query(
            `INSERT INTO notificacoes (
              tipo, referencia_id, titulo, mensagem, remetente_id, destinatario_id, prioridade, aberta, data_criacao
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              tipoNotificacaoResponsavel,
              solicitacaoId,
              tituloResponsavel,
              mensagemResponsavel,
              solicitacao.solicitante_id || null,
              usuario_responsavel_id,
              'Normal',
              false
            ]
          );
        }
      } catch (notifError) {
        console.error('Erro ao criar notificações:', notifError);
        // Não falhar a atualização da solicitação se a notificação falhar
      }
    }

    await client.query('COMMIT');
    
    res.json({
      message: 'Solicitação atualizada com sucesso',
      solicitacao: result.rows[0],
      ordem: ordemAtualizada // Retornar ordem atualizada se foi modificada
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar solicitação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// Deletar solicitação
export const deleteSolicitacao = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id, solicitacaoId } = req.params;

    // Verificar se a solicitação existe e buscar dados para notificação
    const solicitacaoCheck = await client.query(
      `SELECT 
        s.id,
        s.assunto,
        s.tipo,
        s.solicitante_id,
        s.destinatario_id,
        s.ordem_servico_id,
        sol.nome as solicitante_nome,
        dest.nome as destinatario_nome,
        os.codigo as ordem_codigo
      FROM solicitacoes s
      LEFT JOIN usuarios sol ON s.solicitante_id = sol.id
      LEFT JOIN usuarios dest ON s.destinatario_id = dest.id
      LEFT JOIN ordens_servico os ON s.ordem_servico_id = os.id
      WHERE s.id = $1 AND s.ordem_servico_id = $2`,
      [solicitacaoId, id]
    );
    
    if (solicitacaoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    const solicitacao = solicitacaoCheck.rows[0];
    
    // Buscar nome do usuário que está deletando
    const usuarioIdDeletando = req.user?.id || null;
    let nomeUsuarioDeletando = 'Sistema';
    
    if (usuarioIdDeletando) {
      const usuarioResult = await client.query(
        'SELECT nome FROM usuarios WHERE id = $1',
        [usuarioIdDeletando]
      );
      if (usuarioResult.rows.length > 0) {
        nomeUsuarioDeletando = usuarioResult.rows[0].nome;
      }
    }

    // NÃO deletar notificações relacionadas - elas são um histórico
    // As notificações de "Nova solicitação" e "Solicitação deletada" devem permanecer no banco

    // Se for "Solicitação de peça", verificar se deve voltar status da ordem para "Em Andamento"
    let ordemAtualizada = null;
    if (solicitacao.tipo === 'Solicitação de peça') {
      // Verificar se a ordem está "Aguardando Peças"
      const ordemCheck = await client.query(
        'SELECT id, status FROM ordens_servico WHERE id = $1 AND status = $2',
        [id, 'Aguardando Peças']
      );
      
      if (ordemCheck.rows.length > 0) {
        // Verificar se não há outras solicitações de peça pendentes ou em andamento
        const outrasSolicitacoes = await client.query(
          `SELECT COUNT(*) as count 
           FROM solicitacoes 
           WHERE ordem_servico_id = $1 
           AND tipo = 'Solicitação de peça' 
           AND id != $2 
           AND status NOT IN ('Finalizado', 'Cancelado', 'Recusada')`,
          [id, solicitacaoId]
        );
        
        const outrasCount = parseInt(outrasSolicitacoes.rows[0]?.count || 0);
        
        // Se não houver outras solicitações de peça pendentes, voltar ordem para "Em Andamento"
        if (outrasCount === 0) {
          const ordemUpdateResult = await client.query(
            `UPDATE ordens_servico 
             SET status = 'Em Andamento'
             WHERE id = $1
             RETURNING *`,
            [id]
          );
          
          if (ordemUpdateResult.rows.length > 0) {
            ordemAtualizada = ordemUpdateResult.rows[0];
            console.log(`✅ Status da ordem ${id} atualizado para 'Em Andamento' após deletar solicitação de peça`);
          }
        }
      }
    }

    // Deletar solicitação
    await client.query(
      'DELETE FROM solicitacoes WHERE id = $1 AND ordem_servico_id = $2',
      [solicitacaoId, id]
    );

    // Criar notificação de solicitação deletada
    try {
      const mensagemDeletada = `${nomeUsuarioDeletando} deletou a solicitação "${solicitacao.assunto || 'solicitação'}"`;
      const destinatarios = [];
      
      // Adicionar solicitante aos destinatários
      if (solicitacao.solicitante_id && solicitacao.solicitante_id !== usuarioIdDeletando) {
        destinatarios.push(solicitacao.solicitante_id);
      }
      
      // Adicionar destinatário aos destinatários
      if (solicitacao.destinatario_id && solicitacao.destinatario_id !== usuarioIdDeletando) {
        destinatarios.push(solicitacao.destinatario_id);
      }
      
      // Criar notificação para cada destinatário
      for (const destinatarioId of destinatarios) {
        await client.query(
          `INSERT INTO notificacoes (
            tipo, referencia_id, titulo, mensagem, remetente_id, destinatario_id, prioridade, aberta, data_criacao
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            'Solicitação',
            null, // Não há mais referência, a solicitação foi deletada
            'Solicitação deletada',
            mensagemDeletada,
            usuarioIdDeletando || null,
            destinatarioId,
            'Normal',
            false
          ]
        );
      }
    } catch (notifError) {
      console.error('Erro ao criar notificações de solicitação deletada:', notifError);
      // Não falhar a exclusão se a notificação falhar
    }

    await client.query('COMMIT');
    
    res.json({ 
      message: 'Solicitação deletada com sucesso',
      ordem: ordemAtualizada // Retornar ordem atualizada se foi modificada
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar solicitação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

