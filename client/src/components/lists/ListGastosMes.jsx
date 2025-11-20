import React, { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useModal } from '../../contexts/ModalContext'
import FormGastoMes from '../forms/FormGastoMes'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { getCachedData, setCachedData } from '../../hooks/useCache'

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ListGastosMes = ({ mes, ano }) => {
  const { user } = useAuth()
  const { openModal } = useModal()
  const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
  const [despesas, setDespesas] = useState(() => {
    if (estabelecimentoId) {
      return getCachedData(`gastos_mes_${estabelecimentoId}_${mes}_${ano}`) || []
    }
    return []
  })
  const [loading, setLoading] = useState(true)

  const fetchDespesas = useCallback(async () => {
    try {
      const estabelecimentoIdAtual = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoIdAtual) return

      // Carregar do cache primeiro
      const cachedData = getCachedData(`gastos_mes_${estabelecimentoIdAtual}_${mes}_${ano}`)
      if (cachedData) {
        setDespesas(cachedData)
        setLoading(false)
      } else {
        setLoading(true)
      }

      const params = new URLSearchParams({
        estabelecimento_id: estabelecimentoIdAtual
      })

      if (mes) params.append('mes', mes)
      if (ano) params.append('ano', ano)

      const response = await fetch(`${API_URL}/api/auth/gastos-mes?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Erro ao buscar gastos do mês:', errorData)
        if (!cachedData) {
          setDespesas([])
        }
        return
      }

      const data = await response.json()
      const gastosData = data.gastos_mes || []
      setDespesas(gastosData)
      setCachedData(`gastos_mes_${estabelecimentoIdAtual}_${mes}_${ano}`, gastosData)
    } catch (error) {
      console.error('Erro ao buscar gastos do mês:', error)
      const estabelecimentoIdAtual = user?.estabelecimento_id || user?.estabelecimento?.id
      const cachedData = getCachedData(`gastos_mes_${estabelecimentoIdAtual}_${mes}_${ano}`)
      if (!cachedData) {
        setDespesas([])
      }
    } finally {
      setLoading(false)
    }
  }, [user, mes, ano])

  useEffect(() => {
    if (user) {
      fetchDespesas()
    }

    const handleGastoMesAtualizado = () => fetchDespesas()
    const handleGastoMesCriado = () => fetchDespesas()
    const handleGastoMesDeletado = () => fetchDespesas()

    window.addEventListener('gastoMesAtualizado', handleGastoMesAtualizado)
    window.addEventListener('gastoMesCriado', handleGastoMesCriado)
    window.addEventListener('gastoMesDeletado', handleGastoMesDeletado)

    return () => {
      window.removeEventListener('gastoMesAtualizado', handleGastoMesAtualizado)
      window.removeEventListener('gastoMesCriado', handleGastoMesCriado)
      window.removeEventListener('gastoMesDeletado', handleGastoMesDeletado)
    }
  }, [user, mes, ano, fetchDespesas])

  const handleEdit = (despesa) => {
    openModal(<FormGastoMes despesa={despesa} mes={mes} ano={ano} />)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este gasto?')) return

    try {
      const response = await fetch(`${API_URL}/api/auth/gastos-mes/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('gastoMesDeletado'))
        // Limpar cache e buscar novamente
        if (estabelecimentoId) {
          setCachedData(`gastos_mes_${estabelecimentoId}_${mes}_${ano}`, [])
        }
        fetchDespesas()
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao excluir gasto')
      }
    } catch (error) {
      console.error('Erro ao excluir gasto:', error)
      alert('Erro ao excluir gasto. Tente novamente.')
    }
  }

  const total = despesas.reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0)

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full">
        <div className="bg-gray-50 px-3 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Gastos do Mês</h3>
            <button
              type="button"
              className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
              title="Adicionar"
              onClick={() => openModal(<FormGastoMes mes={mes} ano={ano} />)}
            >
              <Plus className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
        <div className="p-4 text-gray-500">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-50 px-3 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Gastos do Mês</h3>
            <button
              type="button"
              className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
              title="Adicionar"
              onClick={() => openModal(<FormGastoMes mes={mes} ano={ano} />)}
            >
              <Plus className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        {despesas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-gray-400">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium mb-1">Nenhum gasto registrado</p>
            <p className="text-xs text-center px-3">Adicione gastos do mês para começar</p>
          </div>
        ) : (
          despesas.map((gasto) => (
            <div key={gasto.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-xs font-medium text-gray-900 truncate">{gasto.nome_gasto}</h4>
                {gasto.descricao && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{gasto.descricao}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-medium text-gray-900 whitespace-nowrap">{formatCurrency(gasto.valor)}</span>
                <button
                  onClick={() => handleEdit(gasto)}
                  className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(gasto.id)}
                  className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center justify-center transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Total */}
      <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Total:</span>
          <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}

export default ListGastosMes

