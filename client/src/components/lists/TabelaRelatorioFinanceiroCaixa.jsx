import React from 'react'
import { Info } from 'lucide-react'
import { useModal } from '../../contexts/ModalContext'
import DetalhesFinanceiro from '../detalhes/DetalhesFinanceiro'

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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const TabelaRelatorioFinanceiroCaixa = ({ dados }) => {
  const { openModal } = useModal()

  if (dados.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Nenhum resultado encontrado</p>
      </div>
    )
  }

  const handleDetalhes = (caixaId) => {
    openModal(<DetalhesFinanceiro caixaId={caixaId} />, { hideButtons: true })
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Data Abertura
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Data Fechamento
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Aberto Por
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Fechado Por
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Valor Abertura
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Entradas
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Saídas
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Receita Total
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Saldo Total
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Diferença
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {dados.map((caixa) => {
            return (
              <tr key={caixa.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {formatDate(caixa.data_abertura)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {formatDate(caixa.data_fechamento)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {caixa.aberto_por_nome || '--'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {caixa.fechado_por_nome || '--'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatCurrency(caixa.valor_abertura || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-green-600">
                  {formatCurrency(caixa.entradas || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-red-600">
                  {formatCurrency(caixa.saidas || 0)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-green-700">
                  {formatCurrency(caixa.receita_total || 0)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  {formatCurrency(caixa.saldo_total || 0)}
                </td>
                <td className={`px-4 py-3 text-sm font-semibold ${
                  (caixa.diferenca || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(caixa.diferenca || 0)}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <button
                    onClick={() => handleDetalhes(caixa.id)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors duration-200"
                    title="Ver detalhes"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default TabelaRelatorioFinanceiroCaixa








