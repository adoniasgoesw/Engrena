import React, { useState, useEffect } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useModal } from '../../contexts/ModalContext'
import FormDespesa from '../forms/FormDespesa'
import { Edit, Trash2, Calendar, DollarSign, User } from 'lucide-react'

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDate = (dateString) => {
  if (!dateString) return '--'
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR')
}

const getStatusColor = (status) => {
  const colors = {
    'Pago': 'bg-green-100 text-green-800',
    'Pendente': 'bg-yellow-100 text-yellow-800',
    'Vencido': 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const ListDespesas = ({ mes, ano }) => {
  const { user } = useAuth()
  const { openModal } = useModal()
  const [despesas, setDespesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const fetchDespesas = async () => {
    try {
      setLoading(true)
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoId) return

      const params = new URLSearchParams({
        estabelecimento_id: estabelecimentoId,
        mes: mes || new Date().getMonth() + 1,
        ano: ano || new Date().getFullYear()
      })

      if (filtroTipo) params.append('tipo', filtroTipo)
      if (filtroStatus) params.append('status', filtroStatus)

      const response = await fetch(`${API_URL}/api/auth/despesas?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setDespesas(data.despesas || [])
      }
    } catch (error) {
      console.error('Erro ao buscar despesas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchDespesas()
    }

    const handleDespesaAtualizada = () => fetchDespesas()
    const handleDespesaCriada = () => fetchDespesas()
    const handleDespesaDeletada = () => fetchDespesas()

    window.addEventListener('despesaAtualizada', handleDespesaAtualizada)
    window.addEventListener('despesaCriada', handleDespesaCriada)
    window.addEventListener('despesaDeletada', handleDespesaDeletada)

    return () => {
      window.removeEventListener('despesaAtualizada', handleDespesaAtualizada)
      window.removeEventListener('despesaCriada', handleDespesaCriada)
      window.removeEventListener('despesaDeletada', handleDespesaDeletada)
    }
  }, [user, mes, ano, filtroTipo, filtroStatus])

  const handleEdit = (despesa) => {
    openModal(<FormDespesa despesa={despesa} mes={mes} ano={ano} />)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta despesa?')) return

    try {
      const response = await fetch(`${API_URL}/api/auth/despesas/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('despesaDeletada'))
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao excluir despesa')
      }
    } catch (error) {
      console.error('Erro ao excluir despesa:', error)
      alert('Erro ao excluir despesa. Tente novamente.')
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Carregando...</div>
  }

  if (despesas.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma despesa encontrada para este período.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm bg-white"
        >
          <option value="">Todos os tipos</option>
          <option value="fixa">Fixa</option>
          <option value="fisica">Física</option>
          <option value="alimentar">Alimentar</option>
          <option value="outros">Outros</option>
        </select>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm bg-white"
        >
          <option value="">Todos os status</option>
          <option value="Pago">Pago</option>
          <option value="Pendente">Pendente</option>
          <option value="Vencido">Vencido</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {despesas.map((despesa) => (
              <tr key={despesa.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{despesa.descricao}</div>
                  {despesa.funcionario_nome && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      {despesa.funcionario_nome}
                    </div>
                  )}
                  {despesa.recorrente && (
                    <div className="text-xs text-blue-600 mt-1">Recorrente</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {despesa.tipo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {despesa.categoria}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(despesa.valor)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(despesa.data_vencimento)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(despesa.status)}`}>
                    {despesa.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(despesa)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(despesa.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ListDespesas







