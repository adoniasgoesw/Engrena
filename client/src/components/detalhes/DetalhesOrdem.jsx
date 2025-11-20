import React, { useState, useEffect } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { Calendar, User, Package, CreditCard, FileText } from 'lucide-react'

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

const DetalhesOrdem = ({ ordemId }) => {
  const { user } = useAuth()
  const [ordem, setOrdem] = useState(null)
  const [itens, setItens] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetalhes = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/detalhes`)
        const data = await response.json()

        if (response.ok) {
          setOrdem(data.ordem)
          setItens(data.itens || [])
          setPagamentos(data.pagamentos || [])
        } else {
          console.error('Erro ao buscar detalhes da ordem:', data.error)
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes da ordem:', error)
      } finally {
        setLoading(false)
      }
    }

    if (ordemId) {
      fetchDetalhes()
    }
  }, [ordemId])

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

  if (!ordem) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-500">Ordem não encontrada</p>
      </div>
    )
  }

  const isFechado = ordem.status === 'Finalizado' || ordem.data_fechamento

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 text-start">Detalhes da Ordem</h2>
        {ordem.codigo && (
          <p className="text-sm text-gray-500 mt-1">Código: {ordem.codigo}</p>
        )}
      </div>

      {/* Informações da Ordem */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Informações da Ordem</h3>
        
        <div className="space-y-4">
          {/* Primeira linha: Cliente e Veículo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Cliente</p>
              <p className="text-sm font-medium text-gray-900">{ordem.cliente_nome || '--'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Veículo</p>
              <p className="text-sm font-medium text-gray-900">{ordem.veiculo_descricao || ordem.veiculo_placa || '--'}</p>
            </div>
          </div>

          {/* Segunda linha: Código */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Código</p>
            <p className="text-sm font-medium text-gray-900">{ordem.codigo || '--'}</p>
          </div>

          {/* Terceira linha: Data de Abertura e Responsável */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Data de Abertura</p>
              <p className="text-sm font-medium text-gray-900">{formatDateTime(ordem.data_abertura || ordem.criado_em)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Responsável</p>
              <p className="text-sm font-medium text-gray-900">{ordem.responsavel_nome || '--'}</p>
            </div>
          </div>

          {/* Quarta linha: Aberto Por e Fechado Por lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Aberto Por</p>
              <p className="text-sm font-medium text-gray-900">{ordem.aberto_por_nome || '--'}</p>
            </div>
            {isFechado && ordem.fechado_por_nome && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Fechado Por</p>
                <p className="text-sm font-medium text-gray-900">{ordem.fechado_por_nome || '--'}</p>
              </div>
            )}
          </div>

          {/* Se fechado: Data de Fechamento */}
          {isFechado && ordem.data_fechamento && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Data de Fechamento</p>
              <p className="text-sm font-medium text-gray-900">{formatDateTime(ordem.data_fechamento)}</p>
            </div>
          )}

          {/* Descrição */}
          {ordem.descricao && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Descrição</p>
              <p className="text-sm font-medium text-gray-900">{ordem.descricao}</p>
            </div>
          )}

          {/* Observações */}
          {ordem.observacoes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Observações</p>
              <p className="text-sm font-medium text-gray-900">{ordem.observacoes}</p>
            </div>
          )}

          {/* Quinta linha: Desconto e Acréscimo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Desconto</p>
              <p className="text-sm font-medium text-gray-700">{formatCurrency(ordem.desconto || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Acréscimo</p>
              <p className="text-sm font-medium text-gray-700">{formatCurrency(ordem.acrescimos || 0)}</p>
            </div>
          </div>

          {/* Total */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-sm font-medium text-gray-900">{formatCurrency(ordem.total || 0)}</p>
          </div>
        </div>
      </div>

      {/* Itens da Ordem */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Itens da Ordem</h3>
          <p className="text-xs text-gray-500 mt-1">
            {itens.length} item(ns)
          </p>
        </div>

        {itens.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-gray-500">Nenhum item registrado</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-3">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 mb-1">{item.nome_item || '--'}</p>
                    <p className="text-xs text-gray-600">Quantidade: {item.quantidade}</p>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    <span className="text-xs font-semibold text-gray-900">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Total dos itens */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Total dos Itens</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(itens.reduce((acc, item) => acc + parseFloat(item.total || 0), 0))}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pagamentos */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pagamentos</h3>
          <p className="text-xs text-gray-500 mt-1">
            {pagamentos.length} pagamento(s)
          </p>
        </div>

        {pagamentos.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-gray-500">Nenhum pagamento registrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pagamentos.map((pagamento) => {
              const temParcelas = pagamento.parcelas && Array.isArray(pagamento.parcelas) && pagamento.parcelas.length > 0
              const numeroParcelas = temParcelas ? pagamento.parcelas.length : (pagamento.parcelas > 1 ? pagamento.parcelas : 1)
              
              return (
                <div
                  key={pagamento.id}
                  className="p-3 bg-gray-50 rounded-md border border-gray-100"
                >
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-900">{pagamento.forma_pagamento || '--'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {temParcelas || numeroParcelas > 1 
                        ? `${numeroParcelas} parcela${numeroParcelas > 1 ? 's' : ''}` 
                        : 'À vista'}
                    </p>
                  </div>
                  
                  {/* Parcelas */}
                  {temParcelas && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="space-y-2">
                        {pagamento.parcelas.map((parcela) => {
                          const valorParcela = parseFloat(parcela.valor || 0)
                          const juros = parseFloat(parcela.juros_aplicado_calculado || parcela.juros_aplicado || 0)
                          const valorTotal = valorParcela + juros
                          
                          return (
                            <div key={parcela.id} className="p-2 bg-white rounded border border-gray-200">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-900">
                                    Parcela {parcela.numero_parcela}
                                  </p>
                                  <div className="mt-1 space-y-0.5">
                                    {parcela.data_vencimento && (
                                      <p className="text-xs text-gray-600">
                                        Vencimento: {formatDate(parcela.data_vencimento)}
                                      </p>
                                    )}
                                    {parcela.data_pagamento && (
                                      <p className="text-xs text-gray-600">
                                        Pago em: {formatDate(parcela.data_pagamento)}
                                      </p>
                                    )}
                                    {juros > 0 && (
                                      <p className="text-xs text-red-600">
                                        Juros: {formatCurrency(juros)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  <p className="text-xs font-semibold text-gray-900">
                                    {formatCurrency(valorTotal)}
                                  </p>
                                  <p className={`text-xs mt-0.5 ${
                                    parcela.status === 'Pago' ? 'text-green-600' : 'text-orange-600'
                                  }`}>
                                    {parcela.status || 'Pendente'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Se não tiver parcelas (pagamento à vista) */}
                  {!temParcelas && numeroParcelas === 1 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600">Valor Total</p>
                        <p className="text-xs font-semibold text-gray-900">
                          {formatCurrency(pagamento.valor_total || 0)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-600">Status</p>
                        <p className={`text-xs ${
                          pagamento.status === 'Pago' ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {pagamento.status || 'Pendente'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default DetalhesOrdem

