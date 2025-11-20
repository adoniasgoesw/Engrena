import pool from '../config/db.js'
import PDFDocument from 'pdfkit'
import { gerarQRCodePixSimples } from '../utils/pixQRCode.js'

export const gerarPDFOrdem = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: 'ID obrigatório' })

    const ordemResult = await pool.query(`
      SELECT os.*, 
        c.nome AS cliente_nome, c.cpf, c.cnpj, c.whatsapp AS cliente_whatsapp, 
        c.email AS cliente_email, c.endereco AS cliente_endereco,
        v.placa, v.marca, v.modelo, v.ano, v.cor,
        e.nome AS estabelecimento_nome, e.cnpj AS estabelecimento_cnpj, e.endereco AS estabelecimento_endereco,
        u.nome AS responsavel_nome
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      LEFT JOIN estabelecimentos e ON os.estabelecimento_id = e.id
      LEFT JOIN usuarios u ON os.resposavel = u.id
      WHERE os.id = $1
    `, [id])

    if (!ordemResult.rows.length)
      return res.status(404).json({ error: 'Ordem não encontrada' })

    const ordem = ordemResult.rows[0]

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

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, left: 40, right: 40, bottom: 60 }
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="ordem-${id}.pdf"`)
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

    // ---------------- CABEÇALHO ----------------
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

    const dataTexto = fmtData(ordem.data_abertura)

    doc.fontSize(10).font('Helvetica-Bold')
      .text('Emitido em:', dataBoxX + 10, y + 12)
    doc.font('Helvetica')
      .text(dataTexto, dataBoxX + 10, y + 28)

    // Separação
    y += headerHeight + 20

    doc.fontSize(15).font('Helvetica-Bold')
      .text('ORDEM DE SERVIÇO', left, y, { width: pageWidth, align: 'center' })

    y += 30

    // ---------------- FUNÇÃO DE LINHA ----------------
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

    // ---------------- DADOS DO CLIENTE ----------------
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

    // ---------------- PRODUTOS E SERVIÇOS ----------------
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

    // ---------------- RESUMO FINANCEIRO ----------------
    doc.fontSize(10).font('Helvetica-Bold')
      .text('RESUMO FINANCEIRO', left, y)

    y += 14

    const resumoRows = [
      { label: 'Subtotal', value: fmtMoeda(subtotal) },
      { label: 'Acréscimos', value: fmtMoeda(acrescimo) },
      { label: 'Descontos', value: fmtMoeda(desconto) }
    ]

    const col1 = pageWidth * 0.6
    const col2 = pageWidth * 0.4
    const resumoHeaderHeight = 22
    const resumoRowHeight = 20
    const resumoTotalRowHeight = 22

    // Cabeçalho
    doc.rect(left, y, pageWidth, resumoHeaderHeight).strokeColor('#999').lineWidth(0.5).stroke()

    doc.fontSize(9).font('Helvetica-Bold')
      .text('Resumo', left + 6, y + 6, { width: col1 - 12 })
      .text('Valor', left + col1 + 6, y + 6, { width: col2 - 12, align: 'right' })

    y += resumoHeaderHeight

    // Linhas de dados (sem bordas internas)
    const resumoDataHeight = resumoRows.length * resumoRowHeight
    doc.rect(left, y, pageWidth, resumoDataHeight).strokeColor('#999').lineWidth(0.5).stroke()

    resumoRows.forEach((row, idx) => {
      const posY = y + idx * resumoRowHeight + 4
      doc.fontSize(9).font('Helvetica')
      doc.text(row.label, left + 6, posY, { width: col1 - 12 })
      doc.text(row.value, left + col1 + 6, posY, { width: col2 - 12, align: 'right' })
    })

    y += resumoDataHeight

    // Rodapé com TOTAL GERAL
    doc.rect(left, y, pageWidth, resumoTotalRowHeight).strokeColor('#999').lineWidth(0.5).stroke()
    doc.fontSize(10).font('Helvetica-Bold')
      .text('TOTAL GERAL', left + 6, y + 6, { width: col1 - 12 })
      .text(fmtMoeda(total), left + col1 + 6, y + 6, { width: col2 - 12, align: 'right' })

    y += resumoTotalRowHeight + 20

    // ---------------- QR CODE PIX ----------------
    try {
      const chavePix = '13294103948' // CPF para teste
      const qrCodeBuffer = await gerarQRCodePixSimples(chavePix, total)
      
      // Posicionar QR Code no canto esquerdo
      const qrSize = 80
      const qrX = left
      const qrY = y
      
      doc.image(qrCodeBuffer, qrX, qrY, { width: qrSize, height: qrSize })
      
      // Texto abaixo do QR Code
      doc.fontSize(9).font('Helvetica-Bold')
        .text('Pague com Pix', qrX, qrY + qrSize + 5, { width: qrSize, align: 'center' })
      
      y += qrSize + 25
    } catch (qrError) {
      console.error('Erro ao gerar QR Code:', qrError)
      // Continuar mesmo se o QR Code falhar
    }

    // ---------------- OBSERVAÇÕES ----------------
    if (ordem.observacoes) {
      doc.fontSize(12).font('Helvetica-Bold').text('OBSERVAÇÕES', left, y)
      y += 14

      const obsHeight = 60
      doc.rect(left, y, pageWidth, obsHeight).stroke()
      doc.fontSize(10).font('Helvetica')
        .text(ordem.observacoes, left + 8, y + 8, { width: pageWidth - 16 })

      y += obsHeight + 20
    }

    // ---------------- ASSINATURAS NO RODAPÉ ----------------
    const pageBottom = doc.page.height - 80
    const signY = pageBottom

    const w = pageWidth / 2 - 20

    doc.moveTo(left, signY).lineTo(left + w, signY).stroke()
    doc.fontSize(10).font('Helvetica')
    doc.text(ordem.responsavel_nome || 'Responsável Técnico', left, signY + 5, { width: w, align: 'center' })

    doc.moveTo(left + w + 40, signY).lineTo(left + w * 2 + 40, signY).stroke()
    doc.text(ordem.cliente_nome || 'Cliente / Consumidor', left + w + 40, signY + 5, {
      width: w,
      align: 'center'
    })

    doc.end()

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro ao gerar PDF', details: e.message })
  }
}





