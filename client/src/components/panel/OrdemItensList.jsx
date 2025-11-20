import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { API_URL } from '../../services/api'
import { Trash2, Plus } from 'lucide-react'
import ItensPanel from './ItensPanel'

const currency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const OrdemItensList = ({ ordemId, ordemStatus }) => {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [isItensPanelOpen, setIsItensPanelOpen] = useState(false)
  const contentRef = useRef(null)

  const fetchItens = useCallback(async (showLoading = true) => {
    if (!ordemId) return
    try {
      if (showLoading) setLoading(true)
      const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/itens`)
      const data = await resp.json()
      if (!resp.ok) return
      setItens(data.itens || [])
    } catch (e) {
      console.error('Erro ao carregar itens da ordem:', e)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [ordemId])

  useEffect(() => {
    fetchItens()

    // Escutar evento de item adicionado
    const handleItemAdicionado = () => {
      fetchItens(false) // Não mostrar loading ao atualizar
    }

    window.addEventListener('itemAdicionado', handleItemAdicionado)
    window.addEventListener('itemRemovido', handleItemAdicionado)

    return () => {
      window.removeEventListener('itemAdicionado', handleItemAdicionado)
      window.removeEventListener('itemRemovido', handleItemAdicionado)
    }
  }, [ordemId, fetchItens])

  // Agrupar itens duplicados por item_id e somar quantidades
  const itensAgrupados = useMemo(() => {
    const agrupados = new Map()
    
    itens.forEach(it => {
      const itemId = it.item_id
      
      // Se item_id não existe, usar id único como chave (não agrupa)
      const chaveAgrupamento = itemId != null ? itemId : it.id
      
      if (agrupados.has(chaveAgrupamento)) {
        // Item já existe - somar quantidade e total
        const existente = agrupados.get(chaveAgrupamento)
        existente.quantidade = (Number(existente.quantidade) || 0) + (Number(it.quantidade) || 0)
        existente.total = (Number(existente.total) || 0) + (Number(it.total) || (Number(it.preco_unitario) * Number(it.quantidade)) || 0)
      } else {
        // Novo item - adicionar ao mapa
        agrupados.set(chaveAgrupamento, {
          ...it,
          quantidade: Number(it.quantidade) || 0,
          total: Number(it.total) || (Number(it.preco_unitario) * Number(it.quantidade)) || 0
        })
      }
    })
    
    return Array.from(agrupados.values())
  }, [itens])

  const subtotal = itensAgrupados.reduce((acc, it) => acc + (Number(it.total) || (Number(it.preco_unitario) * Number(it.quantidade)) || 0), 0)

  // Escutar evento para solicitar subtotal (separado para evitar dependências circulares)
  useEffect(() => {
    const handleRequestSubtotal = (e) => {
      if (e.detail && String(e.detail.ordemId) === String(ordemId)) {
        // Disparar evento com subtotal atual
        window.dispatchEvent(new CustomEvent('subtotalItensAtualizado', {
          detail: { ordemId, subtotal }
        }))
      }
    }

    window.addEventListener('requestSubtotal', handleRequestSubtotal)

    return () => {
      window.removeEventListener('requestSubtotal', handleRequestSubtotal)
    }
  }, [ordemId, subtotal])

  // Disparar evento sempre que itens mudarem ou componente montar
  useEffect(() => {
    if (ordemId && !loading) {
      window.dispatchEvent(new CustomEvent('subtotalItensAtualizado', {
        detail: { ordemId, subtotal }
      }))
    }
  }, [subtotal, ordemId, loading])

  // Altura fixa, sem expandir

  const formatCurrency = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const handleDeleteItem = async (itemId) => {
    try {
      const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/itens/${itemId}`, { method: 'DELETE' })
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}))
        
        if (data.deleted) {
          // Item foi completamente removido
          setItens(prev => prev.filter(i => i.id !== itemId))
        } else {
          // Item foi atualizado (quantidade reduzida) - recarregar lista
          fetchItens(false)
        }
        
        window.dispatchEvent(new CustomEvent('itemRemovido'))
      } else {
        const data = await resp.json().catch(() => ({}))
        console.error('Erro ao remover item:', data?.error)
      }
    } catch (e) {
      console.error('Erro ao remover item:', e)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-gray-500">Carregando itens...</div>
    )
  }

  return (
    <div className={`mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-[300px]`}>
      {/* Header */}
      <div className="bg-gray-50 px-3 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Produtos e Serviços</h3>
            {ordemStatus !== 'Serviços Finalizados' && (
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                title="Adicionar"
                onClick={() => setIsItensPanelOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">{itensAgrupados.length} item{itensAgrupados.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div ref={contentRef} className={`flex-1 p-3 space-y-1 overflow-y-auto` }>
        {itensAgrupados.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-gray-400">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium mb-1">Nenhum item adicionado</p>
            <p className="text-xs text-center px-3">Adicione itens do painel ao lado para começar</p>
          </div>
        ) : (
          <>
            {itensAgrupados.map((it) => {
              // Buscar todos os IDs originais deste item para poder deletar
              // Se tiver item_id, buscar todos com mesmo item_id, senão buscar apenas esse item
              const chaveAgrupamento = it.item_id != null ? it.item_id : it.id
              const idsOriginais = itens
                .filter(i => {
                  const chaveItem = i.item_id != null ? i.item_id : i.id
                  return chaveItem === chaveAgrupamento
                })
                .map(i => i.id)
              
              // Pegar o primeiro ID para deletar (o backend vai reduzir quantidade ou deletar)
              const primeiroId = idsOriginais[0]
              
              return (
                <div key={`${chaveAgrupamento}-${it.id}`} className="flex items-center justify-between py-0.5 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="text-xs font-medium text-gray-900 truncate">{it.nome_item}</h4>
                    <p className="text-xs text-gray-500">Qtd: {it.quantidade}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-900">{formatCurrency(it.total || (Number(it.preco_unitario) * Number(it.quantidade)))}</div>
                    </div>
                    {ordemStatus !== 'Serviços Finalizados' && ordemStatus !== 'Finalizado' && (
                      <button
                        onClick={() => {
                          // Deletar um registro por vez (o backend vai reduzir quantidade ou deletar)
                          if (primeiroId) {
                            handleDeleteItem(primeiroId)
                          }
                        }}
                        className="p-2 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Subtotal no bottom */}
      {itensAgrupados.length > 0 && (
        <div className="bg-gray-50 px-3 py-3 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Subtotal</span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
        </div>
      )}

      {/* Painel de Itens */}
      <ItensPanel 
        isOpen={isItensPanelOpen} 
        onClose={() => setIsItensPanelOpen(false)}
        ordemId={ordemId}
      />
    </div>
  )
}

export default OrdemItensList


