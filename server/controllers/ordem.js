import pool from '../config/db.js';
import { createPagamentoSimples } from './pagamento.js';
import { getCaixaAbertoByEstabelecimento } from './caixa.js';

// Função auxiliar para calcular e atualizar o total da ordem
const atualizarTotalOrdem = async (ordem_id, client, desconto = null, acrescimo = null) => {
  // Calcular subtotal (soma de todos os itens ativos)
  const subtotalResult = await client.query(
    `SELECT COALESCE(SUM(total), 0) as subtotal
     FROM ordens_servico_itens
     WHERE ordem_servico_id = $1 AND status = 'Ativo'`,
    [ordem_id]
  );
  
  const subtotal = parseFloat(subtotalResult.rows[0]?.subtotal || 0);
  
  // Se desconto e acréscimo não foram fornecidos, buscar da ordem
  let descontoFinal = desconto;
  let acrescimoFinal = acrescimo;
  
  if (descontoFinal === null || acrescimoFinal === null) {
    const ordemResult = await client.query(
      'SELECT desconto, acrescimos FROM ordens_servico WHERE id = $1',
      [ordem_id]
    );
    
    if (ordemResult.rows.length > 0) {
      if (descontoFinal === null) {
        descontoFinal = parseFloat(ordemResult.rows[0].desconto || 0);
      }
      if (acrescimoFinal === null) {
        acrescimoFinal = parseFloat(ordemResult.rows[0].acrescimos || 0);
      }
    }
  }
  
  // Calcular total: subtotal - desconto + acréscimo
  const total = subtotal - (descontoFinal || 0) + (acrescimoFinal || 0);
  
  // Atualizar a ordem
  await client.query(
    `UPDATE ordens_servico 
     SET total = $1, desconto = $2, acrescimos = $3
     WHERE id = $4`,
    [total, descontoFinal || 0, acrescimoFinal || 0, ordem_id]
  );
  
  return { subtotal, desconto: descontoFinal || 0, acrescimo: acrescimoFinal || 0, total };
};

