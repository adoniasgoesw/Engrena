import React, { useState, useEffect, useMemo } from 'react'
import Sidebar from '../components/layout/Sidebar'
import SearchBar from '../components/layout/SearchBar'
import { useSidebar } from '../contexts/SidebarContext'
import { useAuth } from '../contexts/AuthContext'
import { useModal } from '../contexts/ModalContext'
import ListParcelasPagamento from '../components/lists/ListParcelasPagamento'
import ListMovimentacoes from '../components/lists/ListMovimentacoes'
import ListCaixa from '../components/lists/ListCaixa'
import DashboardCard from '../components/cards/DashboardCard'
import AddButton from '../components/buttons/AddButton'
import FormCaixa from '../components/forms/FormCaixa'
import FormEntradaSaida from '../components/forms/FormEntradaSaida'
import { DollarSign, TrendingUp, Receipt, ArrowDownCircle, ArrowUpCircle, Wallet, Plus, Maximize2, Minimize2 } from 'lucide-react'
import { API_URL } from '../services/api'
import { getCachedData, setCachedData } from '../hooks/useCache'

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const Financeiro = () => {
  const { isCollapsed } = useSidebar()
  const { user } = useAuth()
  const { openModal } = useModal()
  const [activeTab, setActiveTab] = useState('Pagamentos')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
  const [todasParcelas, setTodasParcelas] = useState(() => {
    if (estabelecimentoId) {
      return getCachedData(`financeiro_parcelas_${estabelecimentoId}`) || []
    }
    return []
  })
  const [receitaTotalCaixa, setReceitaTotalCaixa] = useState(() => {
    if (estabelecimentoId) {
      return getCachedData(`financeiro_receita_total_${estabelecimentoId}`) || 0
    }
    return 0
  })
  const [caixaAberto, setCaixaAberto] = useState(() => {
    if (estabelecimentoId) {
      return getCachedData(`financeiro_caixa_aberto_${estabelecimentoId}`) || null
    }
    return null
  })
  const [caixaStatusVerificado, setCaixaStatusVerificado] = useState(false)

  // Buscar status do caixa aberto e receita total
  const fetchCaixaAberto = async () => {
    try {
      if (!estabelecimentoId) {
        setCaixaStatusVerificado(true)
        return
      }

      // Carregar do cache primeiro
      const cachedCaixa = getCachedData(`financeiro_caixa_aberto_${estabelecimentoId}`)
      if (cachedCaixa) {
        setCaixaAberto(cachedCaixa)
        setReceitaTotalCaixa(cachedCaixa.receita_total || 0)
      }

      const response = await fetch(`${API_URL}/api/auth/caixas/aberto?estabelecimento_id=${estabelecimentoId}`)
      const data = await response.json()
      
      if (response.ok && data.caixa) {
        setCaixaAberto(data.caixa)
        setReceitaTotalCaixa(data.caixa.receita_total || 0)
        setCachedData(`financeiro_caixa_aberto_${estabelecimentoId}`, data.caixa)
        setCachedData(`financeiro_receita_total_${estabelecimentoId}`, data.caixa.receita_total || 0)
      } else {
        // Se não tiver caixa aberto
        setCaixaAberto(null)
        setReceitaTotalCaixa(0)
        setCachedData(`financeiro_caixa_aberto_${estabelecimentoId}`, null)
        setCachedData(`financeiro_receita_total_${estabelecimentoId}`, 0)
      }
      setCaixaStatusVerificado(true)
    } catch (error) {
      console.error('Erro ao buscar caixa aberto:', error)
      const cachedCaixa = getCachedData(`financeiro_caixa_aberto_${estabelecimentoId}`)
      if (!cachedCaixa) {
        setCaixaAberto(null)
        setReceitaTotalCaixa(0)
      }
      setCaixaStatusVerificado(true)
    }
  }

  // Buscar todas as parcelas e pagamentos para calcular os cards
  const fetchTodasParcelas = async () => {
    try {
      // Só buscar se houver caixa aberto
      if (!caixaAberto || !caixaAberto.id) {
        setTodasParcelas([])
        if (estabelecimentoId) {
          setCachedData(`financeiro_parcelas_${estabelecimentoId}`, [])
        }
        return
      }
      
      // Carregar do cache primeiro
      const cachedParcelas = getCachedData(`financeiro_parcelas_${estabelecimentoId}`)
      if (cachedParcelas && cachedParcelas.length > 0) {
        setTodasParcelas(cachedParcelas)
      }
      
      // Buscar todos os status necessários para os cálculos
      const [responsePagamentos, responsePendentes, responsePagos] = await Promise.all([
        fetch(`${API_URL}/api/auth/parcelas-pagamento?status=Pagamentos&caixa_id=${caixaAberto.id}`),
        fetch(`${API_URL}/api/auth/parcelas-pagamento?status=Pagamentos Pendente&caixa_id=${caixaAberto.id}`),
        fetch(`${API_URL}/api/auth/parcelas-pagamento?status=Pagamentos Pagos&caixa_id=${caixaAberto.id}`)
      ])
      
      const dataPagamentos = await responsePagamentos.json()
      const dataPendentes = await responsePendentes.json()
      const dataPagos = await responsePagos.json()
      
      if (responsePagamentos.ok && responsePendentes.ok && responsePagos.ok) {
        // Combinar todos os pagamentos
        const todas = [
          ...(dataPagamentos.parcelas || []),
          ...(dataPendentes.parcelas || []),
          ...(dataPagos.parcelas || [])
        ]
        setTodasParcelas(todas)
        if (estabelecimentoId) {
          setCachedData(`financeiro_parcelas_${estabelecimentoId}`, todas)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados para cards:', error)
      const cachedParcelas = getCachedData(`financeiro_parcelas_${estabelecimentoId}`)
      if (!cachedParcelas) {
        setTodasParcelas([])
      }
    }
  }

  // Função para abrir modal de caixa (abrir ou fechar)
  const handleAbrirModalCaixa = () => {
    openModal(<FormCaixa caixaAberto={caixaAberto} />)
  }

  useEffect(() => {
    if (user) {
      fetchCaixaAberto()
    }
    
    // Atualizar a cada 5 segundos
    const interval = setInterval(() => {
      if (user) {
        fetchCaixaAberto()
      }
    }, 5000)
    
    // Escutar eventos de atualização de parcelas e caixa
    const handleParcelaAtualizada = () => {
      fetchTodasParcelas()
      fetchCaixaAberto()
    }
    
    const handleCaixaAberto = () => {
      fetchCaixaAberto()
      setCaixaStatusVerificado(true)
    }

    const handleCaixaFechado = () => {
      fetchCaixaAberto()
      setCaixaStatusVerificado(true)
    }

    const handleCaixaAtualizado = () => {
      fetchCaixaAberto()
      setCaixaStatusVerificado(true)
    }
    
    // Buscar parcelas quando o caixa for atualizado
    const handleCaixaAtualizadoParaParcelas = () => {
      fetchTodasParcelas()
    }
    
    window.addEventListener('parcelaAtualizada', handleParcelaAtualizada)
    window.addEventListener('caixaAberto', handleCaixaAberto)
    window.addEventListener('caixaFechado', handleCaixaFechado)
    window.addEventListener('caixaAtualizado', handleCaixaAtualizado)
    window.addEventListener('caixaAtualizado', handleCaixaAtualizadoParaParcelas)
    window.addEventListener('modalSaveSuccess', handleCaixaAberto)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('parcelaAtualizada', handleParcelaAtualizada)
      window.removeEventListener('caixaAberto', handleCaixaAberto)
      window.removeEventListener('caixaFechado', handleCaixaFechado)
      window.removeEventListener('caixaAtualizado', handleCaixaAtualizado)
      window.removeEventListener('caixaAtualizado', handleCaixaAtualizadoParaParcelas)
      window.removeEventListener('modalSaveSuccess', handleCaixaAberto)
    }
  }, [user, estabelecimentoId])
  
  // Buscar parcelas quando o caixa aberto mudar
  useEffect(() => {
    if (caixaAberto && caixaAberto.id) {
      fetchTodasParcelas()
    } else {
      setTodasParcelas([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caixaAberto])

  // Total a receber: soma de todos os valores de "Pagamentos" (gerado) + "Pagamentos Pendente" (pendente)
  const totalAReceber = useMemo(() => {
    return todasParcelas
      .filter(p => {
        const status = (p.status || '').toLowerCase()
        return status === 'gerado' || status === 'pendente'
      })
      .reduce((acc, p) => {
        // Usar valor se disponível (parcela individual), senão usar valor_total
        const valor = p.valor ? Number(p.valor || 0) : Number(p.valor_total || 0)
        return acc + valor
      }, 0)
  }, [todasParcelas])

  // Parcelas Pendentes: contagem de todas as parcelas de "Pagamentos Pendente" + pagamentos à vista pendentes
  const parcelasPendentes = useMemo(() => {
    return todasParcelas.filter(p => {
      const status = (p.status || '').toLowerCase()
      // Incluir: pendente, gerado (pagamento à vista pendente)
      return status === 'pendente' || status === 'gerado'
    }).length
  }, [todasParcelas])

  // Receita Total: soma de todos os valores de "Pagamentos Pagos" (pago)
  const receitaTotalCalculada = useMemo(() => {
    if (!caixaAberto || !caixaAberto.id) return 0
    
    return todasParcelas
      .filter(p => {
        const status = (p.status || '').toLowerCase()
        return status === 'pago'
      })
      .reduce((acc, p) => {
        // Usar valor se disponível (parcela individual), senão usar valor_total
        const valor = p.valor ? Number(p.valor || 0) : Number(p.valor_total || 0)
        return acc + valor
      }, 0)
  }, [todasParcelas, caixaAberto])

  // Determinar se o caixa está aberto ou fechado
  const caixaEstaAberto = caixaAberto !== null

  // Não renderizar conteúdo até verificar o status do caixa
  if (!caixaStatusVerificado) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
          <div className="p-6 flex-shrink-0">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
  }

  const handleSearchClose = () => {
    setSearchTerm('')
    setIsSearchVisible(false)
  }

  const handleSearchToggle = () => {
    setIsSearchVisible(!isSearchVisible)
  }

  const handleFullScreenToggle = () => {
    setIsFullScreen(!isFullScreen)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        {!isFullScreen && (
          <div className="p-6 flex-shrink-0">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
                {caixaEstaAberto ? (
                  <button
                    onClick={handleAbrirModalCaixa}
                    className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-500 hover:to-red-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    Fechar caixa
                  </button>
                ) : (
                  <AddButton modalContent={<FormCaixa caixaAberto={null} />}>
                    Abrir caixa
                  </AddButton>
                )}
              </div>
              
              {/* Stats Cards - Exibir apenas quando caixa está aberto */}
              {caixaEstaAberto && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <DashboardCard 
                    title="Abertura" 
                    value={formatCurrency(caixaAberto?.valor_abertura || 0)} 
                    icon={Wallet} 
                  />
                  <DashboardCard 
                    title="Entradas" 
                    value={formatCurrency(caixaAberto?.entradas || 0)} 
                    icon={ArrowUpCircle}
                    actionButton={
                      caixaAberto ? (
                        <button
                          type="button"
                          className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                          title="Adicionar entrada"
                          onClick={() => openModal(<FormEntradaSaida tipo="entrada" caixaAberto={caixaAberto} />)}
                        >
                          <Plus className="w-3.5 h-3.5 text-white" />
                        </button>
                      ) : null
                    }
                  />
                  <DashboardCard 
                    title="Saídas" 
                    value={formatCurrency(caixaAberto?.saidas || 0)} 
                    icon={ArrowDownCircle}
                    actionButton={
                      caixaAberto ? (
                        <button
                          type="button"
                          className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                          title="Adicionar saída"
                          onClick={() => openModal(<FormEntradaSaida tipo="saida" caixaAberto={caixaAberto} />)}
                        >
                          <Plus className="w-3.5 h-3.5 text-white" />
                        </button>
                      ) : null
                    }
                  />
                  <DashboardCard 
                    title="Receita Total" 
                    value={formatCurrency(receitaTotalCalculada)} 
                    icon={DollarSign} 
                  />
                  <DashboardCard 
                    title="Total a receber" 
                    value={formatCurrency(totalAReceber)} 
                    icon={TrendingUp} 
                  />
                  <DashboardCard 
                    title="Parcelas Pendentes" 
                    value={parcelasPendentes.toString()} 
                    icon={Receipt} 
                  />
                </div>
              )}
            </div>
          </div>
        )}
        <div className={`flex-1 min-h-0 ${isFullScreen ? 'px-6 pb-6' : 'px-6 pb-6'}`}>
          {/* Quando caixa está fechado: exibir apenas ListCaixa */}
          {!caixaEstaAberto ? (
            <ListCaixa />
          ) : (
            /* Quando caixa está aberto: exibir listas de pagamentos e movimentações */
            <>
              {activeTab === 'Movimentações' ? (
                <ListMovimentacoes
                  topButton={(
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveTab('Pagamentos')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                            activeTab === 'Pagamentos'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Pagamentos
                        </button>
                        <button
                          onClick={() => setActiveTab('Pagamentos Pendente')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                            activeTab === 'Pagamentos Pendente'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Pagamentos Pendente
                        </button>
                        <button
                          onClick={() => setActiveTab('Pagamentos Pagos')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                            activeTab === 'Pagamentos Pagos'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Pagamentos Pagos
                        </button>
                        <button
                          onClick={() => setActiveTab('Pagamentos Vencido')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                            activeTab === 'Pagamentos Vencido'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Pagamentos Vencido
                        </button>
                        <button
                          onClick={() => setActiveTab('Movimentações')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                            activeTab === 'Movimentações'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Movimentações
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <SearchBar
                          isVisible={isSearchVisible}
                          onClose={handleSearchClose}
                          onSearch={handleSearch}
                          onToggle={handleSearchToggle}
                          placeholder="Pesquisar por CPF, contato, veículo, código..."
                        />
                        <button
                          onClick={handleFullScreenToggle}
                          className="p-2 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                          title={isFullScreen ? "Reduzir" : "Tela cheia"}
                        >
                          {isFullScreen ? (
                            <Minimize2 className="w-4 h-4" />
                          ) : (
                            <Maximize2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                />
              ) : (
                <ListParcelasPagamento
                  topButton={(
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveTab('Pagamentos')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                            activeTab === 'Pagamentos'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Pagamentos
                        </button>
                        <button
                          onClick={() => setActiveTab('Pagamentos Pendente')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                            activeTab === 'Pagamentos Pendente'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Pagamentos Pendente
                        </button>
                        <button
                          onClick={() => setActiveTab('Pagamentos Pagos')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                            activeTab === 'Pagamentos Pagos'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Pagamentos Pagos
                        </button>
                        <button
                          onClick={() => setActiveTab('Pagamentos Vencido')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                            activeTab === 'Pagamentos Vencido'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Pagamentos Vencido
                        </button>
                        <button
                          onClick={() => setActiveTab('Movimentações')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                            activeTab === 'Movimentações'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Movimentações
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <SearchBar
                          isVisible={isSearchVisible}
                          onClose={handleSearchClose}
                          onSearch={handleSearch}
                          onToggle={handleSearchToggle}
                          placeholder="Pesquisar por CPF, contato, veículo, código..."
                        />
                        <button
                          onClick={handleFullScreenToggle}
                          className="p-2 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                          title={isFullScreen ? "Reduzir" : "Tela cheia"}
                        >
                          {isFullScreen ? (
                            <Minimize2 className="w-4 h-4" />
                          ) : (
                            <Maximize2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  filterStatus={activeTab}
                  caixaAberto={caixaAberto}
                  searchTerm={searchTerm}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default Financeiro





