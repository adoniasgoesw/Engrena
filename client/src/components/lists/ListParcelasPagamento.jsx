import React, { useState, useEffect } from 'react'
import ListBase from './ListBase'
import { MessageCircle } from 'lucide-react'
import { API_URL } from '../../services/api'
import PainelPagamentos from '../panel/PainelPagamentos'
import IncluirPagamentoButton from '../buttons/IncluirPagamentoButton'
import PDFButton from '../buttons/PDFButton'
import StatusButton from '../buttons/StatusButton'

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDate = (dateString) => {
  if (!dateString) return '--'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('pt-BR')
}

const formatDateTime = (dateString) => {
  if (!dateString) return { date: '--', time: '' }
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return { date: '--', time: '' }
  return {
    date: date.toLocaleDateString('pt-BR'),
    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
}

const ListParcelasPagamento = ({ filterStatus = null, topButton = null, caixaAberto = null, searchTerm = '' }) => {
  const [parcelas, setParcelas] = useState([])
  const [allParcelas, setAllParcelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPainelPagamento, setShowPainelPagamento] = useState(false)
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState(null)
  const [ordemData, setOrdemData] = useState(null)

  const fetchParcelas = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      // Mapear os status para o backend
      if (filterStatus === 'Pagamentos') {
        // "Pagamentos" = apenas status 'gerado'
        params.append('status', 'Pagamentos')
      } else if (filterStatus === 'Pagamentos Pendente') {
        // "Pagamentos Pendente" = apenas status 'pendente' (NÃO inclui 'gerado')
        params.append('status', 'Pagamentos Pendente')
      } else if (filterStatus === 'Pagamentos Pagos') {
        // "Pagamentos Pagos" = apenas status 'pago' (NÃO inclui 'gerado')
        params.append('status', 'Pagamentos Pagos')
      } else if (filterStatus === 'Pagamentos Vencido') {
        // "Pagamentos Vencido" = apenas status 'vencido' (NÃO inclui 'gerado')
        params.append('status', 'Pagamentos Vencido')
      } else if (filterStatus) {
        params.append('status', filterStatus)
      }
      
      // Adicionar caixa_id se o caixa estiver aberto
      if (caixaAberto && caixaAberto.id) {
        params.append('caixa_id', caixaAberto.id)
      }
      
      const url = `${API_URL}/api/auth/parcelas-pagamento${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (response.ok) {
        const parcelasData = data.parcelas || []
        setAllParcelas(parcelasData)
        setParcelas(parcelasData)
      } else {
        console.error('Erro ao buscar parcelas:', data.error)
      }
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParcelas()
  }, [filterStatus, caixaAberto])

  // Filtrar parcelas baseado no searchTerm
  useEffect(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      setParcelas(allParcelas)
      return
    }

    const term = searchTerm.toLowerCase().trim()
    const filtered = allParcelas.filter(parcela => {
      // Buscar por CPF/CNPJ do cliente (precisa buscar dados completos)
      const clienteNome = (parcela.cliente_nome || '').toLowerCase()
      const ordemCodigo = (parcela.ordem_codigo || '').toLowerCase()
      const clienteWhatsapp = (parcela.cliente_whatsapp || '').toLowerCase()
      const clienteEmail = (parcela.cliente_email || '').toLowerCase()
      const formaPagamento = (parcela.forma_pagamento || '').toLowerCase()
      
      return (
        clienteNome.includes(term) ||
        ordemCodigo.includes(term) ||
        clienteWhatsapp.includes(term) ||
        clienteEmail.includes(term) ||
        formaPagamento.includes(term)
      )
    })
    setParcelas(filtered)
  }, [searchTerm, allParcelas])

  const handleTogglePago = async (parcela) => {
    // Verificar se é um pagamento que não deve ser alterado
    // Se for "Pagamentos Pagos" (ou "Contas Pagas") e tiver valor_total (pagamento_ordem sem parcelas), não permite toggle
    const isPagamento = !!parcela.valor_total && (filterStatus === 'Contas Pagas' || filterStatus === 'Pagamentos Pagos') && !parcela.numero_parcela
    
    if (isPagamento) {
      return
    }
    
    // Verificar se tem ID válido
    if (!parcela.id) {
      console.error('Parcela sem ID válido')
      return
    }
    
    const isPago = parcela.status === 'Pago'
    const novoStatus = isPago ? 'Aguardando Pagamento' : 'Pago'
    
    // O backend automaticamente define a data_pagamento como data atual quando status for "Pago"
    // Se estiver desmarcando como pago, enviar null para limpar a data
    const dataPagamento = isPago ? null : undefined
    
    try {
      // Buscar user_id do localStorage
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : null
      const usuario_id = user?.id || null

      const response = await fetch(`${API_URL}/api/auth/parcelas-pagamento/${parcela.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: novoStatus,
          usuario_id: usuario_id,
          ...(dataPagamento !== undefined && { data_pagamento: dataPagamento })
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Recarregar a lista
        fetchParcelas()
        
        // Disparar evento para atualizar cards
        window.dispatchEvent(new CustomEvent('parcelaAtualizada'))
      } else {
        console.error('Erro ao atualizar parcela:', data.error)
        // Mostrar mensagem de erro mais amigável
        if (data.error === 'Parcela não encontrada') {
          console.warn(`Parcela com ID ${parcela.id} não foi encontrada no servidor. Recarregando lista...`)
          fetchParcelas()
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error)
    }
  }

  // Função para abrir painel de pagamento
  const handleIncluirPagamento = async (pagamento) => {
    try {
      // Buscar dados completos da ordem usando a rota de detalhes
      const ordemResponse = await fetch(`${API_URL}/api/auth/ordens/${pagamento.ordem_id}/detalhes`)
      
      if (ordemResponse.ok) {
        const ordemData = await ordemResponse.json()
        const ordem = ordemData.ordem
        const itens = ordemData.itens || []
        
        // Calcular subtotal dos itens ativos
        const subtotal = itens
          .filter(item => item.status === 'Ativo')
          .reduce((acc, item) => acc + parseFloat(item.total || 0), 0)
        
        if (ordem) {
          setOrdemData({
            ...ordem,
            subtotal: subtotal
          })
          setPagamentoSelecionado(pagamento)
          setShowPainelPagamento(true)
        }
      } else {
        console.error('Erro ao buscar detalhes da ordem:', ordemResponse.statusText)
      }
    } catch (error) {
      console.error('Erro ao buscar dados da ordem:', error)
    }
  }

  // Determinar se deve mostrar apenas Cliente e Valor Total (para "Pagamentos")
  const isPagamentos = filterStatus === 'Pagamentos' // Antiga "Boletos Pendente"
  const isPagamentosPendente = filterStatus === 'Pagamentos Pendente' // Antiga "Boletos"
  const isPagamentosPagos = filterStatus === 'Pagamentos Pagos' || filterStatus === 'Contas Pagas'
  const isPagamentosVencido = filterStatus === 'Pagamentos Vencido'


  // Função para imprimir ordem de serviço (PDF normal)
  const handleImprimirOrdem = async (pagamento) => {
    try {
      if (!pagamento.ordem_id) {
        alert('ID da ordem não encontrado')
        return
      }

      // Chamar API para gerar PDF da ordem
      const response = await fetch(`${API_URL}/api/auth/ordens/${pagamento.ordem_id}/pdf`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao gerar PDF da ordem')
      }

      // Criar blob e fazer download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ordem-${pagamento.ordem_codigo || pagamento.ordem_id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao gerar PDF da ordem:', error)
      alert(error.message || 'Erro ao gerar PDF da ordem')
    }
  }

  // Função para gerar PDF de pagamento (com QR Code)
  const handleGerarPDFPagamento = async (pagamento) => {
    try {
      if (!pagamento.ordem_id) {
        alert('ID da ordem não encontrado')
        return
      }

      // Chamar API para gerar PDF de pagamento
      const response = await fetch(`${API_URL}/api/auth/ordens/${pagamento.ordem_id}/pdf-pagamento`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao gerar PDF de pagamento')
      }

      // Criar blob e fazer download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pagamento-${pagamento.ordem_codigo || pagamento.ordem_id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao gerar PDF de pagamento:', error)
      alert(error.message || 'Erro ao gerar PDF de pagamento')
    }
  }

  // Função para gerar PDF de pagamento pago
  const handleGerarPDFPagamentoPago = async (pagamento) => {
    try {
      if (!pagamento.ordem_id) {
        alert('ID da ordem não encontrado')
        return
      }

      // Chamar API para gerar PDF de pagamento pago
      const response = await fetch(`${API_URL}/api/auth/ordens/${pagamento.ordem_id}/pdf-pagamento-pago`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao gerar PDF de pagamento pago')
      }

      // Criar blob e fazer download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pagamento-pago-${pagamento.ordem_codigo || pagamento.ordem_id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao gerar PDF de pagamento pago:', error)
      alert(error.message || 'Erro ao gerar PDF de pagamento pago')
    }
  }

  // Função para enviar PDF por WhatsApp
  const handleEnviarWhatsApp = async (pagamento, tipoPDF = 'normal') => {
    try {
      if (!pagamento.ordem_id) {
        alert('ID da ordem não encontrado')
        return
      }

      // Verificar se o cliente tem WhatsApp
      if (!pagamento.cliente_whatsapp) {
        alert('Cliente não possui WhatsApp cadastrado. Por favor, cadastre o WhatsApp do cliente antes de enviar.')
        return
      }

      // Limpar número do WhatsApp
      const whatsappLimpo = pagamento.cliente_whatsapp.replace(/\D/g, '')
      
      if (!whatsappLimpo) {
        alert('Cliente não possui WhatsApp cadastrado. Por favor, cadastre o WhatsApp do cliente antes de enviar.')
        return
      }
      
      // Gerar link do PDF (normal, pagamento ou vencido)
      let pdfUrl
      let mensagem
      
      if (tipoPDF === 'vencido') {
        // Mensagem específica para pagamentos vencidos
        pdfUrl = `${API_URL}/api/auth/ordens/${pagamento.ordem_id}/pdf-pagamento`
        mensagem = encodeURIComponent(
          `Olá, ${pagamento.cliente_nome || 'caro cliente'}!\n\n` +
          `Você tem um pagamento vencido. Por gentileza, efetue o pagamento com urgência.\n\n` +
          `Código: ${pagamento.ordem_codigo || pagamento.ordem_id}\n` +
          `Link do PDF: ${pdfUrl}\n\n` +
          `Caso você já tenha efetuado o pagamento, por favor, ignore esta mensagem.`
        )
      } else {
        pdfUrl = tipoPDF === 'pagamento' 
          ? `${API_URL}/api/auth/ordens/${pagamento.ordem_id}/pdf-pagamento`
          : `${API_URL}/api/auth/ordens/${pagamento.ordem_id}/pdf`
        
        // Mensagem pré-formatada
        const tipoDoc = tipoPDF === 'pagamento' ? 'conta para pagamento' : 'relatório da ordem de serviço'
        mensagem = encodeURIComponent(
          `Olá, ${pagamento.cliente_nome || 'querido cliente'}! Segue o ${tipoDoc}.\n\n` +
          `Código: ${pagamento.ordem_codigo || pagamento.ordem_id}\n` +
          `Link do PDF: ${pdfUrl}`
        )
      }

      // Abrir WhatsApp Web
      const whatsappUrl = `https://wa.me/${whatsappLimpo}?text=${mensagem}`
      window.open(whatsappUrl, '_blank')
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error)
      alert('Erro ao abrir WhatsApp. Verifique se o cliente possui WhatsApp cadastrado.')
    }
  }


  const columns = [
    // Coluna 1: Data (apenas para Pagamentos) - 20% width, center align
    ...(isPagamentos ? [{
      header: 'Data',
      key: 'data_emissao',
      width: '20%',
      align: 'center',
      render: (row) => {
        const dateTime = formatDateTime(row.data_emissao || row.criado_em)
        return (
          <div className="flex flex-col items-center">
            <span className="text-gray-900">{dateTime.date}</span>
            {dateTime.time && (
              <span className="text-xs text-gray-500">{dateTime.time}</span>
            )}
          </div>
        )
      }
    }] : []),
    // Coluna 1: Cliente (para outras listagens) - 20% width, center align
    ...(!isPagamentos ? [{
      header: 'Cliente',
      key: 'cliente_nome',
      width: '20%',
      align: 'center',
      render: (row) => (
        <div className="flex flex-col items-center">
          <span className="font-medium text-gray-900">{row.cliente_nome}</span>
          <span className="text-xs text-gray-500">{row.ordem_codigo}</span>
        </div>
      )
    }] : []),
    // Coluna 2: Cliente (apenas para Pagamentos) - 20% width, center align
    ...(isPagamentos ? [{
      header: 'Cliente',
      key: 'cliente_nome',
      width: '20%',
      align: 'center',
      render: (row) => (
        <div className="flex flex-col items-center">
          <span className="font-medium text-gray-900">{row.cliente_nome}</span>
          <span className="text-xs text-gray-500">{row.ordem_codigo}</span>
        </div>
      )
    }] : []),
    // Coluna 2: Parcela (para Pagamentos Pendente e Vencido) - 20% width, center align
    ...(isPagamentosPendente || isPagamentosVencido ? [{
      header: 'Parcela',
      key: 'parcela',
      width: '20%',
      align: 'center',
      render: (row) => {
        // Se tiver numero_parcela e total_parcelas, mostrar "X de Y"
        if (row.numero_parcela && row.total_parcelas) {
          return (
            <span className="text-gray-900">
              {row.numero_parcela} de {row.total_parcelas}
            </span>
          )
        }
        // Se parcelas for null, mostrar "À vista"
        if (row.total_parcelas === null || row.total_parcelas === undefined) {
          return (
            <span className="text-gray-900">
              À vista
            </span>
          )
        }
        // Se tiver total_parcelas mas não numero_parcela (pagamento único com parcelas = 1 ou mais)
        // Se parcelas = 1, mostrar "1 de 1"
        // Se parcelas > 1, mostrar "1 de X" (assumindo que é a primeira parcela)
        const totalParcelas = Number(row.total_parcelas) || 1
        return (
          <span className="text-gray-900">
            1 de {totalParcelas}
          </span>
        )
      }
    }] : []),
    // Coluna 3: Contato (apenas para Pagamentos) - 20% width, center align
    ...(isPagamentos ? [{
      header: 'Contato',
      key: 'contato',
      width: '20%',
      align: 'center',
      render: (row) => (
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-900">{row.cliente_email || '--'}</span>
          <span className="text-xs text-gray-500">{row.cliente_whatsapp || '--'}</span>
        </div>
      )
    }] : []),
    // Coluna 3: Data de Vencimento (para Pagamentos Pendente e Vencido) - 20% width, center align
    ...(isPagamentosPendente || isPagamentosVencido ? [{
      header: 'Data de Vencimento',
      key: 'data_vencimento',
      width: '20%',
      align: 'center',
      render: (row) => {
        const isVencido = row.data_vencimento && new Date(row.data_vencimento) < new Date()
        return (
          <span className={`${isVencido ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
            {formatDate(row.data_vencimento)}
          </span>
        )
      }
    }] : []),
    // Coluna 3: Pagamento (apenas para Pagamentos Pagos) - 20% width, center align
    ...(isPagamentosPagos ? [{
      header: 'Pagamento',
      key: 'forma_pagamento',
      width: '20%',
      align: 'center',
      render: (row) => (
        <span className="text-gray-900">
          {row.forma_pagamento || '--'}
        </span>
      )
    }] : []),
    // Coluna 4: Data de Pagamento (apenas para Pagamentos Pagos) - 20% width, center align
    ...(isPagamentosPagos ? [{
      header: 'Data de Pagamento',
      key: 'data_pagamento',
      width: '20%',
      align: 'center',
      render: (row) => (
        <span className="text-gray-900">
          {formatDate(row.data_pagamento) || '--'}
        </span>
      )
    }] : []),
    // Coluna 4: Valor (sempre presente) - 20% width, center align
    {
      header: 'Valor',
      key: 'valor_total',
      width: '20%',
      align: 'center',
      render: (row) => {
        const valorExibir = row.valor ? Number(row.valor) : Number(row.valor_total || 0)
        return (
          <span className="font-semibold text-gray-900">
            {formatCurrency(valorExibir)}
          </span>
        )
      }
    },
    // Coluna 5: Ações (sempre no final) - 20% width, center align
    {
      header: 'Ações',
      key: 'acoes',
      width: '20%',
      align: 'center',
      render: (row) => {
        // Pagamentos (status gerado): "Incluir Pagamento" + "Gerar PDF" + "WhatsApp"
        if (isPagamentos) {
          const isGerado = row.status?.toLowerCase() === 'gerado'
          if (isGerado) {
            return (
              <div className="flex items-center justify-center gap-2">
                <IncluirPagamentoButton
                  onClick={() => handleIncluirPagamento(row)}
                />
                <PDFButton
                  onClick={() => handleImprimirOrdem(row)}
                  variant="gray"
                  title="Gerar PDF"
                />
                <button
                  onClick={() => handleEnviarWhatsApp(row, 'normal')}
                  className="p-2 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 transition-colors h-[32px] w-[32px] flex items-center justify-center"
                  title="Enviar por WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            )
          }
        }
        
        // Pagamentos Pendente: "Status" (marcar como pago) + "Gerar PDF Pagamento" + "WhatsApp"
        if (isPagamentosPendente) {
          const isPago = row.status?.toLowerCase() === 'pago' || row.status === 'Pago'
          const isPendente = row.status?.toLowerCase() === 'pendente' || row.status === 'Pendente'
          
          return (
            <div className="flex items-center justify-center gap-2">
              <StatusButton
                isActive={isPago}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isPendente || isPago) {
                    handleTogglePago(row)
                  }
                }}
              />
              <PDFButton
                onClick={() => handleGerarPDFPagamento(row)}
                variant="yellow"
                title="Gerar PDF de Pagamento (com QR Code)"
              />
              <button
                onClick={() => handleEnviarWhatsApp(row, 'pagamento')}
                className="p-2 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 transition-colors h-[32px] w-[32px] flex items-center justify-center"
                title="Enviar por WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          )
        }
        
        // Pagamentos Pagos: "Gerar PDF Pagamento Pago" + "WhatsApp"
        if (isPagamentosPagos) {
          return (
            <div className="flex items-center justify-center gap-2">
              <PDFButton
                onClick={() => handleGerarPDFPagamentoPago(row)}
                variant="blue"
                title="Gerar PDF de Pagamento Pago"
              />
              <button
                onClick={() => handleEnviarWhatsApp(row, 'normal')}
                className="p-2 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 transition-colors h-[32px] w-[32px] flex items-center justify-center"
                title="Enviar por WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          )
        }
        
        // Pagamentos Vencido: "Status" (marcar como pago) + "Gerar PDF Pagamento" + "WhatsApp"
        if (isPagamentosVencido) {
          const isPago = row.status?.toLowerCase() === 'pago' || row.status === 'Pago'
          const isVencido = row.status?.toLowerCase() === 'vencido' || row.status === 'Vencido'
          
          return (
            <div className="flex items-center justify-center gap-2">
              <StatusButton
                isActive={isPago}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isVencido || isPago) {
                    handleTogglePago(row)
                  }
                }}
              />
              <PDFButton
                onClick={() => handleGerarPDFPagamento(row)}
                variant="yellow"
                title="Gerar PDF de Pagamento"
              />
              <button
                onClick={() => handleEnviarWhatsApp(row, 'vencido')}
                className="p-2 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 transition-colors h-[32px] w-[32px] flex items-center justify-center"
                title="Enviar por WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          )
        }
        
        return null
      }
    }
  ]

  // Função para obter mensagem apropriada baseada no status
  const getEmptyMessage = () => {
    if (!filterStatus) return "Nenhuma parcela encontrada";
    
    const statusMessages = {
      'Pagamentos': 'Nenhum pagamento encontrado',
      'Pagamentos Pendente': 'Nenhum pagamento pendente encontrado',
      'Pagamentos Pagos': 'Nenhum pagamento pago encontrado',
      'Pagamentos Vencido': 'Nenhum pagamento vencido encontrado',
      'Contas a receber': 'Nenhuma conta a receber encontrada',
      'Contas Pagas': 'Nenhuma conta paga encontrada'
    };
    
    return statusMessages[filterStatus] || "Nenhuma parcela encontrada";
  };

  return (
    <>
      <ListBase
        columns={columns}
        data={parcelas}
        loading={loading}
        hideCheckboxes={true}
        hideHeader={true}
        topButton={topButton}
        emptyMessage={getEmptyMessage()}
        headerMarginTop={true}
      />
      
      {/* Painel de Pagamentos */}
      {showPainelPagamento && ordemData && pagamentoSelecionado && (
        <PainelPagamentos
          ordemId={pagamentoSelecionado.ordem_id}
          ordemStatus={ordemData.status}
          ordemTotal={Number(ordemData.total || 0)}
          ordemSubtotal={Number(ordemData.subtotal || ordemData.total || 0)}
          ordemDesconto={Number(ordemData.desconto || 0)}
          ordemAcrescimos={Number(ordemData.acrescimos || 0)}
          valorPago={0}
          onClose={() => {
            setShowPainelPagamento(false)
            setPagamentoSelecionado(null)
            setOrdemData(null)
            // Recarregar lista após fechar
            fetchParcelas()
          }}
        />
      )}
    </>
  )
}

export default ListParcelasPagamento

