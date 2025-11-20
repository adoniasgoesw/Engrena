import React, { useState, useEffect } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { Users } from 'lucide-react'

const TopClientesFrequentes = () => {
  const { user } = useAuth()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  // Formatar valor para exibição
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Buscar Top 5 clientes que mais gastam do mês atual
  const fetchTopClientes = async () => {
    try {
      setLoading(true)
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoId) {
        setClientes([])
        setLoading(false)
        return
      }

      // Buscar dados do mês atual
      const hoje = new Date()
      const ano = hoje.getFullYear()
      const mes = hoje.getMonth() + 1

      const response = await fetch(
        `${API_URL}/api/auth/caixas/top-clientes-frequentes?estabelecimento_id=${estabelecimentoId}&ano=${ano}&mes=${mes}`
      )
      const result = await response.json()

      if (response.ok) {
        setClientes(result.clientes || [])
      } else {
        console.error('Erro ao buscar top clientes:', result.error)
        setClientes([])
      }
    } catch (error) {
      console.error('Erro ao buscar top clientes frequentes:', error)
      setClientes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchTopClientes()
    }
  }, [user])

  // Garantir que sempre temos 5 linhas (preencher com vazios se necessário)
  const clientesExibidos = [...clientes]
  while (clientesExibidos.length < 5) {
    clientesExibidos.push({ cliente_id: null, nome: null, total_gasto: 0 })
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Carregando dados...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-xl border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Top 5 Clientes</h3>
            <p className="text-sm text-gray-500 mt-1">Clientes que mais gastam</p>
          </div>
        </div>
        {/* Espaço vazio para manter alinhamento com o componente de itens */}
        <div className="w-[180px]"></div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {clientes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-medium">Nenhum cliente encontrado ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientesExibidos.map((cliente, index) => (
                  <tr
                    key={cliente.cliente_id || `empty-${index}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-sm">
                          {index + 1}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {cliente.nome || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-blue-600">
                        {cliente.total_gasto > 0 ? formatCurrency(cliente.total_gasto) : '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default TopClientesFrequentes