// Criar ordem de serviço
export const createOrdem = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      estabelecimento_id,
      cliente_id,
      veiculo_id,
      descricao,
      observacoes,
      responsavel_id,
      previsao_saida,
      status = 'Pendente',
      aberto_por
    } = req.body;

    // Validar dados obrigatórios
    if (!estabelecimento_id || !cliente_id || !veiculo_id || !descricao) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID, cliente, veículo e descrição são obrigatórios' 
      });
    }
    
    // Validar que temos aberto_por (obrigatório)
    if (!aberto_por) {
      return res.status(400).json({ 
        error: 'ID do usuário (aberto_por) é obrigatório para criar uma ordem' 
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

    // Verificar se o cliente existe e pertence ao estabelecimento
    const clienteCheck = await client.query(
      'SELECT id FROM clientes WHERE id = $1 AND estabelecimento_id = $2',
      [cliente_id, estabelecimento_id]
    );

    if (clienteCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Cliente não encontrado ou não pertence a este estabelecimento' 
      });
    }

    // Verificar se o veículo existe e pertence ao estabelecimento e cliente
    const veiculoCheck = await client.query(
      'SELECT id FROM veiculos WHERE id = $1 AND estabelecimento_id = $2 AND cliente_id = $3',
      [veiculo_id, estabelecimento_id, cliente_id]
    );

    if (veiculoCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Veículo não encontrado ou não pertence a este cliente/estabelecimento' 
      });
    }

    // Gerar código único para a ordem
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const codigo = `OS-${timestamp}-${randomSuffix}`;

    // Verificar se o código já existe (pouco provável, mas verificar mesmo assim)
    let codigoExiste = true;
    let tentativas = 0;
    let codigoFinal = codigo;
    
    while (codigoExiste && tentativas < 10) {
      const codigoCheck = await client.query(
        'SELECT id FROM ordens_servico WHERE codigo = $1',
        [codigoFinal]
      );
      
      if (codigoCheck.rows.length === 0) {
        codigoExiste = false;
      } else {
        tentativas++;
        codigoFinal = `OS-${timestamp}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      }
    }

    // Obter ID do usuário que está criando (aberto_por)
    // Priorizar aberto_por do body, depois req.user?.id
    const usuarioId = aberto_por ? parseInt(aberto_por) : (req.user?.id ? parseInt(req.user.id) : null);
    
    // Validar que temos um usuário para abrir a ordem
    if (!usuarioId || isNaN(usuarioId)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'ID do usuário (aberto_por) é obrigatório e deve ser um número válido para criar uma ordem' 
      });
    }

    // Inserir nova ordem (usar coluna status como estado do fluxo: Pendente, Em Andamento, ...)
    const result = await client.query(
      `INSERT INTO ordens_servico (
        estabelecimento_id, codigo, cliente_id, veiculo_id, 
        aberto_por, descricao, observacoes, status,
        resposavel, previsao_saida, data_abertura, criado_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
      RETURNING *`,
      [
        estabelecimento_id,
        codigoFinal,
        cliente_id,
        veiculo_id,
        usuarioId, // Já convertido para inteiro acima
        descricao.trim(),
        observacoes?.trim() || null,
        status,
        responsavel_id ? parseInt(responsavel_id) : null,
        previsao_saida || null
      ]
    );

    // Buscar dados completos com JOINs para criar notificações e retornar ao cliente
    const ordemCompleta = await client.query(
      `SELECT 
        os.*,
        c.nome as cliente_nome,
        v.placa as veiculo_placa,
        v.marca as veiculo_marca,
        v.modelo as veiculo_modelo,
        CASE 
          WHEN v.marca IS NOT NULL AND v.modelo IS NOT NULL AND v.placa IS NOT NULL 
          THEN v.marca || ' ' || v.modelo || ' - ' || v.placa
          WHEN v.placa IS NOT NULL 
          THEN v.placa
          ELSE 'Veículo não encontrado'
        END as veiculo_descricao,
        u.nome as mecanico_nome,
        resp.nome as responsavel_nome
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      LEFT JOIN usuarios u ON os.aberto_por = u.id
      LEFT JOIN usuarios resp ON os.resposavel = resp.id
      WHERE os.id = $1`,
      [result.rows[0].id]
    );
    
    const ordem = ordemCompleta.rows[0];
    const nomeUsuario = ordem?.mecanico_nome || 'Sistema';

    // Criar notificação para usuários específicos (Gerente, Administrador, Atendente e quem criou)
    try {
      // Buscar usuários com os cargos permitidos ou quem criou a ordem
      const usuariosEstabelecimento = await client.query(
        `SELECT id, cargo FROM usuarios 
         WHERE estabelecimento_id = $1 
         AND status = 'Ativo' 
         AND (
           cargo IN ('Gerente', 'Administrador', 'Atendente')
           OR id = $2
         )`,
        [estabelecimento_id, usuarioId]
      );
      
      // Construir mensagem com dados da ordem
      const mensagemOrdem = `${nomeUsuario} criou uma ordem de serviço: ${ordem?.descricao?.substring(0, 100) || 'Nova ordem'}${ordem?.descricao?.length > 100 ? '...' : ''}`;
      
      // Criar notificação para cada usuário selecionado
      for (const usuario of usuariosEstabelecimento.rows) {
        await client.query(
          `INSERT INTO notificacoes (
            tipo, referencia_id, titulo, mensagem, remetente_id, destinatario_id, prioridade, aberta, data_criacao
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            'Ordem',
            result.rows[0].id,
            'Nova ordem de serviço',
            mensagemOrdem,
            usuarioId || null,
            usuario.id,
            'Normal',
            false
          ]
        );
      }
    } catch (notifError) {
      console.error('Erro ao criar notificações de nova ordem:', notifError);
      // Não falhar a criação da ordem se a notificação falhar
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Ordem de serviço cadastrada com sucesso!',
      ordem: ordemCompleta.rows[0] || result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar ordem de serviço:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  } finally {
    client.release();
  }
};

