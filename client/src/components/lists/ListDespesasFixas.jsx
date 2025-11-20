import React, { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useModal } from '../../contexts/ModalContext'
import FormDespesaFixa from '../forms/FormDespesaFixa'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { getCachedData, setCachedData } from '../../hooks/useCache'

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ListDespesasFixas = ({ mes, ano }) => {
  const { user } = useAuth()
  const { openModal } = useModal()
  const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
  const [despesas, setDespesas] = useState(() => {
    if (estabelecimentoId) {
      return getCachedData(`despesas_fixas_${estabelecimentoId}_${mes}_${ano}`) || []
    }
    return []
  })
  const [loading, setLoading] = useState(true)

  const fetchDespesas = useCallback(async () => {
    try {
      const estabelecimentoIdAtual = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoIdAtual) return

      // Carregar do cache primeiro
      const cachedData = getCachedData(`despesas_fixas_${estabelecimentoIdAtual}_${mes}_${ano}`)
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

      const response = await fetch(`${API_URL}/api/auth/despesas-fixas?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Erro ao buscar despesas fixas:', errorData)
        if (!cachedData) {
          setDespesas([])
        }
        return
      }

      const data = await response.json()
      const despesasData = data.despesas_fixas || []
      setDespesas(despesasData)
      setCachedData(`despesas_fixas_${estabelecimentoIdAtual}_${mes}_${ano}`, despesasData)
    } catch (error) {
      console.error('Erro ao buscar despesas fixas:', error)
      const estabelecimentoIdAtual = user?.estabelecimento_id || user?.estabelecimento?.id
      const cachedData = getCachedData(`despesas_fixas_${estabelecimentoIdAtual}_${mes}_${ano}`)
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

    const handleDespesaFixaAtualizada = () => fetchDespesas()
    const handleDespesaFixaCriada = () => fetchDespesas()
    const handleDespesaFixaDeletada = () => fetchDespesas()

    window.addEventListener('despesaFixaAtualizada', handleDespesaFixaAtualizada)
    window.addEventListener('despesaFixaCriada', handleDespesaFixaCriada)
    window.addEventListener('despesaFixaDeletada', handleDespesaFixaDeletada)

    return () => {
      window.removeEventListener('despesaFixaAtualizada', handleDespesaFixaAtualizada)
      window.removeEventListener('despesaFixaCriada', handleDespesaFixaCriada)
      window.removeEventListener('despesaFixaDeletada', handleDespesaFixaDeletada)
    }
  }, [user, mes, ano, fetchDespesas])

  const handleEdit = (despesa) => {
    openModal(<FormDespesaFixa despesa={despesa} mes={mes} ano={ano} />)
    // A lista será atualizada automaticamente pelo evento 'despesaFixaAtualizada'
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta despesa fixa?')) return

    try {
      const response = await fetch(`${API_URL}/api/auth/despesas-fixas/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('despesaFixaDeletada'))
        // Limpar cache e buscar novamente
        if (estabelecimentoId) {
          setCachedData(`despesas_fixas_${estabelecimentoId}_${mes}_${ano}`, [])
        }
        fetchDespesas()
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao excluir despesa fixa')
      }
    } catch (error) {
      console.error('Erro ao excluir despesa fixa:', error)
      alert('Erro ao excluir despesa fixa. Tente novamente.')
    }
  }

  const total = despesas.reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0)

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full">
        <div className="bg-gray-50 px-3 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Despesas Fixas</h3>
            <button
              type="button"
              className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
              title="Adicionar"
              onClick={() => openModal(<FormDespesaFixa mes={mes} ano={ano} />)}
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
            <h3 className="text-sm font-semibold text-gray-700">Despesas Fixas</h3>
            <button
              type="button"
              className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
              title="Adicionar"
              onClick={() => openModal(<FormDespesaFixa mes={mes} ano={ano} />)}
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
            <p className="text-sm font-medium mb-1">Nenhuma despesa fixa</p>
            <p className="text-xs text-center px-3">Adicione despesas fixas para começar</p>
          </div>
        ) : (
          despesas.map((despesa) => {
            // Formatar categoria: se for funcionario ou salario, mostrar apenas "Funcionário"
            const getCategoriaLabel = (categoria) => {
              if (categoria === 'funcionario' || categoria === 'salario') {
                return 'Funcionário'
              }
              const categoriasMap = {
                'aluguel': 'Aluguel',
                'luz': 'Luz',
                'agua': 'Água',
                'internet': 'Internet',
                'telefone': 'Telefone',
                'seguranca': 'Segurança',
                'limpeza': 'Limpeza',
                'manutencao': 'Manutenção',
                'impostos': 'Impostos',
                'outros': 'Outros'
              }
              return categoriasMap[categoria] || categoria
            }

            return (
              <div key={despesa.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-medium text-gray-900">
                      {getCategoriaLabel(despesa.categoria)}
                    </h4>
                    {despesa.usuario_nome && (
                      <span className="text-xs text-gray-500">
                        - {despesa.usuario_nome}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-900 whitespace-nowrap">{formatCurrency(despesa.valor)}</span>
                  <button
                    onClick={() => handleEdit(despesa)}
                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(despesa.id)}
                    className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center justify-center transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
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

export default ListDespesasFixas

