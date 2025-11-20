import pool from '../config/db.js'
import PDFDocument from 'pdfkit'
import nodemailer from 'nodemailer'

// Configurar transporter de email
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

// Função auxiliar para gerar PDF em buffer (reutiliza lógica do ordemPDF.js)
const gerarPDFBuffer = async (ordem, itens) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, left: 40, right: 40, bottom: 60 }
    })

    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = 595 - 80
    const left = 40
    let y = 40

    const fmtMoeda = v =>
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(v || 0)

    const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR') : '--'

    // Cabeçalho
    const headerHeight = 65
    const dataBoxWidth = 130
    const headerBoxWidth = pageWidth - dataBoxWidth
    
    doc.rect(left, y, headerBoxWidth, headerHeight)
      .strokeColor('#999').lineWidth(0.8).stroke()

    let headerY = y + 8
    doc.fontSize(14).font('Helvetica-Bold')
      .text(ordem.estabelecimento_nome || 'Estabelecimento', left + 10, headerY)
    headerY += 18
    doc.fontSize(10).font('Helvetica')
      .text(`CNPJ: ${ordem.estabelecimento_cnpj || '--'}`, left + 10, headerY)
    headerY += 14
    doc.text(`Endereço: ${ordem.estabelecimento_endereco || '--'}`, left + 10, headerY)

    const dataBoxX = left + pageWidth - dataBoxWidth
    doc.rect(dataBoxX, y, dataBoxWidth, headerHeight)
      .strokeColor('#999').lineWidth(0.8).stroke()

    const dataTexto = fmtData(ordem.data_abertura)
    doc.fontSize(10).font('Helvetica-Bold')
      .text('Emitido em:', dataBoxX + 10, y + 12)
    doc.font('Helvetica')
      .text(dataTexto, dataBoxX + 10, y + 28)

    y += headerHeight + 20
    doc.fontSize(15).font('Helvetica-Bold')
      .text('ORDEM DE SERVIÇO', left, y, { width: pageWidth, align: 'center' })
    y += 30

    // Função de linha
    const linhaBlocos = (campos, height = 38, fontSizeValor = 10) => {
      const colWidth = pageWidth / campos.length
      let x = left
      campos.forEach(({ campo, valor }) => {
        doc.rect(x, y, colWidth, height)
          .strokeColor('#999').lineWidth(0.5).stroke()
        doc.fontSize(8).font('Helvetica-Bold')
          .text(campo, x + 5, y + 4, { width: colWidth - 10 })
        doc.fontSize(fontSizeValor).font('Helvetica')
          .text(valor || '--', x + 5, y + 16, { width: colWidth - 10, ellipsis: true })
        x += colWidth
      })
      y += height
    }

    // Dados do cliente
    linhaBlocos([
      { campo: 'Código', valor: ordem.codigo || ordem.id },
      { campo: 'Cliente', valor: ordem.cliente_nome },
      { campo: 'WhatsApp', valor: ordem.cliente_whatsapp },
      { campo: 'CPF/CNPJ', valor: ordem.cpf || ordem.cnpj }
    ])
    linhaBlocos([
      { campo: 'E-mail', valor: ordem.cliente_email },
      { campo: 'Endereço', valor: ordem.cliente_endereco }
    ])
    linhaBlocos([
      { campo: 'Marca', valor: ordem.marca },
      { campo: 'Modelo', valor: ordem.modelo },
      { campo: 'Placa', valor: ordem.placa },
      { campo: 'Ano', valor: ordem.ano },
      { campo: 'Cor', valor: ordem.cor }
    ])
    linhaBlocos([
      { campo: 'Descrição', valor: ordem.descricao || '--' },
      { campo: 'Data de Abertura', valor: fmtData(ordem.data_abertura || ordem.criado_em) },
      { campo: 'Data de Fechamento', valor: fmtData(ordem.data_fechamento) },
      { campo: 'Responsável', valor: ordem.responsavel_nome || '--' }
    ], 38, 8)

    y += 15

    // Produtos e serviços
    if (itens.length) {
      doc.fontSize(10).font('Helvetica-Bold')
        .text('PRODUTOS E SERVIÇOS', left, y)
      y += 16

      const headerHeight = 22
      const rowHeight = 20
      const totalRowHeight = 22

      doc.rect(left, y, pageWidth, headerHeight).strokeColor('#999').lineWidth(0.5).stroke()
      doc.fontSize(9).font('Helvetica-Bold')
      doc.text('Item', left + 6, y + 5, { width: pageWidth * 0.45 })
      doc.text('Qtd', left + pageWidth * 0.45, y + 5, { width: pageWidth * 0.1 })
      doc.text('Unitário', left + pageWidth * 0.55, y + 5, { width: pageWidth * 0.2 })
      doc.text('Total', left + pageWidth * 0.75, y + 5, { width: pageWidth * 0.2, align: 'right' })
      y += headerHeight

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
      doc.rect(left, y, pageWidth, totalRowHeight).strokeColor('#999').lineWidth(0.5).stroke()
      
      const subtotal = itens.reduce((s, i) => s + parseFloat(i.total || 0), 0)
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('TOTAL', left + 6, y + 6, { width: pageWidth * 0.55 })
      doc.text(fmtMoeda(subtotal), left + pageWidth * 0.75, y + 6, { width: pageWidth * 0.2, align: 'right' })
      y += totalRowHeight + 10
    }

    // Resumo financeiro
    const subtotal = itens.reduce((s, i) => s + parseFloat(i.total || 0), 0)
    const desconto = parseFloat(ordem.desconto || 0)
    const acrescimo = parseFloat(ordem.acrescimos || 0)
    const total = subtotal - desconto + acrescimo

    doc.fontSize(10).font('Helvetica-Bold')
      .text('RESUMO FINANCEIRO', left, y)
    y += 14

    const col1 = pageWidth * 0.6
    const col2 = pageWidth * 0.4
    const resumoHeaderHeight = 22
    const resumoRowHeight = 20
    const resumoTotalRowHeight = 22

    doc.rect(left, y, pageWidth, resumoHeaderHeight).strokeColor('#999').lineWidth(0.5).stroke()
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Resumo', left + 6, y + 6, { width: col1 - 12 })
      .text('Valor', left + col1 + 6, y + 6, { width: col2 - 12, align: 'right' })
    y += resumoHeaderHeight

    const resumoRows = [
      { label: 'Subtotal', value: fmtMoeda(subtotal) },
      { label: 'Acréscimos', value: fmtMoeda(acrescimo) },
      { label: 'Descontos', value: fmtMoeda(desconto) }
    ]

    const resumoDataHeight = resumoRows.length * resumoRowHeight
    doc.rect(left, y, pageWidth, resumoDataHeight).strokeColor('#999').lineWidth(0.5).stroke()

    resumoRows.forEach((row, idx) => {
      const posY = y + idx * resumoRowHeight + 4
      doc.fontSize(9).font('Helvetica')
      doc.text(row.label, left + 6, posY, { width: col1 - 12 })
      doc.text(row.value, left + col1 + 6, posY, { width: col2 - 12, align: 'right' })
    })

    y += resumoDataHeight
    doc.rect(left, y, pageWidth, resumoTotalRowHeight).strokeColor('#999').lineWidth(0.5).stroke()
    doc.fontSize(10).font('Helvetica-Bold')
      .text('TOTAL GERAL', left + 6, y + 6, { width: col1 - 12 })
      .text(fmtMoeda(total), left + col1 + 6, y + 6, { width: col2 - 12, align: 'right' })

    y += resumoTotalRowHeight + 10

    // Assinaturas
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
  })
}

