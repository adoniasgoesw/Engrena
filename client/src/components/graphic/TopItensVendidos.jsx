import React, { useState, useEffect } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { Package, Wrench, TrendingUp } from 'lucide-react'

const TopItensVendidos = () => {
  const { user } = useAuth()
  const [abaAtiva, setAbaAtiva] = useState('produtos')
  const [produtos, setProdutos] = useState([])
  const [servicos, setServicos] = useState([])
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

  // Buscar Top 5 produtos e serviços do mês atual
  const fetchTopItens = async () => {
    try {
      setLoading(true)
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoId) {
        setProdutos([])
        setServicos([])
        setLoading(false)
        return
      }

      // Buscar dados do mês atual
      const hoje = new Date()
      const ano = hoje.getFullYear()
      const mes = hoje.getMonth() + 1

      const response = await fetch(
        `${API_URL}/api/auth/caixas/top-itens-vendidos?estabelecimento_id=${estabelecimentoId}&ano=${ano}&mes=${mes}`
      )
      const result = await response.json()

      if (response.ok) {
        setProdutos(result.produtos || [])
        setServicos(result.servicos || [])
      } else {
        console.error('Erro ao buscar top itens:', result.error)
        setProdutos([])
        setServicos([])
      }
    } catch (error) {
      console.error('Erro ao buscar top itens vendidos:', error)
      setProdutos([])
      setServicos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchTopItens()
    }
  }, [user])

  // Garantir que sempre temos 5 linhas (preencher com vazios se necessário)
  const dadosOriginais = abaAtiva === 'produtos' ? produtos : servicos
  const dadosExibidos = [...dadosOriginais]
  while (dadosExibidos.length < 5) {
    dadosExibidos.push({ item_id: null, nome: null, quantidade: 0, valor_total: 0 })
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
      {/* Header com Abas */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Top 5 Vendas</h3>
            <p className="text-sm text-gray-500 mt-1">Produtos e serviços mais vendidos</p>
          </div>
        </div>
        
        {/* Abas no canto direito */}
        <div className="flex gap-2 bg-gray-50 rounded-lg p-1">
          <button
            onClick={() => setAbaAtiva('produtos')}
            className={`px-4 py-2 font-semibold text-sm transition-all rounded-md ${
              abaAtiva === 'produtos'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Produtos</span>
            </div>
          </button>
          <button
            onClick={() => setAbaAtiva('servicos')}
            className={`px-4 py-2 font-semibold text-sm transition-all rounded-md ${
              abaAtiva === 'servicos'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span>Serviços</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
              {dadosExibidos.map((item, index) => (
                <tr
                  key={item.item_id || `empty-${index}`}
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
                      {item.nome || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-blue-600">
                      {item.valor_total > 0 ? formatCurrency(item.valor_total) : '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default TopItensVendidos

