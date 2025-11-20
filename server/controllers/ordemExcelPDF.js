import pool from '../config/db.js'
import ExcelJS from 'exceljs'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Função auxiliar para gerar o Excel (reutilizada)
async function gerarExcelWorkbook(ordem, itens, formatarMoeda, formatarData, formatarCPFCNPJ) {
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
    ['Código da Ordem:', ordem.codigo || ordem.id],
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

  const borderStyle = {
    top: { style: 'thin', color: { argb: 'FFC0C0C0' } },
    left: { style: 'thin', color: { argb: 'FFC0C0C0' } },
    bottom: { style: 'thin', color: { argb: 'FFC0C0C0' } },
    right: { style: 'thin', color: { argb: 'FFC0C0C0' } }
  }

  clienteData.forEach(([label, value]) => {
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

  const desconto = parseFloat(ordem.desconto || 0)
  const acrescimo = parseFloat(ordem.acrescimos || 0)
  const total = parseFloat(ordem.total || 0) > 0 
    ? parseFloat(ordem.total) 
    : (itens.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) - desconto + acrescimo)

  const subtotal = itens.reduce((sum, item) => sum + parseFloat(item.total || 0), 0)

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
  assinaturaRow.getCell(1).border = borderStyle
  
  // Linha para assinatura do Cliente
  assinaturaRow.getCell(2).border = borderStyle
  
  worksheet.getColumn(1).width = 50
  worksheet.getColumn(2).width = 50
  
  currentRow++
  
  const assinaturaLabelsRow = worksheet.addRow(['Responsável Técnico', 'Cliente / Consumidor'])
  assinaturaLabelsRow.getCell(1).font = { name: 'Arial', size: 11 }
  assinaturaLabelsRow.getCell(2).font = { name: 'Arial', size: 11 }
  assinaturaLabelsRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
  assinaturaLabelsRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }

  return workbook
}

// Gerar PDF a partir do Excel usando LibreOffice
export const gerarPDFDoExcel = async (req, res) => {
  let tempExcelPath = null
  let tempPdfPath = null

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

    // Formatar valores
    const formatarMoeda = (valor) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valor || 0)
    }

    const formatarData = (data) => {
      if (!data) return '--'
      const d = new Date(data)
      return d.toLocaleDateString('pt-BR')
    }

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

    // Gerar workbook Excel
    const workbook = await gerarExcelWorkbook(ordem, itens, formatarMoeda, formatarData, formatarCPFCNPJ)

    // Criar diretório temporário
    const tempDir = os.tmpdir()
    const timestamp = Date.now()
    tempExcelPath = path.join(tempDir, `ordem-${ordem.codigo || id}-${timestamp}.xlsx`)
    tempPdfPath = path.join(tempDir, `ordem-${ordem.codigo || id}-${timestamp}.pdf`)

    // Salvar Excel temporariamente
    await workbook.xlsx.writeFile(tempExcelPath)

    // Detectar sistema operacional e comando do LibreOffice
    const isWindows = process.platform === 'win32'
    
    // Tentar encontrar o LibreOffice no Windows (caminhos comuns)
    let libreOfficeCmd = 'soffice'
    if (isWindows) {
      const possiblePaths = [
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
        'soffice.exe'
      ]
      
      // Verificar qual caminho existe (simplificado - tenta o primeiro disponível)
      libreOfficeCmd = possiblePaths[0] // Usar o caminho padrão primeiro
    }

    // Converter Excel para PDF usando LibreOffice
    const outputDir = path.dirname(tempExcelPath)
    const command = isWindows
      ? `"${libreOfficeCmd}" --headless --convert-to pdf --outdir "${outputDir}" "${tempExcelPath}"`
      : `${libreOfficeCmd} --headless --convert-to pdf --outdir "${outputDir}" "${tempExcelPath}"`

    try {
      await execAsync(command, { timeout: 30000 }) // 30 segundos de timeout
      
      // Verificar se o PDF foi criado
      try {
        await fs.access(tempPdfPath)
      } catch {
        // Se não encontrou com o nome esperado, procurar por arquivos PDF no diretório
        const files = await fs.readdir(outputDir)
        const pdfFile = files.find(f => f.startsWith(`ordem-${ordem.codigo || id}-${timestamp}`) && f.endsWith('.pdf'))
        if (pdfFile) {
          tempPdfPath = path.join(outputDir, pdfFile)
        } else {
          throw new Error('PDF não foi gerado pelo LibreOffice')
        }
      }

      // Ler o PDF e enviar
      const pdfBuffer = await fs.readFile(tempPdfPath)

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="ordem-${ordem.codigo || id}.pdf"`)
      res.send(pdfBuffer)

    } catch (libreOfficeError) {
      console.error('Erro ao converter com LibreOffice:', libreOfficeError)
      return res.status(500).json({ 
        error: 'LibreOffice não está instalado ou não está disponível. Por favor, instale o LibreOffice para usar esta funcionalidade.',
        details: libreOfficeError.message 
      })
    } finally {
      // Limpar arquivos temporários
      try {
        if (tempExcelPath) await fs.unlink(tempExcelPath).catch(() => {})
        if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {})
      } catch (cleanupError) {
        console.error('Erro ao limpar arquivos temporários:', cleanupError)
      }
    }

  } catch (error) {
    console.error('Erro ao gerar PDF do Excel:', error)
    
    // Limpar arquivos temporários em caso de erro
    try {
      if (tempExcelPath) await fs.unlink(tempExcelPath).catch(() => {})
      if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {})
    } catch (cleanupError) {
      console.error('Erro ao limpar arquivos temporários:', cleanupError)
    }

    res.status(500).json({ 
      error: 'Erro ao gerar PDF do Excel',
      details: error.message 
    })
  }
}