// Enviar PDF da ordem por email
export const enviarPDFPorEmail = async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.body // ID do usuário logado que está enviando
    
    if (!id) {
      return res.status(400).json({ error: 'ID da ordem é obrigatório' })
    }

    // Buscar dados da ordem e cliente
    const ordemResult = await pool.query(`
      SELECT os.*, 
        c.nome AS cliente_nome, 
        c.email AS cliente_email,
        c.whatsapp AS cliente_whatsapp,
        c.cpf, c.cnpj, c.endereco AS cliente_endereco,
        v.placa, v.marca, v.modelo, v.ano, v.cor,
        e.nome AS estabelecimento_nome, 
        e.cnpj AS estabelecimento_cnpj, 
        e.endereco AS estabelecimento_endereco,
        e.id AS estabelecimento_id,
        u.nome AS responsavel_nome
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      LEFT JOIN estabelecimentos e ON os.estabelecimento_id = e.id
      LEFT JOIN usuarios u ON os.resposavel = u.id
      WHERE os.id = $1
    `, [id])

    if (!ordemResult.rows.length) {
      return res.status(404).json({ error: 'Ordem não encontrada' })
    }

    const ordem = ordemResult.rows[0]

    // Verificar se o cliente tem email
    if (!ordem.cliente_email) {
      return res.status(400).json({ error: 'Cliente não possui email cadastrado' })
    }

    // Buscar email do usuário logado primeiro (se fornecido)
    let remetente = null
    let remetenteNome = null

    if (user_id) {
      const usuarioLogadoResult = await pool.query(`
        SELECT id, nome, email
        FROM usuarios
        WHERE id = $1
          AND estabelecimento_id = $2
          AND status = 'Ativo'
      `, [user_id, ordem.estabelecimento_id])

      if (usuarioLogadoResult.rows.length && usuarioLogadoResult.rows[0].email) {
        remetente = usuarioLogadoResult.rows[0]
        remetenteNome = remetente.nome
      }
    }

    // Se não encontrou email do usuário logado, buscar administrador como fallback
    if (!remetente) {
      const adminResult = await pool.query(`
        SELECT id, nome, email
        FROM usuarios
        WHERE estabelecimento_id = $1
          AND cargo = 'Administrador'
          AND status = 'Ativo'
        ORDER BY id ASC
        LIMIT 1
      `, [ordem.estabelecimento_id])

      if (adminResult.rows.length && adminResult.rows[0].email) {
        remetente = adminResult.rows[0]
        remetenteNome = remetente.nome
      }
    }

    // Se ainda não encontrou nenhum email válido
    if (!remetente || !remetente.email) {
      return res.status(400).json({ 
        error: 'Nenhum usuário com email cadastrado encontrado. Por favor, cadastre um email no seu perfil ou verifique se há um administrador com email cadastrado.' 
      })
    }

    // Verificar se SMTP está configurado
    const smtpHost = process.env.SMTP_HOST
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    
    if (!smtpHost || !smtpUser || !smtpPass) {
      const missingVars = []
      if (!smtpHost) missingVars.push('SMTP_HOST')
      if (!smtpUser) missingVars.push('SMTP_USER')
      if (!smtpPass) missingVars.push('SMTP_PASS')
      
      return res.status(500).json({ 
        error: `Serviço de email não configurado. Variáveis de ambiente faltando: ${missingVars.join(', ')}. Por favor, configure as variáveis SMTP_HOST, SMTP_USER e SMTP_PASS no arquivo .env do servidor.` 
      })
    }

    // Criar transporter usando as credenciais SMTP configuradas
    // Nota: O email do remetente (from) será o do usuário/administrador, mas as credenciais SMTP
    // devem ser de uma conta de email válida configurada no servidor
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true para porta 465, false para outras portas
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    })

    // Buscar itens
    const itensResult = await pool.query(`
      SELECT nome_item, quantidade, preco_unitario, total 
      FROM ordens_servico_itens
      WHERE ordem_servico_id = $1
        AND status = 'Ativo'
      ORDER BY criado_em ASC
    `, [id])
    const itens = itensResult.rows

    // Gerar PDF em buffer
    const pdfBuffer = await gerarPDFBuffer(ordem, itens)

    // Preparar email (usando email do usuário logado ou administrador como remetente)
    const mailOptions = {
      from: `"${remetenteNome}" <${remetente.email}>`,
      to: ordem.cliente_email,
      subject: `Ordem de Serviço ${ordem.codigo || id} - ${ordem.estabelecimento_nome || 'Estabelecimento'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Olá, ${ordem.cliente_nome}!</h2>
          <p>Segue em anexo o relatório da sua ordem de serviço.</p>
          <p><strong>Código da Ordem:</strong> ${ordem.codigo || id}</p>
          <p>Qualquer dúvida, entre em contato conosco.</p>
          <p>Atenciosamente,<br>${remetenteNome}<br>${ordem.estabelecimento_nome || 'Equipe'}</p>
        </div>
      `,
      attachments: [
        {
          filename: `ordem-${ordem.codigo || id}.pdf`,
          content: pdfBuffer
        }
      ]
    }

    // Enviar email
    await transporter.sendMail(mailOptions)

    res.json({ 
      message: 'Email enviado com sucesso!',
      email: ordem.cliente_email,
      remetente: remetente.email,
      remetenteNome: remetenteNome
    })
  } catch (error) {
    console.error('Erro ao enviar PDF por email:', error)
    res.status(500).json({ 
      error: 'Erro ao enviar PDF por email',
      details: error.message 
    })
  }
}

