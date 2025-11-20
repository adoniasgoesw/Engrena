import pool from '../config/db.js'
import PDFDocument from 'pdfkit'

export const gerarPDFPagamentoPago = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: 'ID obrigatório' })

    // Buscar dados completos da ordem, cliente, veículo e estabelecimento
    const ordemResult = await pool.query(`
      SELECT os.*, 
        c.nome AS cliente_nome, c.cpf, c.cnpj, c.whatsapp AS cliente_whatsapp, 
        c.email AS cliente_email, c.endereco AS cliente_endereco,
        v.placa, v.marca, v.modelo, v.ano, v.cor,
        e.nome AS estabelecimento_nome, e.cnpj AS estabelecimento_cnpj, 
        e.endereco AS estabelecimento_endereco,
        u_prop.email AS estabelecimento_email,
        u_prop.whatsapp AS estabelecimento_whatsapp,
        u.nome AS responsavel_nome
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      LEFT JOIN estabelecimentos e ON os.estabelecimento_id = e.id
      LEFT JOIN usuarios u ON os.resposavel = u.id
      LEFT JOIN usuarios u_prop ON e.id = u_prop.estabelecimento_id 
        AND u_prop.cargo = 'Proprietário' 
        AND u_prop.status = 'Ativo'
      WHERE os.id = $1
    `, [id])

    if (!ordemResult.rows.length)
      return res.status(404).json({ error: 'Ordem não encontrada' })

    const ordem = ordemResult.rows[0]

    // Buscar pagamento pago mais recente
    const pagamentoResult = await pool.query(`
      SELECT 
        p.id,
        p.valor_total,
        p.valor_pago,
        p.parcelas,
        p.data_vencimento,
        p.data_pagamento,
        p.forma_pagamento,
        p.status
      FROM pagamentos p
      WHERE p.ordem_id = $1
        AND p.status = 'pago'
      ORDER BY p.criado_em DESC
      LIMIT 1
    `, [id])

    // Se não encontrar pagamento pago, buscar parcela paga
    let pagamento = pagamentoResult.rows[0] || null
    let parcelaPaga = null
    let totalParcelas = 1
    let valorPago = 0
    let dataPagamento = null
    
    if (!pagamento) {
      // Buscar parcela paga mais recente
      const parcelaResult = await pool.query(`
        SELECT 
          pp.numero_parcela,
          pp.valor,
          pp.data_pagamento,
          pp.data_vencimento,
          pp.status,
          p.id as pagamento_id,
          p.valor_total,
          p.parcelas,
          p.forma_pagamento
        FROM parcelas_pagamento pp
        INNER JOIN pagamentos p ON pp.pagamento_id = p.id
        WHERE p.ordem_id = $1
          AND pp.status = 'pago'
        ORDER BY pp.data_pagamento DESC, pp.numero_parcela DESC
        LIMIT 1
      `, [id])
      
      if (parcelaResult.rows.length > 0) {
        const parcela = parcelaResult.rows[0]
        parcelaPaga = parcela.numero_parcela
        valorPago = parseFloat(parcela.valor || 0)
        dataPagamento = parcela.data_pagamento
        totalParcelas = parcela.parcelas || 1
        
        // Buscar total de parcelas do pagamento
        const totalParcelasResult = await pool.query(`
          SELECT COUNT(*) as total
          FROM parcelas_pagamento
          WHERE pagamento_id = $1
        `, [parcela.pagamento_id])
        
        if (totalParcelasResult.rows.length > 0) {
          totalParcelas = totalParcelasResult.rows[0]?.total || parcela.parcelas || 1
        }
        
        // Usar dados do pagamento pai
        pagamento = {
          id: parcela.pagamento_id,
          valor_total: parcela.valor_total,
          parcelas: parcela.parcelas,
          data_vencimento: parcela.data_vencimento,
          forma_pagamento: parcela.forma_pagamento,
          status: 'pago'
        }
      }
    } else {
      valorPago = parseFloat(pagamento.valor_pago || pagamento.valor_total || 0)
      dataPagamento = pagamento.data_pagamento
      totalParcelas = pagamento.parcelas || 1
      
      // Se for pagamento parcelado, buscar total de parcelas
      if (pagamento.parcelas > 1) {
        const totalParcelasResult = await pool.query(`
          SELECT COUNT(*) as total
          FROM parcelas_pagamento
          WHERE pagamento_id = $1
        `, [pagamento.id])
        
        if (totalParcelasResult.rows.length > 0) {
          totalParcelas = totalParcelasResult.rows[0]?.total || pagamento.parcelas || 1
        }
      }
    }

    const itensResult = await pool.query(`
      SELECT nome_item, quantidade, preco_unitario, total 
      FROM ordens_servico_itens
      WHERE ordem_servico_id = $1
        AND status = 'Ativo'
      ORDER BY criado_em ASC
    `, [id])
    const itens = itensResult.rows

    const subtotal = itens.reduce((s, i) => s + parseFloat(i.total || 0), 0)
    const desconto = parseFloat(ordem.desconto || 0)
    const acrescimo = parseFloat(ordem.acrescimos || 0)
    const total = subtotal - desconto + acrescimo
    
    // Usar valores do pagamento se existir, senão usar valores da ordem
    const valorTotal = pagamento ? parseFloat(pagamento.valor_total || 0) : total
    const parcelas = pagamento ? (pagamento.parcelas || 1) : 1
    const dataVencimento = pagamento?.data_vencimento || null
    const formaPagamento = pagamento?.forma_pagamento || 'Não definida'

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, left: 40, right: 40, bottom: 60 }
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="pagamento-pago-${id}.pdf"`)
    doc.pipe(res)

    const pageWidth = 595 - 80
    const left = 40
    let y = 40

    const fmtMoeda = v =>
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(v || 0)

    const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR') : '--'

    // ---------------- CABEÇALHO (IGUAL AO PDF DE ORDEM) ----------------
    const headerHeight = 65
    const dataBoxWidth = 130

    // Caixa esquerda
    const headerBoxWidth = pageWidth - dataBoxWidth
    doc.rect(left, y, headerBoxWidth, headerHeight)
      .strokeColor('#999').lineWidth(0.8).stroke()

    let headerY = y + 8

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(ordem.estabelecimento_nome || 'Estabelecimento', left + 10, headerY)

    headerY += 18
    doc.fontSize(10).font('Helvetica')
      .text(`CNPJ: ${ordem.estabelecimento_cnpj || '--'}`, left + 10, headerY)
    headerY += 14
    doc.text(`Endereço: ${ordem.estabelecimento_endereco || '--'}`, left + 10, headerY)

    // Caixa direita (Data)
    const dataBoxX = left + pageWidth - dataBoxWidth
    doc.rect(dataBoxX, y, dataBoxWidth, headerHeight)
      .strokeColor('#999').lineWidth(0.8).stroke()

    const dataTexto = fmtData(ordem.data_abertura || ordem.criado_em)

    doc.fontSize(10).font('Helvetica-Bold')
      .text('Emitido em:', dataBoxX + 10, y + 12)
    doc.font('Helvetica')
      .text(dataTexto, dataBoxX + 10, y + 28)

    // Separação
    y += headerHeight + 20

    doc.fontSize(15).font('Helvetica-Bold')
      .text('ORDEM DE SERVIÇO', left, y, { width: pageWidth, align: 'center' })

    y += 30

    // ---------------- FUNÇÃO DE LINHA (IGUAL AO PDF DE ORDEM) ----------------
    const linhaBlocos = (campos, height = 38, fontSizeValor = 10) => {
      const colWidth = pageWidth / campos.length
      let x = left

      campos.forEach(({ campo, valor }) => {
        doc.rect(x, y, colWidth, height)
          .strokeColor('#999')
          .lineWidth(0.5)
          .stroke()

        doc.fontSize(8).font('Helvetica-Bold')
          .text(campo, x + 5, y + 4, { width: colWidth - 10 })

        doc.fontSize(fontSizeValor).font('Helvetica')
          .text(valor || '--', x + 5, y + 16, { width: colWidth - 10, ellipsis: true })

        x += colWidth
      })

      y += height
    }

    // ---------------- DADOS DO CLIENTE (IGUAL AO PDF DE ORDEM) ----------------
    // Linha 1: Código, Cliente, WhatsApp, CPF/CNPJ
    linhaBlocos([
      { campo: 'Código', valor: ordem.codigo || id },
      { campo: 'Cliente', valor: ordem.cliente_nome },
      { campo: 'WhatsApp', valor: ordem.cliente_whatsapp },
      { campo: 'CPF/CNPJ', valor: ordem.cpf || ordem.cnpj }
    ])

    // Linha 2: E-mail, Endereço
    linhaBlocos([
      { campo: 'E-mail', valor: ordem.cliente_email },
      { campo: 'Endereço', valor: ordem.cliente_endereco }
    ])

    // Linha 3: Marca, Modelo, Placa, Ano, Cor (5 colunas)
    linhaBlocos([
      { campo: 'Marca', valor: ordem.marca },
      { campo: 'Modelo', valor: ordem.modelo },
      { campo: 'Placa', valor: ordem.placa },
      { campo: 'Ano', valor: ordem.ano },
      { campo: 'Cor', valor: ordem.cor }
    ])

    // Linha 4: Descrição, Data de Abertura, Data de Fechamento, Responsável
    linhaBlocos([
      { campo: 'Descrição', valor: ordem.descricao || '--' },
      { campo: 'Data de Abertura', valor: fmtData(ordem.data_abertura || ordem.criado_em) },
      { campo: 'Data de Fechamento', valor: fmtData(ordem.data_fechamento) },
      { campo: 'Responsável', valor: ordem.responsavel_nome || '--' }
    ], 38, 8) // height 38, fonte menor para descrição

    y += 15

    // ---------------- INFORMAÇÕES DE PAGAMENTO (PAGO) ----------------
    doc.fontSize(10).font('Helvetica-Bold')
      .text('INFORMAÇÕES DE PAGAMENTO', left, y)

    y += 16

    // Linha 1: Data de Vencimento, Desconto, Acréscimo, Total (4 colunas)
    linhaBlocos([
      { campo: 'Data de Vencimento', valor: dataVencimento ? fmtData(dataVencimento) : '--' },
      { campo: 'Desconto', valor: fmtMoeda(desconto) },
      { campo: 'Acréscimo', valor: fmtMoeda(acrescimo) },
      { campo: 'Total', valor: fmtMoeda(total) }
    ])

    // Linha 2: Parcelas, Parcela Paga, Forma de Pagamento (3 colunas)
    const parcelaTexto = parcelas > 1 ? `${parcelas}x` : 'À vista'
    const parcelaPagaTexto = parcelaPaga ? `${parcelaPaga} de ${totalParcelas}` : '--'
    
    linhaBlocos([
      { campo: 'Parcelas', valor: parcelaTexto },
      { campo: 'Parcela Paga', valor: parcelaPagaTexto },
      { campo: 'Forma de Pagamento', valor: formaPagamento }
    ])

    // Linha 3: Valor Pago, Data de Pagamento (2 colunas)
    linhaBlocos([
      { campo: 'Valor Pago', valor: fmtMoeda(valorPago) },
      { campo: 'Data de Pagamento', valor: dataPagamento ? fmtData(dataPagamento) : '--' }
    ])

    y += 15

    // ---------------- PRODUTOS E SERVIÇOS (IGUAL AO PDF DE ORDEM) ----------------
    if (itens.length) {
      doc.fontSize(10).font('Helvetica-Bold')
        .text('PRODUTOS E SERVIÇOS', left, y)

      y += 16

      const headerHeight = 22
      const rowHeight = 20
      const totalRowHeight = 22

      // Cabeçalho
      doc.rect(left, y, pageWidth, headerHeight).strokeColor('#999').lineWidth(0.5).stroke()

      doc.fontSize(9).font('Helvetica-Bold')
      doc.text('Item', left + 6, y + 5, { width: pageWidth * 0.45 })
      doc.text('Qtd', left + pageWidth * 0.45, y + 5, { width: pageWidth * 0.1 })
      doc.text('Unitário', left + pageWidth * 0.55, y + 5, { width: pageWidth * 0.2 })
      doc.text('Total', left + pageWidth * 0.75, y + 5, { width: pageWidth * 0.2, align: 'right' })

      y += headerHeight

      // Linhas de dados
      const tableHeight = itens.length * rowHeight
      doc.rect(left, y, pageWidth, tableHeight).strokeColor('#999').lineWidth(0.5).stroke()

      itens.forEach((i, idx) => {
        const posY = y + idx * rowHeight + 4
        doc.font('Helvetica').fontSize(9)

        doc.text(i.nome_item || '--', left + 6, posY, { width: pageWidth * 0.45 })
        doc.text(String(i.quantidade || ''), left + pageWidth * 0.45, posY)
        doc.text(fmtMoeda(i.preco_unitario || 0), left + pageWidth * 0.55, posY)
        doc.text(fmtMoeda(i.total || 0), left + pageWidth * 0.75, posY, {
          width: pageWidth * 0.2,
          align: 'right'
        })
      })

      y += tableHeight

      // Linha de total no rodapé
      doc.rect(left, y, pageWidth, totalRowHeight).strokeColor('#999').lineWidth(0.5).stroke()
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('TOTAL', left + 6, y + 6, { width: pageWidth * 0.55 })
      doc.text('', left + pageWidth * 0.55, y + 6, { width: pageWidth * 0.2 })
      doc.text(fmtMoeda(subtotal), left + pageWidth * 0.75, y + 6, { width: pageWidth * 0.2, align: 'right' })

      y += totalRowHeight + 10
    }

    // NÃO ADICIONAR ASSINATURAS E QR CODE (PDF de pagamento pago)

    doc.end()

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao gerar PDF de pagamento pago', details: e.message })
  }
}

