import pool from '../config/db.js'
import ExcelJS from 'exceljs'

// Gerar planilha Excel da ordem de serviço
export const gerarExcelOrdem = async (req, res) => {
  try {
    const { id } = req.params
    
    if (!id) {
      return res.status(400).json({ error: 'ID da ordem é obrigatório' })
    }

    // Buscar dados completos da ordem
    const ordemResult = await pool.query(
      `SELECT 
        os.*,
        c.nome as cliente_nome,
        c.cpf,
        c.cnpj,
        c.whatsapp as cliente_whatsapp,
        c.endereco as cliente_endereco,
        c.email as cliente_email,
        v.placa as veiculo_placa,
        v.marca as veiculo_marca,
        v.modelo as veiculo_modelo,
        v.ano as veiculo_ano,
        v.cor as veiculo_cor,
        e.nome as estabelecimento_nome,
        e.cnpj as estabelecimento_cnpj,
        e.endereco as estabelecimento_endereco,
        responsavel_user.nome as responsavel_nome,
        responsavel_user.whatsapp as responsavel_whatsapp,
        aberto_por_user.nome as aberto_por_nome
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      LEFT JOIN estabelecimentos e ON os.estabelecimento_id = e.id
      LEFT JOIN usuarios responsavel_user ON os.resposavel = responsavel_user.id
      LEFT JOIN usuarios aberto_por_user ON os.aberto_por = aberto_por_user.id
      WHERE os.id = $1`,
      [id]
    )

    if (ordemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ordem não encontrada' })
    }

    const ordem = ordemResult.rows[0]

    // Buscar itens da ordem
    const itensResult = await pool.query(
      `SELECT 
        osi.id,
        osi.nome_item,
        osi.quantidade,
        osi.preco_unitario,
        osi.total,
        osi.status,
        i.tipo as item_tipo
      FROM ordens_servico_itens osi
      LEFT JOIN itens i ON osi.item_id = i.id
      WHERE osi.ordem_servico_id = $1 AND osi.status = 'Ativo'
      ORDER BY osi.criado_em ASC`,
      [id]
    )

    const itens = itensResult.rows

    // Calcular totais
    const subtotal = itens.reduce((sum, item) => sum + parseFloat(item.total || 0), 0)
    const desconto = parseFloat(ordem.desconto || 0)
    const acrescimo = parseFloat(ordem.acrescimos || 0)
    const total = parseFloat(ordem.total || 0) > 0 
      ? parseFloat(ordem.total) 
      : (subtotal - desconto + acrescimo)

    // Formatar valores monetários
    const formatarMoeda = (valor) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valor || 0)
    }

    // Formatar data
    const formatarData = (data) => {
      if (!data) return '--'
      const d = new Date(data)
      return d.toLocaleDateString('pt-BR')
    }

    // Formatar CPF/CNPJ
    const formatarCPFCNPJ = (valor) => {
      if (!valor) return '--'
      const clean = valor.replace(/\D/g, '')
      if (clean.length === 11) {
        return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      } else if (clean.length === 14) {
        return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      }
      return valor
    }

    // Criar workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Ordem de Serviço')

    // Configurar fonte padrão Arial/Calibri tamanho 11
    worksheet.properties.defaultRowHeight = 20

    let currentRow = 1

    // ========== 1. CABEÇALHO - DADOS DO ESTABELECIMENTO ==========
    // Nome da Empresa
    const nomeRow = worksheet.addRow([])
    nomeRow.getCell(1).value = ordem.estabelecimento_nome || '--'
    nomeRow.getCell(1).font = { name: 'Arial', size: 12, bold: true }
    currentRow++

    // CNPJ
    if (ordem.estabelecimento_cnpj) {
      const cnpjRow = worksheet.addRow([])
      cnpjRow.getCell(1).value = `CNPJ: ${formatarCPFCNPJ(ordem.estabelecimento_cnpj)}`
      cnpjRow.getCell(1).font = { name: 'Arial', size: 11 }
      currentRow++
    }

    // Endereço
    if (ordem.estabelecimento_endereco) {
      const enderecoRow = worksheet.addRow([])
      enderecoRow.getCell(1).value = `Endereço: ${ordem.estabelecimento_endereco}`
      enderecoRow.getCell(1).font = { name: 'Arial', size: 11 }
      currentRow++
    }

    // Telefone / WhatsApp
    const telefoneEstabelecimento = ordem.responsavel_whatsapp || '--'
    const telefoneRow = worksheet.addRow([])
    telefoneRow.getCell(1).value = `Telefone / WhatsApp: ${telefoneEstabelecimento}`
    telefoneRow.getCell(1).font = { name: 'Arial', size: 11 }
    currentRow++

    // Emitido em
    const emitidoRow = worksheet.addRow([])
    emitidoRow.getCell(1).value = `Emitido em: ${new Date().toLocaleDateString('pt-BR')}`
    emitidoRow.getCell(1).font = { name: 'Arial', size: 11 }
    currentRow++

    worksheet.addRow([])
    currentRow++

    // ========== 2. TÍTULO CENTRAL ==========
    const titleRow = worksheet.addRow(['ORDEM DE SERVIÇO / ORÇAMENTO DE SERVIÇOS'])
    titleRow.getCell(1).font = { name: 'Arial', size: 16, bold: true }
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
    currentRow++

    worksheet.addRow([])
    currentRow++

    // ========== 3. DADOS DO CLIENTE ==========
    const clienteTitleRow = worksheet.addRow(['DADOS DO CLIENTE'])
    clienteTitleRow.getCell(1).font = { name: 'Arial', size: 11, bold: true }
    currentRow++

    // Configurar largura das colunas
    worksheet.getColumn(1).width = 25
    worksheet.getColumn(2).width = 50

    const clienteData = [
      ['Código da Ordem:', ordem.codigo || id],
      ['Cliente:', ordem.cliente_nome || '--']
    ]

    if (ordem.cliente_whatsapp) {
      clienteData.push(['WhatsApp:', ordem.cliente_whatsapp])
    }

    if (ordem.cpf || ordem.cnpj) {
      clienteData.push(['CPF/CNPJ:', formatarCPFCNPJ(ordem.cpf || ordem.cnpj)])
    }

    if (ordem.cliente_email) {
      clienteData.push(['E-mail:', ordem.cliente_email])
    }

    if (ordem.cliente_endereco) {
      clienteData.push(['Endereço:', ordem.cliente_endereco])
    }

    clienteData.push(['Data de Abertura:', formatarData(ordem.data_abertura || ordem.criado_em)])

    if (ordem.previsao_saida) {
      clienteData.push(['Previsão de Saída:', formatarData(ordem.previsao_saida)])
    } else if (ordem.data_fechamento) {
      clienteData.push(['Data de Fechamento:', formatarData(ordem.data_fechamento)])
    }

    const responsavelNome = ordem.responsavel_nome || ordem.aberto_por_nome || '--'
    clienteData.push(['Responsável pela Ordem:', responsavelNome])

    clienteData.forEach(([label, value]) => {
      const row = worksheet.addRow([label, value])
      row.getCell(1).font = { name: 'Arial', size: 11 }
      row.getCell(2).font = { name: 'Arial', size: 11 }
      
      // Bordas cinza (#C0C0C0)
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FFC0C0C0' } },
        left: { style: 'thin', color: { argb: 'FFC0C0C0' } },
        bottom: { style: 'thin', color: { argb: 'FFC0C0C0' } },
        right: { style: 'thin', color: { argb: 'FFC0C0C0' } }
      }
      
      row.getCell(1).border = borderStyle
      row.getCell(2).border = borderStyle
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }
      currentRow++
    })

    worksheet.addRow([])
    currentRow++

    // ========== 4. DADOS DO VEÍCULO ==========
    if (ordem.veiculo_marca || ordem.veiculo_placa) {
      const veiculoTitleRow = worksheet.addRow(['DADOS DO VEÍCULO'])
      veiculoTitleRow.getCell(1).font = { name: 'Arial', size: 11, bold: true }
      currentRow++

      const veiculoData = []
      if (ordem.veiculo_marca) {
        veiculoData.push(['Marca:', ordem.veiculo_marca])
      }
      if (ordem.veiculo_modelo) {
        veiculoData.push(['Modelo:', ordem.veiculo_modelo])
      }
      if (ordem.veiculo_placa) {
        veiculoData.push(['Placa:', ordem.veiculo_placa])
      }
      if (ordem.veiculo_ano) {
        veiculoData.push(['Ano:', ordem.veiculo_ano.toString()])
      }
      if (ordem.veiculo_cor) {
        veiculoData.push(['Cor:', ordem.veiculo_cor])
      }

      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FFC0C0C0' } },
        left: { style: 'thin', color: { argb: 'FFC0C0C0' } },
        bottom: { style: 'thin', color: { argb: 'FFC0C0C0' } },
        right: { style: 'thin', color: { argb: 'FFC0C0C0' } }
      }

      veiculoData.forEach(([label, value]) => {
        const row = worksheet.addRow([label, value])
        row.getCell(1).font = { name: 'Arial', size: 11 }
        row.getCell(2).font = { name: 'Arial', size: 11 }
        row.getCell(1).border = borderStyle
        row.getCell(2).border = borderStyle
        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }
        currentRow++
      })

      worksheet.addRow([])
      currentRow++
    }

    // ========== 5. ITENS E SERVIÇOS DA ORDEM ==========
    const itensTitleRow = worksheet.addRow(['ITENS E SERVIÇOS DA ORDEM'])
    itensTitleRow.getCell(1).font = { name: 'Arial', size: 11, bold: true }
    currentRow++

    // Ajustar largura das colunas da tabela de itens
    worksheet.getColumn(1).width = 10
    worksheet.getColumn(2).width = 40
    worksheet.getColumn(3).width = 12
    worksheet.getColumn(4).width = 18
    worksheet.getColumn(5).width = 18

    // Cabeçalho da tabela
    const itemHeaderRow = worksheet.addRow(['Item', 'Descrição do Serviço / Produto', 'Quantidade', 'Valor Unitário (R$)', 'Total (R$)'])
    itemHeaderRow.font = { name: 'Arial', size: 11, bold: true }
    itemHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' }
    
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FFC0C0C0' } },
      left: { style: 'thin', color: { argb: 'FFC0C0C0' } },
      bottom: { style: 'thin', color: { argb: 'FFC0C0C0' } },
      right: { style: 'thin', color: { argb: 'FFC0C0C0' } }
    }
    
    for (let col = 1; col <= 5; col++) {
      itemHeaderRow.getCell(col).border = borderStyle
      itemHeaderRow.getCell(col).alignment = { 
        horizontal: col === 1 || col === 3 ? 'center' : col === 4 || col === 5 ? 'right' : 'left',
        vertical: 'middle'
      }
    }
    currentRow++

    // Adicionar itens
    itens.forEach((item, index) => {
      const itemRow = worksheet.addRow([
        index + 1,
        item.nome_item || '--',
        item.quantidade || 1,
        item.preco_unitario || 0,
        item.total || 0
      ])

      itemRow.getCell(4).numFmt = 'R$ #,##0.00'
      itemRow.getCell(5).numFmt = 'R$ #,##0.00'

      for (let col = 1; col <= 5; col++) {
        itemRow.getCell(col).border = borderStyle
        itemRow.getCell(col).font = { name: 'Arial', size: 11 }
        itemRow.getCell(col).alignment = { 
          horizontal: col === 1 || col === 3 ? 'center' : col === 4 || col === 5 ? 'right' : 'left',
          vertical: 'middle'
        }
      }
      currentRow++
    })

    worksheet.addRow([])
    currentRow++

    // ========== 6. RESUMO FINANCEIRO ==========
    const resumoTitleRow = worksheet.addRow(['RESUMO FINANCEIRO'])
    resumoTitleRow.getCell(1).font = { name: 'Arial', size: 11, bold: true }
    currentRow++

    worksheet.getColumn(1).width = 25
    worksheet.getColumn(2).width = 20

    const resumoData = [
      ['Subtotal:', subtotal]
    ]

    if (acrescimo > 0) {
      resumoData.push(['Acréscimos:', acrescimo])
    }

    if (desconto > 0) {
      resumoData.push(['Descontos:', desconto])
    }

    resumoData.push(['Total Geral:', total])

    resumoData.forEach(([label, value]) => {
      const row = worksheet.addRow([label, value])
      row.getCell(2).numFmt = 'R$ #,##0.00'
      row.getCell(1).font = { name: 'Arial', size: 11 }
      row.getCell(2).font = { name: 'Arial', size: 11 }
      
      if (label === 'Total Geral:') {
        row.getCell(1).font = { name: 'Arial', size: 11, bold: true }
        row.getCell(2).font = { name: 'Arial', size: 11, bold: true }
      }
      
      row.getCell(1).border = borderStyle
      row.getCell(2).border = borderStyle
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
      row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
      currentRow++
    })

    worksheet.addRow([])
    currentRow++

    // ========== 7. DESCRIÇÃO E OBSERVAÇÕES ==========
    if (ordem.descricao || ordem.observacoes) {
      const descTitleRow = worksheet.addRow(['DESCRIÇÃO E OBSERVAÇÕES'])
      descTitleRow.getCell(1).font = { name: 'Arial', size: 11, bold: true }
      currentRow++

      worksheet.getColumn(1).width = 100

      if (ordem.descricao) {
        const descRow = worksheet.addRow([`Descrição do Problema / Serviço: ${ordem.descricao}`])
        descRow.getCell(1).font = { name: 'Arial', size: 11 }
        descRow.getCell(1).border = borderStyle
        descRow.getCell(1).alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
        descRow.height = Math.max(20, (ordem.descricao.length / 80) * 20)
        currentRow++
      }

      if (ordem.observacoes) {
        const obsRow = worksheet.addRow([`Observações: ${ordem.observacoes}`])
        obsRow.getCell(1).font = { name: 'Arial', size: 11 }
        obsRow.getCell(1).border = borderStyle
        obsRow.getCell(1).alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
        obsRow.height = Math.max(20, (ordem.observacoes.length / 80) * 20)
        currentRow++
      }

      worksheet.addRow([])
      currentRow++
    }

    // ========== 8. ASSINATURAS ==========
    worksheet.addRow([])
    currentRow++

    const assinaturaRow = worksheet.addRow(['', ''])
    assinaturaRow.height = 40
    
    // Linha para assinatura do Responsável Técnico
    assinaturaRow.getCell(1).border = {
      top: { style: 'thin', color: { argb: 'FFC0C0C0' } },
      bottom: { style: 'thin', color: { argb: 'FFC0C0C0' } },
      left: { style: 'thin', color: { argb: 'FFC0C0C0' } },
      right: { style: 'thin', color: { argb: 'FFC0C0C0' } }
    }
    
    // Linha para assinatura do Cliente
    assinaturaRow.getCell(2).border = {
      top: { style: 'thin', color: { argb: 'FFC0C0C0' } },
      bottom: { style: 'thin', color: { argb: 'FFC0C0C0' } },
      left: { style: 'thin', color: { argb: 'FFC0C0C0' } },
      right: { style: 'thin', color: { argb: 'FFC0C0C0' } }
    }
    
    worksheet.getColumn(1).width = 50
    worksheet.getColumn(2).width = 50
    
    currentRow++
    
    const assinaturaLabelsRow = worksheet.addRow(['Responsável Técnico', 'Cliente / Consumidor'])
    assinaturaLabelsRow.getCell(1).font = { name: 'Arial', size: 11 }
    assinaturaLabelsRow.getCell(2).font = { name: 'Arial', size: 11 }
    assinaturaLabelsRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    assinaturaLabelsRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
    currentRow++

    // Configurar headers HTTP para download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="ordem-${ordem.codigo || id}.xlsx"`)

    // Enviar o arquivo
    await workbook.xlsx.write(res)
    res.end()

  } catch (error) {
    console.error('Erro ao gerar Excel da ordem:', error)
    res.status(500).json({ 
      error: 'Erro ao gerar Excel da ordem',
      details: error.message 
    })
  }
}
