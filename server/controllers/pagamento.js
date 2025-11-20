import pool from '../config/db.js'
import { criarNotificacaoPagamento } from '../utils/notificacaoHelper.js'
import { getCaixaAbertoByEstabelecimento } from './caixa.js'

// Função auxiliar para obter data local
const getDataLocal = () => {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

// Criar pagamento simples (ao finalizar ordem)
export const createPagamentoSimples = async (ordem_id, cliente_id, valor_total, client = null, caixa_id = null) => {
  const shouldManageTransaction = !client
  const queryClient = client || await pool.connect()
  
  try {
    if (shouldManageTransaction) {
      await queryClient.query('BEGIN')
    }
    
    // Verificar se já existe pagamento para esta ordem
    const pagamentoExistente = await queryClient.query(
      'SELECT id FROM pagamentos WHERE ordem_id = $1',
      [ordem_id]
    )
    
    if (pagamentoExistente.rows.length > 0) {
      if (shouldManageTransaction) {
        await queryClient.query('COMMIT')
      }
      return { 
        success: false, 
        error: 'Pagamento já existe para esta ordem',
        pagamento: pagamentoExistente.rows[0]
      }
    }
    
    const pagamentoResult = await queryClient.query(
      `INSERT INTO pagamentos (
        ordem_id, 
        cliente_id, 
        valor_total, 
        status,
        caixa_id,
        forma_pagamento
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        ordem_id,
        cliente_id,
        valor_total,
        'gerado', // Status gerado - indica que foi criado ao finalizar ordem
        caixa_id, // ID do caixa aberto
        'Pendente' // forma_pagamento temporário - será atualizado quando o usuário incluir o pagamento
      ]
    )
    
    if (shouldManageTransaction) {
      await queryClient.query('COMMIT')
    }
    
    console.log('[createPagamentoSimples] Pagamento criado com caixa_id:', {
      pagamento_id: pagamentoResult.rows[0].id,
      ordem_id,
      caixa_id
    })
    
    return { success: true, pagamento: pagamentoResult.rows[0] }
  } catch (error) {
    if (shouldManageTransaction) {
      await queryClient.query('ROLLBACK')
    }
    console.error('Erro ao criar pagamento simples:', error)
    throw error
  } finally {
    if (shouldManageTransaction && queryClient) {
      queryClient.release()
    }
  }
}

// Listar boletos de uma ordem
export const getPagamentosOrdem = async (req, res) => {
  try {
    const { id: ordem_id } = req.params
    
    if (!ordem_id) {
      return res.status(400).json({ error: 'ID da ordem é obrigatório' })
    }

    const result = await pool.query(
      `SELECT * FROM pagamentos 
       WHERE ordem_id = $1 
       ORDER BY criado_em DESC`,
      [ordem_id]
    )

    res.json({ pagamentos: result.rows })
  } catch (error) {
    console.error('Erro ao buscar boletos:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Criar ou atualizar pagamento de ordem
export const createPagamentoOrdem = async (req, res) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const { id: ordem_id } = req.params
    const {
      forma_pagamento,
      parcelas,
      desconto,
      acrescimo,
      data_vencimento,
      valor_subtotal,
      caixa_id,
    } = req.body

    // Validar dados obrigatórios
    if (!ordem_id || !forma_pagamento) {
      await client.query('ROLLBACK')
      return res.status(400).json({ 
        error: 'Ordem ID e forma de pagamento são obrigatórios' 
      })
    }

    // Buscar dados da ordem
    const ordemResult = await client.query(
      'SELECT cliente_id, estabelecimento_id FROM ordens_servico WHERE id = $1',
      [ordem_id]
    )

    if (ordemResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Ordem não encontrada' })
    }

    const { cliente_id, estabelecimento_id } = ordemResult.rows[0]

    // Determinar se é à vista ou parcelado
    const isAVista = parcelas === 'vista'
    const numParcelas = isAVista ? null : parseInt(parcelas) || 1
    const valorParcelasParaSalvar = isAVista ? null : numParcelas

    // Calcular valores
    const valorDesconto = parseFloat(desconto) || 0
    const valorAcrescimo = parseFloat(acrescimo) || 0
    const subtotal = parseFloat(valor_subtotal) || 0

    // Determinar status
    let status, data_pagamento
    if (isAVista) {
      status = 'pago'
      data_pagamento = getDataLocal()
    } else {
      status = 'pendente'
      data_pagamento = null
    }

    // Calcular valor total
    const valor_total = Math.round((subtotal - valorDesconto + valorAcrescimo) * 100) / 100

    // Buscar caixa aberto se não fornecido
    let caixaIdFinal = caixa_id
    if (!caixaIdFinal) {
      const caixaAberto = await getCaixaAbertoByEstabelecimento(estabelecimento_id, client)
      caixaIdFinal = caixaAberto ? caixaAberto.id : null
    }

    // Verificar se já existe pagamento pendente ou gerado para esta ordem
    const pagamentoExistente = await client.query(
      `SELECT id FROM pagamentos 
       WHERE ordem_id = $1 AND status IN ('gerado', 'pendente')
       ORDER BY CASE WHEN status = 'gerado' THEN 1 ELSE 2 END, criado_em ASC
       LIMIT 1`,
      [ordem_id]
    )

    let pagamento, pagamento_id
    const isUpdate = pagamentoExistente.rows.length > 0

    // Atualizar ou criar pagamento
    if (isUpdate && pagamentoExistente.rows[0]) {
      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      updateFields.push(`forma_pagamento = $${paramIndex++}`)
      updateValues.push(forma_pagamento)

      updateFields.push(`parcelas = $${paramIndex++}`)
      updateValues.push(valorParcelasParaSalvar)

      updateFields.push(`valor_total = $${paramIndex++}`)
      updateValues.push(valor_total)

      updateFields.push(`data_vencimento = $${paramIndex++}`)
      updateValues.push(data_vencimento || null)

      updateFields.push(`caixa_id = $${paramIndex++}`)
      updateValues.push(caixaIdFinal)

      updateFields.push(`desconto = $${paramIndex++}`)
      updateValues.push(valorDesconto)

      updateFields.push(`acrescimo = $${paramIndex++}`)
      updateValues.push(valorAcrescimo)

      updateFields.push(`status = $${paramIndex++}`)
      updateValues.push(status)

      if (data_pagamento) {
        updateFields.push(`data_pagamento = $${paramIndex++}`)
        updateValues.push(data_pagamento)
        updateFields.push(`valor_pago = $${paramIndex++}`)
        updateValues.push(valor_total)
      } else {
        updateFields.push(`data_pagamento = NULL`)
        updateFields.push(`valor_pago = NULL`)
      }

      updateFields.push(`atualizado_em = NOW()`)
      updateValues.push(pagamentoExistente.rows[0].id)

      const updateResult = await client.query(
        `UPDATE pagamentos SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      )

      pagamento = updateResult.rows[0]
      pagamento_id = pagamento.id

      // Deletar parcelas antigas
      await client.query(
        `DELETE FROM parcelas_pagamento WHERE pagamento_id = $1`,
        [pagamento_id]
      )
    } else {
      // Criar novo pagamento
      const valorPago = status === 'pago' ? valor_total : null

      const insertResult = await client.query(
        `INSERT INTO pagamentos (
          ordem_id, cliente_id, forma_pagamento, 
          parcelas, valor_total, valor_pago, data_vencimento, 
          data_pagamento, status, observacao, caixa_id, desconto, acrescimo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          ordem_id, cliente_id, forma_pagamento,
          valorParcelasParaSalvar, valor_total, valorPago, data_vencimento || null,
          data_pagamento, status, null, caixaIdFinal, valorDesconto, valorAcrescimo
        ]
      )

      pagamento = insertResult.rows[0]
      pagamento_id = pagamento.id
    }

    // Criar parcelas se necessário
    if (!isAVista && numParcelas > 1 && data_vencimento) {
      const valorParcela = valor_total / numParcelas
      const dataVencimentoBase = new Date(data_vencimento)

      for (let i = 1; i <= numParcelas; i++) {
        const dataVencimentoParcela = new Date(dataVencimentoBase)
        dataVencimentoParcela.setMonth(dataVencimentoParcela.getMonth() + (i - 1))

        await client.query(
          `INSERT INTO parcelas_pagamento (
            pagamento_id, numero_parcela, valor, data_vencimento, status
          ) VALUES ($1, $2, $3, $4, $5)`,
          [pagamento_id, i, valorParcela, dataVencimentoParcela.toISOString().split('T')[0], status]
        )
      }
    }

    await client.query('COMMIT')

    res.status(isUpdate ? 200 : 201).json({
      message: isUpdate ? 'Pagamento atualizado com sucesso' : 'Pagamento criado com sucesso',
      pagamento: pagamento,
      atualizado: isUpdate
    })

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Erro ao criar pagamento:', error)
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    })
  } finally {
    client.release()
  }
}

// Listar parcelas de pagamento
export const getParcelasPagamento = async (req, res) => {
  try {
    const { status, caixa_id } = req.query

    let query = ''
    let params = []

    // Filtros baseados no status
    if (status === 'Pagamentos') {
      // Apenas pagamentos com status 'gerado' (sem parcelas associadas)
      query = `
        SELECT 
          p.id,
          p.ordem_id,
          p.cliente_id,
          p.forma_pagamento,
          p.valor_total,
          p.valor_pago,
          p.parcelas as total_parcelas,
          p.data_pagamento,
          p.data_vencimento,
          p.status,
          p.transaction_id,
          p.codigo_barras,
          p.link_boleto,
          p.criado_em as data_emissao,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
          c.email as cliente_email,
          os.codigo as ordem_codigo,
          NULL as numero_parcela,
          NULL as valor,
          0 as juros_aplicado
        FROM pagamentos p
        INNER JOIN clientes c ON p.cliente_id = c.id
        INNER JOIN ordens_servico os ON p.ordem_id = os.id
        WHERE p.status = 'gerado'
          AND NOT EXISTS (
            SELECT 1 FROM parcelas_pagamento pp WHERE pp.pagamento_id = p.id
          )
      `
      if (caixa_id) {
        query += ` AND p.caixa_id = $1`
        params.push(caixa_id)
      }
    } else if (status === 'Pagamentos Pendente') {
      // Pagamentos pendentes (excluindo 'gerado' e 'vencido')
      query = `
        SELECT 
          p.id,
          p.ordem_id,
          p.cliente_id,
          p.forma_pagamento,
          p.valor_total,
          p.valor_pago,
          p.parcelas as total_parcelas,
          p.data_pagamento,
          p.data_vencimento,
          p.status,
          p.transaction_id,
          p.codigo_barras,
          p.link_boleto,
          p.criado_em as data_emissao,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
          os.codigo as ordem_codigo,
          NULL as numero_parcela,
          NULL as valor,
          0 as juros_aplicado
        FROM pagamentos p
        INNER JOIN clientes c ON p.cliente_id = c.id
        INNER JOIN ordens_servico os ON p.ordem_id = os.id
        WHERE p.status = 'pendente'
          AND (p.data_vencimento IS NULL OR p.data_vencimento >= CURRENT_DATE)
          AND NOT EXISTS (
            SELECT 1 FROM parcelas_pagamento pp WHERE pp.pagamento_id = p.id
          )
        UNION ALL
        SELECT 
          pp.id,
          p.ordem_id,
          p.cliente_id,
          p.forma_pagamento,
          p.valor_total,
          NULL as valor_pago,
          p.parcelas as total_parcelas,
          pp.data_pagamento,
          pp.data_vencimento,
          pp.status,
          p.transaction_id,
          p.codigo_barras,
          p.link_boleto,
          p.criado_em as data_emissao,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
          os.codigo as ordem_codigo,
          pp.numero_parcela,
          pp.valor,
          0 as juros_aplicado
        FROM parcelas_pagamento pp
        INNER JOIN pagamentos p ON pp.pagamento_id = p.id
        INNER JOIN clientes c ON p.cliente_id = c.id
        INNER JOIN ordens_servico os ON p.ordem_id = os.id
        WHERE pp.status = 'pendente'
          AND (pp.data_vencimento IS NULL OR pp.data_vencimento >= CURRENT_DATE)
      `
      if (caixa_id) {
        query = query.replace('WHERE p.status = \'pendente\'', `WHERE p.status = 'pendente' AND p.caixa_id = $1`)
        query = query.replace('WHERE pp.status = \'pendente\'', `WHERE pp.status = 'pendente' AND p.caixa_id = $1`)
        params.push(caixa_id)
      }
    } else if (status === 'Pagamentos Pagos') {
      // Pagamentos pagos (excluindo 'gerado')
      query = `
        SELECT 
          p.id,
          p.ordem_id,
          p.cliente_id,
          p.forma_pagamento,
          p.valor_total,
          p.valor_pago,
          p.parcelas,
          p.data_pagamento,
          p.data_vencimento,
          p.status,
          p.transaction_id,
          p.codigo_barras,
          p.link_boleto,
          p.criado_em as data_emissao,
          c.nome as cliente_nome,
          os.codigo as ordem_codigo,
          NULL as numero_parcela,
          NULL as valor,
          0 as juros_aplicado
        FROM pagamentos p
        INNER JOIN clientes c ON p.cliente_id = c.id
        INNER JOIN ordens_servico os ON p.ordem_id = os.id
        WHERE p.status = 'pago'
          AND NOT EXISTS (
            SELECT 1 FROM parcelas_pagamento pp WHERE pp.pagamento_id = p.id
          )
        UNION ALL
        SELECT 
          pp.id,
          p.ordem_id,
          p.cliente_id,
          p.forma_pagamento,
          p.valor_total,
          NULL as valor_pago,
          p.parcelas,
          pp.data_pagamento,
          pp.data_vencimento,
          pp.status,
          p.transaction_id,
          p.codigo_barras,
          p.link_boleto,
          p.criado_em as data_emissao,
          c.nome as cliente_nome,
          os.codigo as ordem_codigo,
          pp.numero_parcela,
          pp.valor,
          0 as juros_aplicado
        FROM parcelas_pagamento pp
        INNER JOIN pagamentos p ON pp.pagamento_id = p.id
        INNER JOIN clientes c ON p.cliente_id = c.id
        INNER JOIN ordens_servico os ON p.ordem_id = os.id
        WHERE pp.status = 'pago'
      `
      if (caixa_id) {
        query = query.replace('WHERE p.status = \'pago\'', `WHERE p.status = 'pago' AND p.caixa_id = $1`)
        query = query.replace('WHERE pp.status = \'pago\'', `WHERE pp.status = 'pago' AND p.caixa_id = $1`)
        params.push(caixa_id)
      }
    } else if (status === 'Pagamentos Vencido') {
      // Primeiro, atualizar status para 'vencido' quando data_vencimento passou
      await pool.query(`
        UPDATE pagamentos 
        SET status = 'vencido', atualizado_em = NOW()
        WHERE data_vencimento < CURRENT_DATE
          AND status NOT IN ('pago', 'gerado', 'vencido')
          AND NOT EXISTS (
            SELECT 1 FROM parcelas_pagamento pp WHERE pp.pagamento_id = pagamentos.id
          )
      `)
      
      await pool.query(`
        UPDATE parcelas_pagamento 
        SET status = 'vencido', atualizado_em = NOW()
        WHERE data_vencimento < CURRENT_DATE
          AND status NOT IN ('pago', 'vencido')
      `)
      
      // Pagamentos vencidos (apenas com status 'vencido')
      query = `
        SELECT 
          p.id,
          p.ordem_id,
          p.cliente_id,
          p.forma_pagamento,
          p.valor_total,
          p.valor_pago,
          p.parcelas as total_parcelas,
          p.data_pagamento,
          p.data_vencimento,
          p.status,
          p.transaction_id,
          p.codigo_barras,
          p.link_boleto,
          p.criado_em as data_emissao,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
          os.codigo as ordem_codigo,
          NULL as numero_parcela,
          NULL as valor,
          0 as juros_aplicado
        FROM pagamentos p
        INNER JOIN clientes c ON p.cliente_id = c.id
        INNER JOIN ordens_servico os ON p.ordem_id = os.id
        WHERE p.status = 'vencido'
          AND NOT EXISTS (
            SELECT 1 FROM parcelas_pagamento pp WHERE pp.pagamento_id = p.id
          )
        UNION ALL
        SELECT 
          pp.id,
          p.ordem_id,
          p.cliente_id,
          p.forma_pagamento,
          p.valor_total,
          NULL as valor_pago,
          p.parcelas as total_parcelas,
          pp.data_pagamento,
          pp.data_vencimento,
          pp.status,
          p.transaction_id,
          p.codigo_barras,
          p.link_boleto,
          p.criado_em as data_emissao,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
          os.codigo as ordem_codigo,
          pp.numero_parcela,
          pp.valor,
          0 as juros_aplicado
        FROM parcelas_pagamento pp
        INNER JOIN pagamentos p ON pp.pagamento_id = p.id
        INNER JOIN clientes c ON p.cliente_id = c.id
        INNER JOIN ordens_servico os ON p.ordem_id = os.id
        WHERE pp.status = 'vencido'
      `
      if (caixa_id) {
        query = query.replace('WHERE p.status = \'vencido\'', `WHERE p.status = 'vencido' AND p.caixa_id = $1`)
        query = query.replace('WHERE pp.status = \'vencido\'', `WHERE pp.status = 'vencido' AND p.caixa_id = $1`)
        params.push(caixa_id)
      }
    } else {
      // Query padrão (sem filtro de status específico)
      query = `
        SELECT 
          p.id,
          p.ordem_id,
          p.cliente_id,
          p.forma_pagamento,
          p.valor_total,
          p.valor_pago,
          p.parcelas,
          p.data_pagamento,
          p.data_vencimento,
          p.status,
          p.transaction_id,
          p.codigo_barras,
          p.link_boleto,
          p.criado_em as data_emissao,
          c.nome as cliente_nome,
          os.codigo as ordem_codigo,
          NULL as numero_parcela,
          NULL as valor,
          0 as juros_aplicado
        FROM pagamentos p
        INNER JOIN clientes c ON p.cliente_id = c.id
        INNER JOIN ordens_servico os ON p.ordem_id = os.id
        WHERE NOT EXISTS (
          SELECT 1 FROM parcelas_pagamento pp WHERE pp.pagamento_id = p.id
        )
      `
      if (caixa_id) {
        query += ` AND p.caixa_id = $1`
        params.push(caixa_id)
      }
    }

    query += ` ORDER BY data_emissao DESC, numero_parcela ASC`

    const result = await pool.query(query, params)

    res.json({ parcelas: result.rows })
  } catch (error) {
    console.error('Erro ao buscar parcelas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Gerar recibo de pagamento
export const gerarRecibo = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID do pagamento é obrigatório' });
    }

    // Buscar dados do pagamento
    const pagamentoResult = await pool.query(
      `SELECT 
        p.*,
        c.nome as cliente_nome,
        c.cpf,
        c.cnpj,
        c.email as cliente_email,
        c.telefone as cliente_telefone,
        c.endereco as cliente_endereco,
        c.cidade as cliente_cidade,
        c.estado as cliente_estado,
        c.cep as cliente_cep,
        os.codigo as ordem_codigo,
        os.descricao as ordem_descricao,
        os.total as ordem_total,
        os.subtotal as ordem_subtotal
      FROM pagamentos p
      INNER JOIN clientes c ON p.cliente_id = c.id
      INNER JOIN ordens_servico os ON p.ordem_id = os.id
      WHERE p.id = $1`,
      [id]
    );

    if (pagamentoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const pagamento = pagamentoResult.rows[0];

    // Verificar se o pagamento está pago
    if (pagamento.status !== 'pago') {
      return res.status(400).json({ error: 'Apenas pagamentos com status "pago" podem gerar recibo' });
    }

    // Importar PDFDocument
    const PDFDocument = (await import('pdfkit')).default;

    // Criar documento PDF
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Configurar headers para download do PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recibo-${id}.pdf"`);

    // Pipe do PDF para a resposta
    doc.pipe(res);

    // Título
    doc.fontSize(20).font('Helvetica-Bold').text('RECIBO', { align: 'center' });
    doc.moveDown(1);

    // Linha separadora
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Dados do recibo
    doc.fontSize(12).font('Helvetica');
    
    // Data do recibo
    const dataRecibo = pagamento.data_pagamento 
      ? new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');
    
    doc.text(`Data: ${dataRecibo}`, { align: 'right' });
    doc.moveDown(1);

    // Texto do recibo
    doc.fontSize(11);
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(pagamento.valor_pago || pagamento.valor_total);

    doc.text(`Recebi de ${pagamento.cliente_nome}`, 50, doc.y);
    doc.moveDown(0.5);
    
    // CPF/CNPJ do cliente
    if (pagamento.cpf) {
      const cpfFormatado = pagamento.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      doc.text(`CPF: ${cpfFormatado}`, 50, doc.y);
      doc.moveDown(0.5);
    } else if (pagamento.cnpj) {
      const cnpjFormatado = pagamento.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      doc.text(`CNPJ: ${cnpjFormatado}`, 50, doc.y);
      doc.moveDown(0.5);
    }

    doc.text(`a quantia de ${valorFormatado}`, 50, doc.y);
    doc.moveDown(0.5);
    doc.text(`referente ao pagamento da ${pagamento.ordem_codigo || `Ordem de Serviço #${pagamento.ordem_id}`}`, 50, doc.y);
    doc.moveDown(0.5);
    
    // Forma de pagamento
    doc.text(`Forma de pagamento: ${pagamento.forma_pagamento}`, 50, doc.y);
    doc.moveDown(1);

    // Valor por extenso (simplificado)
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Valor: ${valorFormatado}`, 50, doc.y);
    doc.moveDown(2);

    // Linha separadora
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Assinatura
    doc.fontSize(10).font('Helvetica');
    doc.text('_________________________', 50, doc.y, { align: 'center' });
    doc.moveDown(0.3);
    doc.text('Assinatura', 50, doc.y, { align: 'center' });

    // Finalizar PDF
    doc.end();

  } catch (error) {
    console.error('Erro ao gerar recibo:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar recibo',
      details: error.message 
    });
  }
};

// Atualizar parcela/pagamento (marcar como pago manualmente)
export const updateParcelaPagamento = async (req, res) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const { id } = req.params
    const { status, data_pagamento, usuario_id } = req.body
    
    // Normalizar status
    const statusNormalizado = status ? status.toLowerCase() : null
    
    // Buscar dados da parcela/pagamento
    const parcelaResult = await client.query(
      `SELECT 
        pp.*, 
        p.ordem_id, 
        p.forma_pagamento,
        p.valor_total,
        p.cliente_id,
        os.estabelecimento_id,
        c.nome as cliente_nome
      FROM parcelas_pagamento pp
      INNER JOIN pagamentos p ON pp.pagamento_id = p.id
      INNER JOIN ordens_servico os ON p.ordem_id = os.id
      INNER JOIN clientes c ON p.cliente_id = c.id
      WHERE pp.id = $1`,
      [id]
    )
    
    let isParcela = parcelaResult.rows.length > 0
    let registro = isParcela ? parcelaResult.rows[0] : null
    
    // Se não for parcela, buscar pagamento à vista
    if (!isParcela) {
      const pagamentoResult = await client.query(
        `SELECT 
          p.*,
          os.estabelecimento_id,
          c.nome as cliente_nome
        FROM pagamentos p
        INNER JOIN ordens_servico os ON p.ordem_id = os.id
        INNER JOIN clientes c ON p.cliente_id = c.id
        WHERE p.id = $1
          AND NOT EXISTS (
            SELECT 1 FROM parcelas_pagamento pp2 
            WHERE pp2.pagamento_id = p.id
          )`,
        [id]
      )
      
      if (pagamentoResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Pagamento não encontrado' })
      }
      
      registro = pagamentoResult.rows[0]
    }
    
    const statusAnterior = registro.status
    
    // Atualizar registro
    const updateFields = []
    const values = []
    let paramIndex = 1
    
    if (statusNormalizado) {
      updateFields.push(`status = $${paramIndex++}`)
      values.push(statusNormalizado)
    }
    
    if (statusNormalizado === 'pago') {
      const dataPagamentoFinal = data_pagamento || getDataLocal()
      updateFields.push(`data_pagamento = $${paramIndex++}`)
      values.push(dataPagamentoFinal)
      
      if (!isParcela) {
        updateFields.push(`valor_pago = $${paramIndex++}`)
        values.push(registro.valor_total)
      }
    } else if (statusNormalizado !== 'pago' && !isParcela) {
      updateFields.push(`data_pagamento = NULL`)
      updateFields.push(`valor_pago = NULL`)
    } else if (data_pagamento !== undefined) {
      updateFields.push(`data_pagamento = $${paramIndex++}`)
      values.push(data_pagamento || null)
    }
    
    values.push(id)
    
    const tableName = isParcela ? 'parcelas_pagamento' : 'pagamentos'
    await client.query(
      `UPDATE ${tableName} 
       SET ${updateFields.join(', ')}, atualizado_em = NOW()
       WHERE id = $${paramIndex}`,
      values
    )
    
    // Criar notificação se foi marcado como pago manualmente
    if (statusNormalizado === 'pago' && statusAnterior !== 'pago') {
      try {
        // Usar usuario_id do body ou tentar buscar de outra forma
        const usuarioId = usuario_id || req.user?.id || null
        // Garantir que valor seja um número
        const valorBruto = isParcela ? (registro.valor || registro.valor_total) : registro.valor_total
        const valor = typeof valorBruto === 'number' ? valorBruto : parseFloat(valorBruto) || 0
        
        await criarNotificacaoPagamento({
          tipo: 'pagamento_realizado',
          pagamentoId: isParcela ? registro.pagamento_id : registro.id,
          metodoPagamento: registro.forma_pagamento || 'Desconhecido',
          clienteNome: registro.cliente_nome,
          valor: valor,
          ordemId: registro.ordem_id,
          usuarioId: usuarioId,
          destinatarioId: null, // Broadcast para todos os usuários
          metadata: {
            ...(isParcela && { parcela_numero: registro.numero_parcela }),
            data_pagamento: new Date().toISOString()
          }
        })
        
        console.log(`✅ Notificação de pagamento realizado criada para pagamento ID: ${isParcela ? registro.pagamento_id : registro.id}`)
      } catch (notificacaoError) {
        console.error('Erro ao criar notificação de pagamento realizado:', notificacaoError)
        // Não falhar a atualização se a notificação falhar
      }
    }
    
    await client.query('COMMIT')
    res.json({ 
      message: isParcela ? 'Parcela atualizada com sucesso' : 'Pagamento atualizado com sucesso' 
    })
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Erro ao atualizar parcela/pagamento:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  } finally {
    client.release()
  }
}
