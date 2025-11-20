import pool from '../config/db.js'

/**
 * Função utilitária para criar notificações de pagamento
 * @param {Object} params - Parâmetros da notificação
 * @param {string} params.tipo - Tipo da notificação ('pagamento_aprovado' ou 'pagamento_realizado')
 * @param {number} params.pagamentoId - ID do pagamento
 * @param {string} params.metodoPagamento - Método de pagamento (ex: 'Boleto', 'Dinheiro')
 * @param {string} params.clienteNome - Nome do cliente
 * @param {number} params.valor - Valor do pagamento
 * @param {number} params.valorLiquido - Valor líquido (opcional, para pagamento aprovado)
 * @param {string} params.transactionId - ID da transação do Mercado Pago (opcional)
 * @param {number} params.ordemId - ID da ordem de serviço (opcional)
 * @param {number} params.usuarioId - ID do usuário que realizou a ação (opcional, para pagamento_realizado)
 * @param {number} params.destinatarioId - ID do destinatário (opcional, null = broadcast)
 * @param {Object} params.metadata - Metadados adicionais (opcional)
 */
export const criarNotificacaoPagamento = async ({
  tipo,
  pagamentoId,
  metodoPagamento,
  clienteNome,
  valor,
  valorLiquido = null,
  transactionId = null,
  ordemId = null,
  usuarioId = null,
  destinatarioId = null,
  metadata = {}
}) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Determinar título e mensagem baseado no tipo
    let titulo, mensagem
    
    // Garantir que valor e valorLiquido sejam números
    const valorNumero = typeof valor === 'number' ? valor : parseFloat(valor) || 0
    const valorLiquidoNumero = valorLiquido !== null && valorLiquido !== undefined 
      ? (typeof valorLiquido === 'number' ? valorLiquido : parseFloat(valorLiquido) || 0)
      : null
    
    if (tipo === 'pagamento_aprovado') {
      titulo = 'Pagamento aprovado'
      
      // Formatar valores com separador de milhares
      const partesValor = valorNumero.toFixed(2).split('.')
      const parteInteiraValor = partesValor[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      const valorFormatado = `${parteInteiraValor},${partesValor[1]}`
      
      if (valorLiquidoNumero !== null && valorLiquidoNumero !== valorNumero) {
        // Formatar valor líquido
        const partesLiquido = valorLiquidoNumero.toFixed(2).split('.')
        const parteInteiraLiquido = partesLiquido[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        const valorLiquidoFormatado = `${parteInteiraLiquido},${partesLiquido[1]}`
        
        mensagem = `${clienteNome} pagou R$ ${valorFormatado} (recebível: R$ ${valorLiquidoFormatado})`
      } else {
        mensagem = `${clienteNome} pagou R$ ${valorFormatado}`
      }
      
      if (transactionId) {
        mensagem += ` — Transação ${transactionId}`
      }
    } else if (tipo === 'pagamento_realizado') {
      titulo = 'Pagamento realizado'
      
      // Buscar nome do usuário se fornecido
      let usuarioNome = 'Sistema'
      if (usuarioId) {
        const usuarioResult = await client.query(
          'SELECT nome FROM usuarios WHERE id = $1',
          [usuarioId]
        )
        if (usuarioResult.rows.length > 0) {
          usuarioNome = usuarioResult.rows[0].nome
        }
      }
      
      // Formatar valor com separador de milhares
      const partes = valorNumero.toFixed(2).split('.')
      const parteInteira = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      const valorFormatado = `${parteInteira},${partes[1]}`
      mensagem = `${usuarioNome} registrou um pagamento de R$ ${valorFormatado} para ${clienteNome}`
    } else {
      throw new Error(`Tipo de notificação inválido: ${tipo}`)
    }
    
    // Preparar metadata
    const metadataFinal = {
      ...metadata,
      valor: valorNumero,
      metodo_pagamento: metodoPagamento,
      data_criacao: new Date().toISOString()
    }
    
    if (transactionId) {
      metadataFinal.mp_id = transactionId
    }
    
    if (ordemId) {
      metadataFinal.os_id = ordemId
    }
    
    if (valorLiquidoNumero !== null) {
      metadataFinal.valor_liquido = valorLiquidoNumero
      metadataFinal.taxas = valorNumero - valorLiquidoNumero
    }
    
    // Prioridade sempre Normal para pagamentos (tanto aprovado quanto realizado)
    const prioridade = 'Normal'
    
    // Link URL
    const linkUrl = `/financeiro/pagamentos/${pagamentoId}`
    
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
        canal,
        link_url,
        metadata,
        data_criacao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        tipo,
        pagamentoId,
        'pagamento',
        titulo,
        mensagem,
        null, // remetente_id sempre null (Sistema/Mercado Pago)
        destinatarioId, // destinatario_id (null = broadcast)
        prioridade,
        true, // aberta = true (não lida)
        'app', // canal: app, email, sms
        linkUrl,
        JSON.stringify(metadataFinal)
      ]
    )
    
    await client.query('COMMIT')
    
    console.log(`✅ Notificação criada: ${tipo} - ${titulo}`)
    
    return result.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Erro ao criar notificação de pagamento:', error)
    throw error
  } finally {
    client.release()
  }
}