// Listar ordens de serviço
export const getOrdens = async (req, res) => {
  try {
    const { estabelecimento_id, status } = req.query;

    if (!estabelecimento_id) {
      return res.status(400).json({ 
        error: 'Estabelecimento ID é obrigatório' 
      });
    }

    // Construir query com JOINs para pegar dados do cliente, veículo, responsável e mecânico
    // Incluir cálculos de total (soma dos itens) e total_pago (soma dos pagamentos pagos)
    let query = `
      SELECT 
        os.*,
        os.previsao_saida,
        os.resposavel,
        c.nome as cliente_nome,
        v.placa as veiculo_placa,
        v.marca as veiculo_marca,
        v.modelo as veiculo_modelo,
        CASE 
          WHEN v.marca IS NOT NULL AND v.modelo IS NOT NULL AND v.placa IS NOT NULL 
          THEN v.marca || ' ' || v.modelo || ' - ' || v.placa
          WHEN v.placa IS NOT NULL 
          THEN v.placa
          ELSE 'Veículo não encontrado'
        END as veiculo_descricao,
        u.nome as mecanico_nome,
        resp.nome as responsavel_nome,
        COALESCE(
          (SELECT SUM(total) FROM ordens_servico_itens WHERE ordem_servico_id = os.id AND status = 'Ativo'),
          0
        ) as total,
        COALESCE(
          (SELECT SUM(valor_pago)
           FROM (
             -- Pagamentos pagos (sem parcelas)
             SELECT p.valor_total as valor_pago
             FROM pagamentos p
             WHERE p.ordem_id = os.id 
               AND p.status = 'pago'
               AND NOT EXISTS (
                 SELECT 1 FROM parcelas_pagamento pp 
                 WHERE pp.pagamento_id = p.id
               )
             UNION ALL
             -- Parcelas de pagamentos pagas
             SELECT pp.valor as valor_pago
             FROM parcelas_pagamento pp
             INNER JOIN pagamentos p ON pp.pagamento_id = p.id
             WHERE p.ordem_id = os.id 
               AND pp.status = 'pago'
           ) pagamentos_pagos
          ),
          0
        ) as total_pago
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      LEFT JOIN usuarios u ON os.aberto_por = u.id
      LEFT JOIN usuarios resp ON os.resposavel = resp.id
      WHERE os.estabelecimento_id = $1
    `;

    const params = [estabelecimento_id];

    // Se tiver filtro de status (fluxo), adicionar WHERE
    if (status) {
      query += ` AND os.status = $2`;
      params.push(status);
    }
    query += ` ORDER BY os.criado_em DESC`;

    const result = await pool.query(query, params);

    res.json({
      ordens: result.rows
    });

  } catch (error) {
    console.error('Erro ao buscar ordens de serviço:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

// Listar itens de uma ordem de serviço (consolidando duplicados)
export const getOrdemItens = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    if (!id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ID da ordem é obrigatório' });
    }

    // Buscar todos os itens
    const result = await client.query(
      `SELECT 
         osi.id,
         osi.ordem_servico_id,
         osi.item_id,
         COALESCE(osi.nome_item, i.nome) AS nome_item,
         osi.quantidade,
         COALESCE(osi.preco_unitario, i.preco) AS preco_unitario,
         osi.total,
         osi.status,
         osi.criado_em,
         i.nome AS item_nome,
         i.preco AS item_preco,
         i.tipo AS item_tipo,
         i.imagem AS item_imagem
       FROM ordens_servico_itens osi
       LEFT JOIN itens i ON osi.item_id = i.id
       WHERE osi.ordem_servico_id = $1
       ORDER BY osi.criado_em ASC`,
      [id]
    );

    // Consolidar registros duplicados (mesmo item_id)
    const itensPorItemId = new Map();
    const itensSemItemId = [];

    result.rows.forEach(row => {
      const itemId = row.item_id;
      
      if (itemId != null) {
        if (itensPorItemId.has(itemId)) {
          // Já existe - somar quantidade e total
          const existente = itensPorItemId.get(itemId);
          existente.quantidade = (Number(existente.quantidade) || 0) + (Number(row.quantidade) || 0);
          existente.total = (Number(existente.total) || 0) + (Number(row.total) || 0);
          existente.ids_originais.push(row.id);
        } else {
          // Novo item com item_id
          itensPorItemId.set(itemId, {
            ...row,
            quantidade: Number(row.quantidade) || 0,
            total: Number(row.total) || 0,
            ids_originais: [row.id]
          });
        }
      } else {
        // Item sem item_id - manter separado
        itensSemItemId.push(row);
      }
    });

    // Consolidar registros duplicados no banco de dados
    for (const [itemId, itemConsolidado] of itensPorItemId.entries()) {
      if (itemConsolidado.ids_originais.length > 1) {
        // Há múltiplos registros - consolidar no banco
        const primeiroId = itemConsolidado.ids_originais[0];
        const idsParaDeletar = itemConsolidado.ids_originais.slice(1);

        // Atualizar o primeiro registro com a quantidade e total consolidados
        await client.query(
          `UPDATE ordens_servico_itens 
           SET quantidade = $1, total = $2 
           WHERE id = $3`,
          [itemConsolidado.quantidade, itemConsolidado.total, primeiroId]
        );

        // Deletar registros duplicados
        if (idsParaDeletar.length > 0) {
          await client.query(
            `DELETE FROM ordens_servico_itens 
             WHERE id = ANY($1::int[])`,
            [idsParaDeletar]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Retornar lista consolidada
    const itensConsolidados = [
      ...Array.from(itensPorItemId.values()).map(item => {
        const { ids_originais, ...itemSemIds } = item;
        return itemSemIds;
      }),
      ...itensSemItemId
    ];

    res.json({ itens: itensConsolidados });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao buscar itens da ordem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// Adicionar item a uma ordem (com retry para deadlocks)
export const addOrdemItem = async (req, res) => {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { item_id, quantidade = 1 } = req.body;
      
      if (!item_id) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ error: 'Item ID é obrigatório' });
      }
      
      // Verificar se ordem existe
      const ordem = await client.query(
        'SELECT id FROM ordens_servico WHERE id = $1',
        [id]
      );
      if (ordem.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: 'Ordem não encontrada' });
      }
      
      // Buscar dados do item
      const item = await client.query(
        'SELECT id, nome, preco, tipo FROM itens WHERE id = $1',
        [item_id]
      );
      if (item.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: 'Item não encontrado' });
      }
      
      const nomeItem = item.rows[0].nome;
      const precoUnit = Number(item.rows[0].preco);
      const qtd = Number(quantidade) || 1;
      
      // Usar SELECT FOR UPDATE para bloquear linhas e evitar deadlock
      // Ordenar por id para garantir ordem consistente de locks
      const itensExistentes = await client.query(
        `SELECT id, quantidade, total 
         FROM ordens_servico_itens 
         WHERE ordem_servico_id = $1 AND item_id = $2
         ORDER BY id
         FOR UPDATE`,
        [id, item_id]
      );
      
      let resultado;
      
      if (itensExistentes.rows.length > 0) {
        // Item já existe - verificar se é serviço
        if (item.rows[0].tipo === 'servico') {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({ error: 'Este serviço já foi adicionado à ordem' });
        }
        
        // Para produtos: se houver múltiplos registros, consolidar todos em um
        // Calcular quantidade total de todos os registros
        let qtdTotal = 0;
        itensExistentes.rows.forEach(row => {
          qtdTotal += Number(row.quantidade) || 0;
        });
        
        // Adicionar a nova quantidade
        const novaQtd = qtdTotal + qtd;
        const novoTotal = precoUnit * novaQtd;
        
        // Se houver múltiplos registros, deletar todos exceto o primeiro e atualizar
        if (itensExistentes.rows.length > 1) {
          // Deletar registros extras (ordenar para evitar deadlock)
          const idsParaDeletar = itensExistentes.rows.slice(1).map(r => r.id);
          await client.query(
            `DELETE FROM ordens_servico_itens 
             WHERE id = ANY($1::int[])
             ORDER BY id`,
            [idsParaDeletar]
          );
        }
        
        // Atualizar o registro principal
        resultado = await client.query(
          `UPDATE ordens_servico_itens 
           SET quantidade = $1, total = $2 
           WHERE ordem_servico_id = $3 AND item_id = $4
           RETURNING *`,
          [novaQtd, novoTotal, id, item_id]
        );
      } else {
        // Item não existe - criar novo
        const total = precoUnit * qtd;
        resultado = await client.query(
          `INSERT INTO ordens_servico_itens (
             ordem_servico_id, item_id, nome_item, quantidade, preco_unitario, total, status, criado_em
           ) VALUES ($1, $2, $3, $4, $5, $6, 'Ativo', NOW())
           RETURNING *`,
          [id, item_id, nomeItem, qtd, precoUnit, total]
        );
      }
      
      // Atualizar o total da ordem após adicionar item
      await atualizarTotalOrdem(id, client);
      
      await client.query('COMMIT');
      client.release();
      return res.json({ item: resultado.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      
      // Se for deadlock e ainda tiver tentativas, tentar novamente
      if (error.code === '40P01' && retries < maxRetries - 1) {
        retries++;
        // Esperar um tempo aleatório antes de tentar novamente (exponential backoff)
        const delay = Math.random() * 100 * Math.pow(2, retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Se não for deadlock ou esgotou tentativas, retornar erro
      console.error('Erro ao adicionar item à ordem:', error);
      
      if (error.code === '40P01') {
        return res.status(500).json({ 
          error: 'Erro de concorrência. Por favor, tente novamente.' 
        });
      }
      
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

// Remover item de uma ordem (decrementa quantidade ou remove se qtd = 1)
export const deleteOrdemItem = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id, itemId } = req.params;
    if (!id || !itemId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    // Buscar o item para verificar a quantidade e item_id
    const itemResult = await client.query(
      `SELECT id, quantidade, preco_unitario, item_id 
       FROM ordens_servico_itens 
       WHERE ordem_servico_id = $1 AND id = $2`,
      [id, itemId]
    );

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    const item = itemResult.rows[0];
    const itemIdProduto = item.item_id;

    // Se o item tem item_id, verificar se há múltiplos registros e consolidar primeiro
    if (itemIdProduto) {
      const todosRegistros = await client.query(
        `SELECT id, quantidade, preco_unitario 
         FROM ordens_servico_itens 
         WHERE ordem_servico_id = $1 AND item_id = $2`,
        [id, itemIdProduto]
      );

      if (todosRegistros.rows.length > 1) {
        // Consolidar todos os registros em um único registro
        let quantidadeTotal = 0;
        let precoUnitario = 0;
        let primeiroId = null;

        todosRegistros.rows.forEach(row => {
          quantidadeTotal += Number(row.quantidade) || 0;
          if (!precoUnitario) precoUnitario = Number(row.preco_unitario) || 0;
          if (!primeiroId) primeiroId = row.id;
        });

        // Deletar registros extras
        await client.query(
          `DELETE FROM ordens_servico_itens 
           WHERE ordem_servico_id = $1 AND item_id = $2 AND id != $3`,
          [id, itemIdProduto, primeiroId]
        );

        // Agora trabalhar com o registro consolidado
        if (quantidadeTotal > 1) {
          // Reduzir quantidade em 1
          const novaQuantidade = quantidadeTotal - 1;
          const novoTotal = precoUnitario * novaQuantidade;

          const updateResult = await client.query(
            `UPDATE ordens_servico_itens 
             SET quantidade = $1, total = $2 
             WHERE ordem_servico_id = $3 AND id = $4
             RETURNING *`,
            [novaQuantidade, novoTotal, id, primeiroId]
          );

          // Atualizar o total da ordem após remover item
          await atualizarTotalOrdem(id, client);
          
          await client.query('COMMIT');
          res.json({ 
            message: 'Quantidade reduzida com sucesso',
            item: updateResult.rows[0],
            deleted: false
          });
        } else {
          // Remover o item completamente
          await client.query(
            'DELETE FROM ordens_servico_itens WHERE ordem_servico_id = $1 AND id = $2',
            [id, primeiroId]
          );

          // Atualizar o total da ordem após remover item
          await atualizarTotalOrdem(id, client);

          await client.query('COMMIT');
          res.json({ 
            message: 'Item removido com sucesso',
            deleted: true
          });
        }
        return;
      }
    }

    // Se não há múltiplos registros ou não tem item_id, trabalhar diretamente
    const quantidadeAtual = Number(item.quantidade) || 1;

    if (quantidadeAtual > 1) {
      // Reduzir quantidade em 1
      const novaQuantidade = quantidadeAtual - 1;
      const precoUnitario = Number(item.preco_unitario) || 0;
      const novoTotal = precoUnitario * novaQuantidade;

      const updateResult = await client.query(
        `UPDATE ordens_servico_itens 
         SET quantidade = $1, total = $2 
         WHERE ordem_servico_id = $3 AND id = $4
         RETURNING *`,
        [novaQuantidade, novoTotal, id, itemId]
      );

      // Atualizar o total da ordem após remover item
      await atualizarTotalOrdem(id, client);

      await client.query('COMMIT');
      res.json({ 
        message: 'Quantidade reduzida com sucesso',
        item: updateResult.rows[0],
        deleted: false
      });
    } else {
      // Remover o item completamente
      await client.query(
        'DELETE FROM ordens_servico_itens WHERE ordem_servico_id = $1 AND id = $2',
        [id, itemId]
      );

      // Atualizar o total da ordem após remover item
      await atualizarTotalOrdem(id, client);

      await client.query('COMMIT');
      res.json({ 
        message: 'Item removido com sucesso',
        deleted: true
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao remover item da ordem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// Atualizar status da ordem (e sincronizar situacao por compatibilidade)
export const updateOrdemStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { status, responsavel_id } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    // Buscar dados da ordem ANTES de atualizar para comparar status
    const ordemAntiga = await client.query(
      `SELECT os.*, u.nome as mecanico_nome, resp.nome as responsavel_nome
       FROM ordens_servico os
       LEFT JOIN usuarios u ON os.aberto_por = u.id
       LEFT JOIN usuarios resp ON os.resposavel = resp.id
       WHERE os.id = $1`,
      [id]
    );
    
    if (ordemAntiga.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ordem não encontrada' });
    }
    
    const ordemAntigaData = ordemAntiga.rows[0];
    const statusAnterior = ordemAntigaData.status;
    
    console.log(`[updateOrdemStatus] Ordem ${id}: Status anterior = "${statusAnterior}", Novo status = "${status}"`);

    // Se estiver finalizando a ordem, preencher data_fechamento
    const dataFechamento = status === 'Finalizado' && statusAnterior !== 'Finalizado' 
      ? new Date().toISOString() 
      : null
    
    // Atualiza status, opcionalmente o responsável e data_fechamento se finalizando
    const updateFields = ['status = $1']
    const updateValues = [status]
    let paramIndex = 2
    
    if (responsavel_id) {
      updateFields.push(`resposavel = $${paramIndex++}`)
      updateValues.push(parseInt(responsavel_id))
    }
    
    if (dataFechamento) {
      updateFields.push(`data_fechamento = $${paramIndex++}`)
      updateValues.push(dataFechamento)
    }
    
    updateValues.push(id)
    
    const result = await client.query(
      `UPDATE ordens_servico
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ordem não encontrada' });
    }

    // Enriquecer com JOINs
    const ordemCompleta = await client.query(
      `SELECT 
        os.*,
        c.nome as cliente_nome,
        v.placa as veiculo_placa,
        v.marca as veiculo_marca,
        v.modelo as veiculo_modelo,
        CASE 
          WHEN v.marca IS NOT NULL AND v.modelo IS NOT NULL AND v.placa IS NOT NULL 
          THEN v.marca || ' ' || v.modelo || ' - ' || v.placa
          WHEN v.placa IS NOT NULL 
          THEN v.placa
          ELSE 'Veículo não encontrado'
        END as veiculo_descricao,
        u.nome as mecanico_nome,
        resp.nome as responsavel_nome
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      LEFT JOIN usuarios u ON os.aberto_por = u.id
      LEFT JOIN usuarios resp ON os.resposavel = resp.id
      WHERE os.id = $1`,
      [id]
    );

    // Criar notificação se o status mudou para "Serviços Finalizados"
    if (status === 'Serviços Finalizados' && statusAnterior !== 'Serviços Finalizados') {
      try {
        const ordem = ordemCompleta.rows[0];
        const codigoOrdem = ordem?.codigo || `OS-${id}`;
        const nomeResponsavel = ordem?.responsavel_nome || ordem?.mecanico_nome || 'Sistema';
        const usuarioIdFinalizador = ordem.resposavel || ordem.aberto_por || null;
        
        // Buscar usuários com os cargos permitidos (Gerente, Administrador, Atendente) ou quem finalizou/responsável
        const usuariosEstabelecimento = await client.query(
          `SELECT id, cargo FROM usuarios 
           WHERE estabelecimento_id = $1 
           AND status = 'Ativo'
           AND (
             cargo IN ('Gerente', 'Administrador', 'Atendente')
             OR id = $2
           )`,
          [ordem.estabelecimento_id, usuarioIdFinalizador]
        );
        
        // Criar notificação para cada usuário selecionado
        for (const usuario of usuariosEstabelecimento.rows) {
          await client.query(
            `INSERT INTO notificacoes (
              tipo, referencia_id, titulo, mensagem, remetente_id, destinatario_id, prioridade, aberta, data_criacao
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              'Ordem',
              id,
              'Ordem de serviço finalizada',
              `${nomeResponsavel} finalizou a ordem ${codigoOrdem}`,
              usuarioIdFinalizador,
              usuario.id,
              'Normal',
              false
            ]
          );
        }
      } catch (notifError) {
        console.error('Erro ao criar notificações de ordem finalizada:', notifError);
        // Não falhar a atualização da ordem se a notificação falhar
      }
    }

    // Criar boleto automaticamente quando finalizar ordem
    if (status === 'Finalizado' && statusAnterior !== 'Finalizado') {
      console.log(`[updateOrdemStatus] Tentando criar boleto para ordem ${id}...`);
      try {
        const ordem = ordemCompleta.rows[0];
        const cliente_id = ordem.cliente_id;
        const estabelecimento_id = ordem.estabelecimento_id;
        
        // Recalcular o total da ordem antes de criar o pagamento
        const { subtotal, desconto, acrescimo, total } = await atualizarTotalOrdem(id, client);
        
        const valor_total = total; // Usar o total recalculado
        
        console.log(`[updateOrdemStatus] Dados da ordem: cliente_id=${cliente_id}, valor_total=${valor_total}, estabelecimento_id=${estabelecimento_id}`);
        
        // Buscar caixa aberto para o estabelecimento
        const caixaAberto = await getCaixaAbertoByEstabelecimento(estabelecimento_id, client);
        const caixa_id = caixaAberto ? caixaAberto.id : null;
        
        console.log(`[updateOrdemStatus] Caixa aberto encontrado:`, {
          caixa_id: caixa_id,
          estabelecimento_id: estabelecimento_id
        });
        
        // Verificar se o valor total é válido
        if (!valor_total || valor_total <= 0) {
          console.warn(`[updateOrdemStatus] Valor total inválido para ordem ${id}: ${valor_total}. Pagamento não será criado.`);
        } else if (!cliente_id) {
          console.warn(`[updateOrdemStatus] Cliente ID não encontrado para ordem ${id}. Pagamento não será criado.`);
        } else {
          // Criar pagamento usando a função auxiliar (que verifica se já existe)
          const resultado = await createPagamentoSimples(id, cliente_id, valor_total, client, caixa_id);
          
          if (resultado.error) {
            console.log(`[updateOrdemStatus] ${resultado.error}`);
          } else if (resultado.success) {
            console.log('[updateOrdemStatus] ✅ Pagamento criado automaticamente ao finalizar ordem:', {
              id: resultado.pagamento.id,
              ordem_id: id,
              cliente_id: cliente_id,
              valor_total: valor_total,
              caixa_id: caixa_id,
              status: resultado.pagamento.status,
              criado_em: resultado.pagamento.criado_em
            });
          }
        }
      } catch (pagamentoError) {
        console.error('[updateOrdemStatus] ❌ Erro ao criar pagamento automaticamente:', pagamentoError);
        console.error('[updateOrdemStatus] Stack trace:', pagamentoError.stack);
        // Não falhar a atualização da ordem se o boleto falhar
      }
    } else {
      console.log(`[updateOrdemStatus] Boleto não será criado. Status=${status}, StatusAnterior=${statusAnterior}`);
    }

    await client.query('COMMIT');
    res.json({
      message: 'Status da ordem atualizado com sucesso',
      ordem: ordemCompleta.rows[0] || result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar status da ordem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// Buscar detalhes completos de uma ordem
export const getOrdemDetalhes = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID da ordem é obrigatório' });
    }

    // Buscar dados da ordem com JOINs
    const ordemResult = await client.query(
      `SELECT 
        os.*,
        c.nome as cliente_nome,
        c.id as cliente_id,
        c.whatsapp as cliente_whatsapp,
        c.email as cliente_email,
        v.placa as veiculo_placa,
        v.marca as veiculo_marca,
        v.modelo as veiculo_modelo,
        CASE 
          WHEN v.marca IS NOT NULL AND v.modelo IS NOT NULL AND v.placa IS NOT NULL 
          THEN v.marca || ' ' || v.modelo || ' - ' || v.placa
          WHEN v.placa IS NOT NULL 
          THEN v.placa
          ELSE 'Veículo não encontrado'
        END as veiculo_descricao,
        aberto_por_user.nome as aberto_por_nome,
        fechado_por_user.nome as fechado_por_nome,
        responsavel_user.nome as responsavel_nome
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      LEFT JOIN usuarios aberto_por_user ON os.aberto_por = aberto_por_user.id
      LEFT JOIN usuarios fechado_por_user ON os.fechado_por = fechado_por_user.id
      LEFT JOIN usuarios responsavel_user ON os.resposavel = responsavel_user.id
      WHERE os.id = $1`,
      [id]
    );

    if (ordemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ordem não encontrada' });
    }

    const ordem = ordemResult.rows[0];

    // Buscar itens da ordem
    const itensResult = await client.query(
      `SELECT 
        osi.id,
        osi.item_id,
        osi.nome_item,
        osi.quantidade,
        osi.preco_unitario,
        osi.total,
        osi.status,
        osi.criado_em,
        i.tipo as item_tipo
      FROM ordens_servico_itens osi
      LEFT JOIN itens i ON osi.item_id = i.id
      WHERE osi.ordem_servico_id = $1
      ORDER BY osi.criado_em ASC`,
      [id]
    );

    // Buscar boletos da ordem
    const pagamentosResult = await client.query(
      `SELECT 
        p.*,
        COUNT(pp.id) as total_parcelas,
        COUNT(CASE WHEN pp.status = 'pendente' THEN 1 END) as parcelas_pendentes
      FROM pagamentos p
      LEFT JOIN parcelas_pagamento pp ON p.id = pp.pagamento_id
      WHERE p.ordem_id = $1
      GROUP BY p.id
      ORDER BY p.criado_em DESC`,
      [id]
    );

    // Para cada pagamento, buscar suas parcelas
    const pagamentosComParcelas = await Promise.all(
      pagamentosResult.rows.map(async (pagamento) => {
        const parcelasResult = await client.query(
          `SELECT 
            pp.*,
            0 as juros_aplicado_calculado
          FROM parcelas_pagamento pp
          WHERE pp.pagamento_id = $1
          ORDER BY pp.numero_parcela ASC`,
          [pagamento.id]
        );

        return {
          ...pagamento,
          parcelas: parcelasResult.rows
        };
      })
    );

    res.json({
      ordem,
      itens: itensResult.rows,
      pagamentos: pagamentosComParcelas
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes da ordem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// Deletar ordem de serviço
export const deleteOrdem = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    if (!id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ID da ordem é obrigatório' });
    }

    // Verificar se a ordem existe e buscar dados necessários para notificação
    const ordemCheck = await client.query(
      `SELECT 
        id, 
        codigo, 
        estabelecimento_id, 
        aberto_por,
        resposavel
      FROM ordens_servico 
      WHERE id = $1`,
      [id]
    );

    if (ordemCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ordem não encontrada' });
    }

    const ordem = ordemCheck.rows[0];
    const codigoOrdem = ordem.codigo;
    const estabelecimentoId = ordem.estabelecimento_id;
    
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

    // Deletar itens da ordem primeiro (por causa da foreign key)
    await client.query(
      'DELETE FROM ordens_servico_itens WHERE ordem_servico_id = $1',
      [id]
    );

    // Deletar solicitações relacionadas à ordem
    await client.query(
      'DELETE FROM solicitacoes WHERE ordem_servico_id = $1 OR ordem_id = $1',
      [id]
    );

    // NÃO deletar notificações relacionadas à ordem - elas são um histórico
    // As notificações de "Nova ordem" e "Ordem deletada" devem permanecer no banco

    // Deletar a ordem
    await client.query(
      'DELETE FROM ordens_servico WHERE id = $1',
      [id]
    );

    // Criar notificação de ordem deletada
    try {
      // Buscar usuários com os cargos permitidos, quem criou a ordem, ou quem é responsável
      const usuarioIdsParaNotificar = [
        ordem.aberto_por,
        ordem.resposavel
      ].filter(Boolean); // Remove valores null/undefined
      
      // Construir condição para os IDs
      const idsConditions = [];
      const queryParams = [estabelecimentoId];
      let paramIndex = 2;
      
      if (usuarioIdsParaNotificar.length > 0) {
        idsConditions.push(`id = ANY($${paramIndex}::int[])`);
        queryParams.push(usuarioIdsParaNotificar);
        paramIndex++;
      }
      
      if (usuarioIdDeletando) {
        idsConditions.push(`id = $${paramIndex}`);
        queryParams.push(usuarioIdDeletando);
        paramIndex++;
      }
      
      const idsCondition = idsConditions.length > 0 ? ` OR ${idsConditions.join(' OR ')}` : '';
      
      const usuariosEstabelecimento = await client.query(
        `SELECT id, cargo FROM usuarios 
         WHERE estabelecimento_id = $1 
         AND status = 'Ativo' 
         AND (
           cargo IN ('Gerente', 'Administrador', 'Atendente')
           ${idsCondition}
         )`,
        queryParams
      );
      
      // Construir mensagem de ordem deletada
      const mensagemDeletada = `${nomeUsuarioDeletando} deletou a ordem ${codigoOrdem}`;
      
      // Criar notificação para cada usuário selecionado
      for (const usuario of usuariosEstabelecimento.rows) {
        await client.query(
          `INSERT INTO notificacoes (
            tipo, referencia_id, titulo, mensagem, remetente_id, destinatario_id, prioridade, aberta, data_criacao
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            'Ordem',
            null, // Não há mais referência, a ordem foi deletada
            'Ordem deletada',
            mensagemDeletada,
            usuarioIdDeletando || null,
            usuario.id,
            'Normal',
            false
          ]
        );
      }
    } catch (notifError) {
      console.error('Erro ao criar notificações de ordem deletada:', notifError);
      // Não falhar a exclusão se a notificação falhar
    }

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Ordem de serviço excluída com sucesso',
      deleted: true
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir ordem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

