import React, { useState, useEffect } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { DollarSign, Calendar, User, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react'

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDateTime = (dateString) => {
  if (!dateString) return '--'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const DetalhesFinanceiro = ({ caixaId }) => {
  const { user } = useAuth()
  const [caixa, setCaixa] = useState(null)
  const [movimentacoes, setMovimentacoes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetalhes = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/auth/caixas/${caixaId}/detalhes`)
        const data = await response.json()

        if (response.ok) {
          setCaixa(data.caixa)
          setMovimentacoes(data.movimentacoes || [])
        } else {
          console.error('Erro ao buscar detalhes do caixa:', data.error)
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes do caixa:', error)
      } finally {
        setLoading(false)
      }
    }

    if (caixaId) {
      fetchDetalhes()
    }
  }, [caixaId])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Carregando detalhes...</p>
        </div>
      </div>
    )
  }

  if (!caixa) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-500">Caixa não encontrado</p>
      </div>
    )
  }

  const isFechado = !caixa.status

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 text-start">Detalhes do Caixa</h2>
      </div>

      {/* Informações do Caixa */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Informações do Caixa</h3>
        
        <div className="space-y-4">
          {/* Primeira linha: Valor e Data de Abertura */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Valor de Abertura</p>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(caixa.valor_abertura)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Data de Abertura</p>
              <p className="text-sm font-medium text-gray-900">{formatDateTime(caixa.data_abertura || caixa.criado_em)}</p>
            </div>
          </div>

          {/* Segunda linha: Aberto Por e Fechado Por lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Aberto Por</p>
              <p className="text-sm font-medium text-gray-900">{caixa.aberto_por_nome || '--'}</p>
            </div>
            {isFechado && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Fechado Por</p>
                <p className="text-sm font-medium text-gray-900">{caixa.fechado_por_nome || '--'}</p>
              </div>
            )}
          </div>

          {/* Se fechado: Valor e Data de Fechamento */}
          {isFechado && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Valor de Fechamento</p>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(caixa.valor_fechamento || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Data de Fechamento</p>
                <p className="text-sm font-medium text-gray-900">{formatDateTime(caixa.data_fechamento)}</p>
              </div>
            </div>
          )}

          {/* Terceira linha: Entradas e Saídas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Entradas</p>
              <p className="text-sm font-medium text-gray-700">{formatCurrency(caixa.entradas || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Saídas</p>
              <p className="text-sm font-medium text-gray-700">{formatCurrency(caixa.saidas || 0)}</p>
            </div>
          </div>

          {/* Quarta linha: Receita Total e Saldo Total */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Receita Total</p>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(caixa.receita_total || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Saldo Total</p>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(caixa.saldo_total || 0)}</p>
            </div>
          </div>

          {/* Diferença (se fechado) */}
          {isFechado && caixa.diferenca !== null && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Diferença</p>
              <p className={`text-sm font-medium ${parseFloat(caixa.diferenca || 0) >= 0 ? 'text-gray-700' : 'text-gray-700'}`}>
                {formatCurrency(caixa.diferenca || 0)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Movimentações */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Movimentações</h3>
          <p className="text-xs text-gray-500 mt-1">
            {movimentacoes.length} movimentação(ões)
          </p>
        </div>

        {movimentacoes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-gray-500">Nenhuma movimentação registrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {movimentacoes.map((mov) => {
              const isEntrada = mov.tipo === 'entrada'
              const Icon = isEntrada ? ArrowUpCircle : ArrowDownCircle
              return (
                <div
                  key={mov.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isEntrada ? 'text-gray-600' : 'text-gray-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-medium capitalize ${isEntrada ? 'text-gray-700' : 'text-gray-700'}`}>
                          {isEntrada ? 'Entrada' : 'Saída'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{mov.descricao || '--'}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    <span className={`text-xs font-semibold ${isEntrada ? 'text-gray-700' : 'text-gray-700'}`}>
                      {isEntrada ? '+' : '-'}{formatCurrency(mov.valor)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default DetalhesFinanceiro
