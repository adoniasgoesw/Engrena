import React, { useState, useEffect } from 'react'
import { DollarSign, CreditCard, Zap, Check, ChevronDown, ChevronLeft, ChevronRight, Calendar, ArrowLeft } from 'lucide-react'
import ListValores from './ListValores'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

// Função auxiliar para obter data atual no timezone local (não UTC)
const getDataLocal = () => {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

const PainelPagamentos = ({ ordemId, ordemStatus, ordemTotal = 0, ordemSubtotal = 0, ordemDesconto = 0, ordemAcrescimos = 0, valorPago = 0, onClose }) => {
  const { user } = useAuth()
  const [formaSelecionada, setFormaSelecionada] = useState(null)
  const [parcela, setParcela] = useState('vista')
  const [desconto, setDesconto] = useState('')
  const [acrescimos, setAcrescimos] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [caixaAberto, setCaixaAberto] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [dropdownParcelaAberto, setDropdownParcelaAberto] = useState(false)
  const [calendarioAberto, setCalendarioAberto] = useState(false)
  const [mesAtual, setMesAtual] = useState(new Date())
  const [dropdownMesAberto, setDropdownMesAberto] = useState(false)
  const [dropdownAnoAberto, setDropdownAnoAberto] = useState(false)

  // Buscar caixa aberto ao montar o componente
  useEffect(() => {
    const fetchCaixaAberto = async () => {
      try {
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        if (!estabelecimentoId) return

        const response = await fetch(`${API_URL}/api/auth/caixas/aberto?estabelecimento_id=${estabelecimentoId}`)
        const data = await response.json()
        
        if (response.ok && data.caixa) {
          setCaixaAberto(data.caixa)
        } else {
          setCaixaAberto(null)
        }
      } catch (error) {
        console.error('Erro ao buscar caixa aberto:', error)
        setCaixaAberto(null)
      }
    }

    fetchCaixaAberto()
  }, [user])

  const formasPagamento = [
    { 
      id: 'Dinheiro', 
      nome: 'Dinheiro', 
      icon: DollarSign,
      color: 'green'
    },
    { 
      id: 'Debito', 
      nome: 'Débito', 
      icon: CreditCard,
      color: 'blue'
    },
    { 
      id: 'Pix', 
      nome: 'Pix', 
      icon: Zap,
      color: 'yellow'
    },
    { 
      id: 'Credito', 
      nome: 'Crédito', 
      icon: CreditCard,
      color: 'purple'
    },
  ]

  const getColorClasses = (color, isSelected) => {
    const colorMap = {
      green: {
        bg: isSelected ? 'bg-green-100' : 'bg-gray-100',
        icon: isSelected ? 'text-green-700' : 'text-gray-900',
        border: isSelected ? 'border-green-500' : 'border-gray-200',
        cardBg: isSelected ? 'bg-green-50' : 'bg-white',
        checkbox: isSelected ? 'bg-green-700 border-green-700' : 'bg-white border-gray-300',
        text: isSelected ? 'text-green-700' : 'text-gray-900'
      },
      blue: {
        bg: isSelected ? 'bg-blue-100' : 'bg-gray-100',
        icon: isSelected ? 'text-blue-700' : 'text-gray-900',
        border: isSelected ? 'border-blue-500' : 'border-gray-200',
        cardBg: isSelected ? 'bg-blue-50' : 'bg-white',
        checkbox: isSelected ? 'bg-blue-700 border-blue-700' : 'bg-white border-gray-300',
        text: isSelected ? 'text-blue-700' : 'text-gray-900'
      },
      yellow: {
        bg: isSelected ? 'bg-yellow-100' : 'bg-gray-100',
        icon: isSelected ? 'text-yellow-700' : 'text-gray-900',
        border: isSelected ? 'border-yellow-500' : 'border-gray-200',
        cardBg: isSelected ? 'bg-yellow-50' : 'bg-white',
        checkbox: isSelected ? 'bg-yellow-700 border-yellow-700' : 'bg-white border-gray-300',
        text: isSelected ? 'text-yellow-700' : 'text-gray-900'
      },
      purple: {
        bg: isSelected ? 'bg-purple-100' : 'bg-gray-100',
        icon: isSelected ? 'text-purple-700' : 'text-gray-900',
        border: isSelected ? 'border-purple-500' : 'border-gray-200',
        cardBg: isSelected ? 'bg-purple-50' : 'bg-white',
        checkbox: isSelected ? 'bg-purple-700 border-purple-700' : 'bg-white border-gray-300',
        text: isSelected ? 'text-purple-700' : 'text-gray-900'
      },
      orange: {
        bg: isSelected ? 'bg-orange-100' : 'bg-gray-100',
        icon: isSelected ? 'text-orange-700' : 'text-gray-900',
        border: isSelected ? 'border-orange-500' : 'border-gray-200',
        cardBg: isSelected ? 'bg-orange-50' : 'bg-white',
        checkbox: isSelected ? 'bg-orange-700 border-orange-700' : 'bg-white border-gray-300',
        text: isSelected ? 'text-orange-700' : 'text-gray-900'
      }
    }
    return colorMap[color] || colorMap.blue
  }

  const handleSelecionarForma = (forma) => {
    setFormaSelecionada(forma)
  }

  const formatarDataDisplay = (data) => {
    if (!data) return ''
    // Se data já está no formato YYYY-MM-DD, usar diretamente
    if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      const [ano, mes, dia] = data.split('-')
      return `${dia}/${mes}/${ano}`
    }
    // Caso contrário, tentar parsear como Date
    const d = new Date(data)
    if (isNaN(d.getTime())) return ''
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const ano = d.getFullYear()
    return `${dia}/${mes}/${ano}`
  }

  const obterDiasDoMes = (ano, mes) => {
    const primeiroDia = new Date(ano, mes, 1)
    const ultimoDia = new Date(ano, mes + 1, 0)
    const diasNoMes = ultimoDia.getDate()
    const diaSemanaInicio = primeiroDia.getDay()
    
    const dias = []
    
    // Dias do mês anterior
    const mesAnterior = new Date(ano, mes, 0)
    const diasMesAnterior = mesAnterior.getDate()
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      dias.push({ dia: diasMesAnterior - i, mesAtual: false, mesValor: mes - 1 })
    }
    
    // Dias do mês atual
    for (let i = 1; i <= diasNoMes; i++) {
      dias.push({ dia: i, mesAtual: true, mesValor: mes })
    }
    
    // Dias do próximo mês para completar a grade
    const diasRestantes = 42 - dias.length
    for (let i = 1; i <= diasRestantes; i++) {
      dias.push({ dia: i, mesAtual: false, mesValor: mes + 1 })
    }
    
    return dias
  }

  const selecionarDia = (dia) => {
    const ano = mesAtual.getFullYear()
    const mes = mesAtual.getMonth()
    const diaFormatado = String(dia).padStart(2, '0')
    const mesFormatado = String(mes + 1).padStart(2, '0')
    const anoFormatado = String(ano)
    const dataFormatada = `${anoFormatado}-${mesFormatado}-${diaFormatado}`
    setDataVencimento(dataFormatada)
    setCalendarioAberto(false)
  }

  const proximoMes = () => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1))
  }

  const mesAnterior = () => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1))
  }

  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const handlePagar = async () => {
    if (!formaSelecionada) {
      alert('Selecione uma forma de pagamento')
      return
    }

    if (!ordemSubtotal || parseFloat(ordemSubtotal) <= 0) {
      alert('Subtotal inválido. Adicione itens à ordem primeiro.')
      return
    }

    // Validar data de vencimento se não for à vista
    if (parcela !== 'vista' && !dataVencimento) {
      alert('Para pagamento parcelado, é obrigatório informar a data de vencimento')
      return
    }

    try {
      setProcessing(true)
      
      const payload = {
        forma_pagamento: formaSelecionada.id,
        parcelas: parcela === 'vista' ? 'vista' : parseInt(parcela),
        desconto: parseFloat(desconto) || 0,
        acrescimo: parseFloat(acrescimos) || 0,
        data_vencimento: dataVencimento || null,
        valor_subtotal: parseFloat(ordemSubtotal) || 0
      }

      // Adicionar caixa_id se houver caixa aberto
      if (caixaAberto) {
        payload.caixa_id = caixaAberto.id
      }

      const response = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/pagamentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar pagamento')
      }

      // Resetar campos após pagamento
      setFormaSelecionada(null)
      setDesconto('')
      setAcrescimos('')
      setDataVencimento('')
      
      // Disparar evento para atualizar dados
      window.dispatchEvent(new CustomEvent('pagamentoAdicionado', { detail: data.pagamento }))
      
      // Fechar o painel
      onClose()
      
      alert('Pagamento registrado com sucesso!')
    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      alert(error.message || 'Erro ao processar pagamento. Tente novamente.')
    } finally {
      setProcessing(false)
    }
  }

  // Organizar formas de pagamento em colunas
  // Coluna 1: Dinheiro, Pix
  // Coluna 2: Débito, Crédito
  const formasColuna1 = formasPagamento.filter(f => ['Dinheiro', 'Pix'].includes(f.id))
  const formasColuna2 = formasPagamento.filter(f => ['Debito', 'Credito'].includes(f.id))

  return (
    <>
      {/* Overlay escuro */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Painel lateral */}
      <div className="fixed top-0 right-0 w-[30%] h-screen bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Voltar"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="flex-1 text-center text-xl font-bold text-gray-900">Forma de Pagamento</h2>
          <div className="w-9"></div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Formas de pagamento em 2 colunas */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {/* Coluna 1: Dinheiro, Pix */}
            <div className="space-y-2">
              {formasColuna1.map((forma) => {
                const Icon = forma.icon
                const isSelected = formaSelecionada?.id === forma.id
                const colors = getColorClasses(forma.color, isSelected)
                
                return (
                  <button
                    key={forma.id}
                    onClick={() => handleSelecionarForma(forma)}
                    className={`w-full flex items-center justify-between gap-2 py-2 px-3 rounded-lg border transition-all duration-200 ${
                      isSelected 
                        ? `${colors.border} ${colors.cardBg} shadow-md` 
                        : 'border-gray-200 bg-white hover:shadow-md hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`p-1.5 rounded-full ${colors.bg}`}>
                        <Icon className={`w-4 h-4 ${colors.icon}`} />
                      </div>
                      <span className={`text-xs font-semibold ${colors.text}`}>
                        {forma.nome}
                      </span>
                    </div>
                    <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${colors.checkbox}`}>
                      {isSelected && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Coluna 2: Débito, Crédito */}
            <div className="space-y-2">
              {formasColuna2.map((forma) => {
                const Icon = forma.icon
                const isSelected = formaSelecionada?.id === forma.id
                const colors = getColorClasses(forma.color, isSelected)
                
                return (
                  <button
                    key={forma.id}
                    onClick={() => handleSelecionarForma(forma)}
                    className={`w-full flex items-center justify-between gap-2 py-2 px-3 rounded-lg border transition-all duration-200 ${
                      isSelected 
                        ? `${colors.border} ${colors.cardBg} shadow-md` 
                        : 'border-gray-200 bg-white hover:shadow-md hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`p-1.5 rounded-full ${colors.bg}`}>
                        <Icon className={`w-4 h-4 ${colors.icon}`} />
                      </div>
                      <span className={`text-xs font-semibold ${colors.text}`}>
                        {forma.nome}
                      </span>
                    </div>
                    <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${colors.checkbox}`}>
                      {isSelected && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

          </div>

          {/* Campos sempre visíveis */}
          <div className="space-y-4">
            {/* Desconto e Acréscimo */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desconto
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  placeholder="0,00"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Acréscimo
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={acrescimos}
                  onChange={(e) => setAcrescimos(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Parcelas */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parcelas
              </label>
              <button
                type="button"
                onClick={() => setDropdownParcelaAberto(!dropdownParcelaAberto)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900 flex items-center justify-between"
              >
                <span>{parcela === 'vista' ? 'À vista' : `${parcela}x`}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${dropdownParcelaAberto ? 'rotate-180' : ''}`} />
              </button>
              
              {dropdownParcelaAberto && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setDropdownParcelaAberto(false)}
                  />
                  <div className="absolute z-20 w-full mt-2 bg-white rounded-xl shadow-lg border-0 overflow-hidden max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setParcela('vista')
                        setDropdownParcelaAberto(false)
                        setDataVencimento(getDataLocal())
                      }}
                      className={`w-full px-4 py-3 text-sm font-medium text-left hover:bg-blue-50 transition-colors ${
                        parcela === 'vista' ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      À vista
                    </button>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setParcela(num.toString())
                          setDropdownParcelaAberto(false)
                        }}
                        className={`w-full px-4 py-3 text-sm font-medium text-left hover:bg-blue-50 transition-colors ${
                          parcela === num.toString() ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        {num}x
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Data Vencimento */}
            <div className="relative">
              <label className={`block text-sm font-medium mb-2 ${parcela === 'vista' ? 'text-gray-400' : 'text-gray-700'}`}>
                Data de Vencimento
              </label>
              <button
                type="button"
                onClick={() => {
                  if (parcela === 'vista') return
                  if (dataVencimento) {
                    if (typeof dataVencimento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataVencimento)) {
                      const [ano, mes, dia] = dataVencimento.split('-').map(Number)
                      setMesAtual(new Date(ano, mes - 1, dia))
                    } else {
                      setMesAtual(new Date(dataVencimento))
                    }
                  }
                  setCalendarioAberto(!calendarioAberto)
                }}
                disabled={parcela === 'vista'}
                className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900 flex items-center justify-between ${
                  parcela === 'vista' ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                }`}
              >
                <span>{dataVencimento ? formatarDataDisplay(dataVencimento) : 'Selecione a data'}</span>
                <Calendar className="w-4 h-4 text-gray-500" />
              </button>
              
              {calendarioAberto && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setCalendarioAberto(false)}
                  />
                  <div className="absolute z-20 w-full mt-2 bg-white rounded-xl shadow-lg border-0 overflow-hidden">
                    {/* Header do calendário */}
                    <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200">
                      <button
                        type="button"
                        onClick={mesAnterior}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <div className="flex items-center gap-2">
                        {/* Dropdown Mês */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setDropdownAnoAberto(false)
                              setDropdownMesAberto(!dropdownMesAberto)
                            }}
                            className="px-1.5 py-0.5 text-xs font-semibold text-gray-900 bg-transparent border-0 rounded-lg focus:outline-none cursor-pointer flex items-center gap-1 min-w-[90px] justify-between"
                          >
                            <span>{nomesMeses[mesAtual.getMonth()]}</span>
                            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${dropdownMesAberto ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {dropdownMesAberto && (
                            <>
                              <div 
                                className="fixed inset-0 z-30" 
                                onClick={() => setDropdownMesAberto(false)}
                              />
                              <div className="absolute z-40 w-full mt-1 bg-white rounded-xl shadow-lg border-0 overflow-hidden max-h-48 overflow-y-auto">
                                {nomesMeses.map((mes, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setMesAtual(new Date(mesAtual.getFullYear(), idx, 1))
                                      setDropdownMesAberto(false)
                                    }}
                                    className={`w-full px-3 py-2 text-xs font-medium text-left hover:bg-blue-50 transition-colors ${
                                      mesAtual.getMonth() === idx ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                                    }`}
                                  >
                                    {mes}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Dropdown Ano */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setDropdownMesAberto(false)
                              setDropdownAnoAberto(!dropdownAnoAberto)
                            }}
                            className="px-1.5 py-0.5 text-xs font-semibold text-gray-900 bg-transparent border-0 rounded-lg focus:outline-none cursor-pointer flex items-center gap-1 min-w-[70px] justify-between"
                          >
                            <span>{mesAtual.getFullYear()}</span>
                            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${dropdownAnoAberto ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {dropdownAnoAberto && (
                            <>
                              <div 
                                className="fixed inset-0 z-30" 
                                onClick={() => setDropdownAnoAberto(false)}
                              />
                              <div className="absolute z-40 w-full mt-1 bg-white rounded-xl shadow-lg border-0 overflow-hidden max-h-48 overflow-y-auto">
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((ano) => (
                                  <button
                                    key={ano}
                                    type="button"
                                    onClick={() => {
                                      setMesAtual(new Date(ano, mesAtual.getMonth(), 1))
                                      setDropdownAnoAberto(false)
                                    }}
                                    className={`w-full px-3 py-2 text-xs font-medium text-left hover:bg-blue-50 transition-colors ${
                                      mesAtual.getFullYear() === ano ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                                    }`}
                                  >
                                    {ano}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={proximoMes}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    
                    {/* Dias da semana */}
                    <div className="grid grid-cols-7 gap-0.5 p-1 bg-white">
                      {nomesDias.map((dia) => (
                        <div key={dia} className="text-[10px] font-semibold text-gray-500 text-center py-1">
                          {dia}
                        </div>
                      ))}
                    </div>
                    
                    {/* Dias do calendário */}
                    <div className="grid grid-cols-7 gap-0.5 p-1 bg-white">
                      {obterDiasDoMes(mesAtual.getFullYear(), mesAtual.getMonth()).map((item, idx) => {
                        const hoje = new Date()
                        const diaAtual = item.dia
                        const anoAtual = mesAtual.getFullYear()
                        const mesValor = item.mesValor < 0 ? 11 : item.mesValor > 11 ? 0 : item.mesValor
                        const anoAjustado = item.mesValor < 0 ? anoAtual - 1 : item.mesValor > 11 ? anoAtual + 1 : anoAtual
                        const dataItemFormatada = `${anoAjustado}-${String(mesValor + 1).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`
                        const isSelecionado = dataVencimento && dataItemFormatada === dataVencimento
                        const isHoje = anoAjustado === hoje.getFullYear() && mesValor === hoje.getMonth() && diaAtual === hoje.getDate()
                        
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => item.mesAtual && selecionarDia(diaAtual)}
                            disabled={!item.mesAtual}
                            className={`aspect-square text-xs rounded-lg transition-all duration-200 ${
                              !item.mesAtual 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : isSelecionado
                                ? 'bg-blue-600 text-white font-semibold shadow-md'
                                : isHoje
                                ? 'bg-blue-100 text-blue-700 font-semibold'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {diaAtual}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* ListValores no bottom */}
        <ListValores
          ordemTotal={ordemTotal}
          subtotal={ordemSubtotal}
          desconto={desconto ? parseFloat(desconto) : ordemDesconto}
          acrescimos={acrescimos ? parseFloat(acrescimos) : ordemAcrescimos}
          juros={0}
          valorPago={valorPago}
          onPagar={handlePagar}
          formaSelecionada={formaSelecionada}
          disabled={processing}
        />
      </div>

    </>
  )
}

export default PainelPagamentos
