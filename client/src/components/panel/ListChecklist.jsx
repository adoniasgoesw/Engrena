import React, { useEffect, useRef, useState } from 'react'
import { API_URL } from '../../services/api'
import { Trash2, Plus, CheckCircle2, Circle } from 'lucide-react'
import { useModal } from '../../contexts/ModalContext'
import FormChecklist from '../forms/FormChecklist'

const ListChecklist = ({ ordemId, ordemStatus }) => {
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading] = useState(true)
  const contentRef = useRef(null)
  const { openModal } = useModal()

  useEffect(() => {
    if (!ordemId) return
    const fetchChecklist = async () => {
      try {
        setLoading(true)
        const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/checklist`)
        if (resp.ok) {
          const data = await resp.json()
          setChecklist(data.checklist || data.items || [])
        } else {
          setChecklist([])
        }
      } catch (e) {
        console.error('Erro ao carregar checklist da ordem:', e)
        setChecklist([])
      } finally {
        setLoading(false)
      }
    }
    fetchChecklist()

    // Escutar evento de atualização
    const handleRefresh = () => fetchChecklist()
    window.addEventListener('refreshChecklist', handleRefresh)

    return () => {
      window.removeEventListener('refreshChecklist', handleRefresh)
    }
  }, [ordemId])

  const handleToggleItem = async (itemId) => {
    try {
      const item = checklist.find(c => c.id === itemId)
      if (!item) return

      // Alternar status entre 'Pendente' e 'Realizado'
      const novoStatus = item.status === 'Realizado' ? 'Pendente' : 'Realizado'

      const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/checklist/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      })

      if (resp.ok) {
        const data = await resp.json()
        setChecklist(prev => prev.map(c => c.id === itemId ? data.item : c))
      }
    } catch (e) {
      console.error('Erro ao atualizar item do checklist:', e)
    }
  }

  const handleDeleteItem = async (itemId) => {
    try {
      const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/checklist/${itemId}`, { method: 'DELETE' })
      if (resp.ok) {
        setChecklist(prev => prev.filter(c => c.id !== itemId))
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
      <div className="p-4 text-gray-500">Carregando checklist...</div>
    )
  }

  const concluidos = checklist.filter(c => c.status === 'Realizado').length
  const total = checklist.length

  return (
    <div className={`mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-[300px]`}>
      {/* Header */}
      <div className="bg-gray-50 px-3 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Checklist</h3>
            {ordemStatus !== 'Serviços Finalizados' && (
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                title="Adicionar"
                onClick={() => openModal(<FormChecklist ordemId={ordemId} />)}
              >
                <Plus className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">
              {concluidos}/{total} concluído{concluidos !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div ref={contentRef} className={`flex-1 p-3 space-y-1 overflow-y-auto`}>
        {checklist.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-gray-400">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium mb-1">Nenhum item no checklist</p>
            <p className="text-xs text-center px-3">Adicione itens ao checklist para começar</p>
          </div>
        ) : (
          checklist.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                <button
                  onClick={() => handleToggleItem(item.id)}
                  className="flex-shrink-0"
                  title={item.status === 'Realizado' ? 'Marcar como pendente' : 'Marcar como realizado'}
                >
                  {item.status === 'Realizado' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-xs font-medium truncate ${item.status === 'Realizado' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {item.descricao || item.titulo || 'Item do checklist'}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {item.prioridade && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        item.prioridade === 'Urgente' ? 'bg-red-100 text-red-700' :
                        item.prioridade === 'Alta' ? 'bg-orange-100 text-orange-700' :
                        item.prioridade === 'Média' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {item.prioridade}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center justify-center transition-colors"
                  title="Remover item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ListChecklist

