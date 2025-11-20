import pool from '../config/db.js'
import PDFDocument from 'pdfkit'
import { gerarQRCodePixSimples } from '../utils/pixQRCode.js'

export const gerarPDFPagamento = async (req, res) => {
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

    // Buscar pagamento pendente/vencido mais recente (ou o mais recente se não houver pendente)
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
        AND p.status IN ('pendente', 'gerado', 'vencido')
      ORDER BY 
        CASE 
          WHEN p.status = 'pendente' THEN 0 
          WHEN p.status = 'vencido' THEN 1
          ELSE 2 
        END,
        p.criado_em DESC
      LIMIT 1
    `, [id])

    const pagamento = pagamentoResult.rows[0] || null

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
    // Se parcelas for null, é à vista. Se for 1, é parcela única (1 de 1)
    const parcelas = pagamento ? pagamento.parcelas : null
    const dataVencimento = pagamento?.data_vencimento || null
    const formaPagamento = pagamento?.forma_pagamento || 'Não definida'
    
    // Buscar parcelas para determinar parcela atual e valor da parcela
    let parcelaAtual = null
    let totalParcelas = 1
    let valorParcela = valorTotal
    const isAVista = parcelas === null || parcelas === undefined
    
    if (pagamento && !isAVista && parcelas > 1) {
      // Se for parcelado (parcelas > 1), busca a primeira parcela pendente
      const parcelasResult = await pool.query(`
        SELECT numero_parcela, valor, status, data_vencimento
        FROM parcelas_pagamento
        WHERE pagamento_id = $1
        ORDER BY 
          CASE WHEN status = 'pendente' THEN 0 ELSE 1 END,
          numero_parcela ASC
        LIMIT 1
      `, [pagamento.id])
      
      if (parcelasResult.rows.length > 0) {
        const parcela = parcelasResult.rows[0]
        parcelaAtual = parcela.numero_parcela
        
        // Buscar total de parcelas para exibir "X de Y"
        const totalParcelasResult = await pool.query(`
          SELECT COUNT(*) as total
          FROM parcelas_pagamento
          WHERE pagamento_id = $1
        `, [pagamento.id])
        
        totalParcelas = totalParcelasResult.rows[0]?.total || parcelas
        valorParcela = parseFloat(parcela.valor || 0)
      } else {
        // Se não houver parcelas cadastradas, calcular o valor dividindo o total
        valorParcela = valorTotal / parcelas
        totalParcelas = parcelas
      }
    } else if (pagamento && !isAVista && parcelas === 1) {
      // Se parcelas = 1 (não null), é parcela única: "1 de 1"
      parcelaAtual = 1
      totalParcelas = 1
      valorParcela = valorTotal
    } else {
      // Se for à vista (parcelas = null), valor da parcela = valor total
      valorParcela = valorTotal
      totalParcelas = 1
    }

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, left: 40, right: 40, bottom: 60 }
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="pagamento-${id}.pdf"`)
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

    // ---------------- INFORMAÇÕES DE PAGAMENTO E RESUMO FINANCEIRO (ESTILO BOLETO) ----------------
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

    // Linha 2: Parcelas, Parcela Atual (2 colunas)
    // Se parcelas for null, é à vista. Se for 1, é "1". Se for > 1, é "Xx"
    const parcelaTexto = isAVista ? 'À vista' : (parcelas === 1 ? '1' : `${parcelas}x`)
    // Parcela atual: se for à vista, não mostra. Se parcelas = 1, mostra "1 de 1". Se > 1, mostra "X de Y"
    let parcelaAtualTexto = '--'
    if (!isAVista) {
      if (parcelas === 1) {
        parcelaAtualTexto = '1 de 1'
      } else if (parcelaAtual) {
        parcelaAtualTexto = `${parcelaAtual} de ${totalParcelas}`
      } else {
        parcelaAtualTexto = `-- de ${totalParcelas}`
      }
    }
    
    linhaBlocos([
      { campo: 'Parcelas', valor: parcelaTexto },
      { campo: 'Parcela Atual', valor: parcelaAtualTexto }
    ])

    // Linha 3: Forma de Pagamento, Valor a Pagar (2 colunas)
    linhaBlocos([
      { campo: 'Forma de Pagamento', valor: formaPagamento },
      { campo: 'Valor a Pagar', valor: fmtMoeda(valorParcela) }
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

    // NÃO ADICIONAR ASSINATURAS E QR CODE (PDF de pagamento)

    doc.end()

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao gerar PDF de pagamento', details: e.message })
  }
}
