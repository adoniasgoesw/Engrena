import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/layout/Sidebar'
import { useSidebar } from '../contexts/SidebarContext'
import { useAuth } from '../contexts/AuthContext'
import { useModal } from '../contexts/ModalContext'
import DashboardCard from '../components/cards/DashboardCard'
import ListDespesasFixas from '../components/lists/ListDespesasFixas'
import ListGastosMes from '../components/lists/ListGastosMes'
import { DollarSign, TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react'
import { API_URL } from '../services/api'
import { getCachedData, setCachedData } from '../hooks/useCache'

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const Contas = () => {
  const { isCollapsed } = useSidebar()
  const { user } = useAuth()
  const { openModal } = useModal()
  const mesSelecionado = new Date().getMonth() + 1
  const anoSelecionado = new Date().getFullYear()
  
  const [receitaMensal, setReceitaMensal] = useState(() => {
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (estabelecimentoId) {
      return getCachedData(`contas_receita_${estabelecimentoId}_${mesSelecionado}_${anoSelecionado}`) || 0
    }
    return 0
  })
  const [despesasMensal, setDespesasMensal] = useState(() => {
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (estabelecimentoId) {
      return getCachedData(`contas_despesas_${estabelecimentoId}_${mesSelecionado}_${anoSelecionado}`) || 0
    }
    return 0
  })
  const [saldo, setSaldo] = useState(() => {
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (estabelecimentoId) {
      return getCachedData(`contas_saldo_${estabelecimentoId}_${mesSelecionado}_${anoSelecionado}`) || 0
    }
    return 0
  })
  const [loading, setLoading] = useState(true)

  // Buscar receita e despesas do mês
  const fetchDadosMensal = useCallback(async () => {
    try {
      setLoading(true)
      const estabelecimentoIdAtual = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoIdAtual) return

      const [receitaResp, despesasResp] = await Promise.all([
        fetch(`${API_URL}/api/auth/caixas/receita-mensal?estabelecimento_id=${estabelecimentoIdAtual}&mes=${mesSelecionado}&ano=${anoSelecionado}`),
        fetch(`${API_URL}/api/auth/despesas/despesas-mensal?estabelecimento_id=${estabelecimentoIdAtual}&mes=${mesSelecionado}&ano=${anoSelecionado}`)
      ])

      const receitaData = await receitaResp.json()
      const despesasData = await despesasResp.json()

      if (receitaResp.ok) {
        // Usar receita_mensal (mesmo campo do dashboard)
        const receita = receitaData.receita_mensal || 0
        setReceitaMensal(receita)
        if (estabelecimentoIdAtual) {
          setCachedData(`contas_receita_${estabelecimentoIdAtual}_${mesSelecionado}_${anoSelecionado}`, receita)
        }
      }

      if (despesasResp.ok) {
        const despesas = despesasData.total_despesas || 0
        setDespesasMensal(despesas)
        if (estabelecimentoIdAtual) {
          setCachedData(`contas_despesas_${estabelecimentoIdAtual}_${mesSelecionado}_${anoSelecionado}`, despesas)
        }
      }

      // Calcular saldo
      const receita = receitaData.receita_mensal || 0
      const despesas = despesasData.total_despesas || 0
      const saldoCalculado = receita - despesas
      setSaldo(saldoCalculado)
      if (estabelecimentoIdAtual) {
        setCachedData(`contas_saldo_${estabelecimentoIdAtual}_${mesSelecionado}_${anoSelecionado}`, saldoCalculado)
      }
    } catch (error) {
      console.error('Erro ao buscar dados mensal:', error)
    } finally {
      setLoading(false)
    }
  }, [user, mesSelecionado, anoSelecionado])

  // Carregar dados iniciais
  useEffect(() => {
    if (user) {
      fetchDadosMensal()
    }
  }, [user, mesSelecionado, anoSelecionado, fetchDadosMensal])

  // Escutar eventos de atualização de despesas
  useEffect(() => {
    const handleDespesaAtualizada = () => {
      fetchDadosMensal()
    }

    // Eventos de despesas gerais
    window.addEventListener('despesaAtualizada', handleDespesaAtualizada)
    window.addEventListener('despesaCriada', handleDespesaAtualizada)
    window.addEventListener('despesaDeletada', handleDespesaAtualizada)

    // Eventos de despesas fixas
    window.addEventListener('despesaFixaAtualizada', handleDespesaAtualizada)
    window.addEventListener('despesaFixaCriada', handleDespesaAtualizada)
    window.addEventListener('despesaFixaDeletada', handleDespesaAtualizada)

    // Eventos de gastos do mês
    window.addEventListener('gastoMesAtualizado', handleDespesaAtualizada)
    window.addEventListener('gastoMesCriado', handleDespesaAtualizada)
    window.addEventListener('gastoMesDeletado', handleDespesaAtualizada)

    return () => {
      window.removeEventListener('despesaAtualizada', handleDespesaAtualizada)
      window.removeEventListener('despesaCriada', handleDespesaAtualizada)
      window.removeEventListener('despesaDeletada', handleDespesaAtualizada)
      window.removeEventListener('despesaFixaAtualizada', handleDespesaAtualizada)
      window.removeEventListener('despesaFixaCriada', handleDespesaAtualizada)
      window.removeEventListener('despesaFixaDeletada', handleDespesaAtualizada)
      window.removeEventListener('gastoMesAtualizado', handleDespesaAtualizada)
      window.removeEventListener('gastoMesCriado', handleDespesaAtualizada)
      window.removeEventListener('gastoMesDeletado', handleDespesaAtualizada)
    }
  }, [fetchDadosMensal])

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Contas</h1>
                <p className="text-sm text-gray-600 mt-1">Gestão de receitas e despesas</p>
              </div>
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {meses[mesAtual - 1]} {anoAtual}
                </span>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-shrink-0 mb-6">
              <DashboardCard
                title="Receita do Mês"
                value={formatCurrency(receitaMensal)}
                icon={TrendingUp}
                iconColor="text-green-600"
                bgColor="bg-green-50"
                loading={loading}
              />
              <DashboardCard
                title="Despesas do Mês"
                value={formatCurrency(despesasMensal)}
                icon={TrendingDown}
                iconColor="text-red-600"
                bgColor="bg-red-50"
                loading={loading}
              />
              <DashboardCard
                title="Saldo"
                value={formatCurrency(saldo)}
                icon={Wallet}
                iconColor={saldo >= 0 ? "text-blue-600" : "text-orange-600"}
                bgColor={saldo >= 0 ? "bg-blue-50" : "bg-orange-50"}
                loading={loading}
              />
            </div>

            {/* Listas de Despesas - Lado a Lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
              <div className="flex flex-col min-h-0">
                <ListDespesasFixas mes={mesSelecionado} ano={anoSelecionado} />
              </div>
              <div className="flex flex-col min-h-0">
                <ListGastosMes mes={mesSelecionado} ano={anoSelecionado} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Contas

