import React from 'react'
import { Info, Printer } from 'lucide-react'

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDate = (dateString) => {
  if (!dateString) return '--'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const TabelaRelatorioFinanceiroOrdens = ({ dados, onDetalhes, onImprimir }) => {
  if (dados.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Nenhum resultado encontrado</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Data
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Cliente
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Veículo
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Subtotal
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Desconto
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Acréscimo
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Total
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {dados.map((ordem) => {
            return (
              <tr key={ordem.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {formatDate(ordem.criado_em)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {ordem.cliente_nome || '--'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {ordem.veiculo_descricao || ordem.veiculo_placa || '--'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatCurrency(ordem.subtotal || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-red-600">
                  - {formatCurrency(ordem.desconto || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-green-600">
                  + {formatCurrency(ordem.acrescimos || 0)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  {formatCurrency(ordem.total || 0)}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDetalhes(ordem.id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors duration-200"
                      title="Ver detalhes"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onImprimir(ordem.id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors duration-200"
                      title="Imprimir"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default TabelaRelatorioFinanceiroOrdens








