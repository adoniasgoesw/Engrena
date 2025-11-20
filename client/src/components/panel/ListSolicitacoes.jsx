import React, { useEffect, useRef, useState, useCallback } from 'react'
import { API_URL } from '../../services/api'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { useModal } from '../../contexts/ModalContext'
import { useAuth } from '../../contexts/AuthContext'
import FormSolicitacao from '../forms/FormSolicitacao'
import RejectButton from '../buttons/RejectButton'

const ListSolicitacoes = ({ ordemId, ordemStatus }) => {
  const [solicitacoes, setSolicitacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const contentRef = useRef(null)
  const { openModal } = useModal()
  const { user } = useAuth()

  const fetchSolicitacoes = useCallback(async () => {
    if (!ordemId) return
    try {
      setLoading(true)
      const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/solicitacoes`)
      if (resp.ok) {
        const data = await resp.json()
        setSolicitacoes(data.solicitacoes || data || [])
      } else {
        setSolicitacoes([])
      }
    } catch (e) {
      console.error('Erro ao carregar solicitações da ordem:', e)
      setSolicitacoes([])
    } finally {
      setLoading(false)
    }
  }, [ordemId])

  useEffect(() => {
    fetchSolicitacoes()

    // Escutar evento de atualização
    const handleRefresh = () => fetchSolicitacoes()
    window.addEventListener('refreshSolicitacoes', handleRefresh)

    return () => {
      window.removeEventListener('refreshSolicitacoes', handleRefresh)
    }
  }, [ordemId, fetchSolicitacoes])

  const handleAcceptSolicitacao = async (solicitacaoId, statusAtual) => {
    try {
      // Se estiver "Em Andamento", mudar para "Finalizado", senão mudar para "Em Andamento"
      const novoStatus = statusAtual === 'Em Andamento' ? 'Finalizado' : 'Em Andamento'
      
      const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/solicitacoes/${solicitacaoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: novoStatus,
          usuario_responsavel_id: user?.id 
        })
      })
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}))
        fetchSolicitacoes()
        // Se a ordem foi atualizada (ex: status mudou de "Aguardando Peças" para "Em Andamento")
        if (data.ordem) {
          window.dispatchEvent(new CustomEvent('ordemAtualizada', { 
            detail: data.ordem 
          }))
        }
        // Disparar evento para atualizar notificações
        window.dispatchEvent(new CustomEvent('notificacaoAtualizada'))
      } else {
        const data = await resp.json().catch(() => ({}))
        console.error('Erro ao aceitar solicitação:', data?.error)
      }
    } catch (e) {
      console.error('Erro ao aceitar solicitação:', e)
    }
  }

  const handleRejectSolicitacao = async (solicitacaoId, statusAtual) => {
    try {
      // Se estiver "Em Andamento", mudar para "Cancelado", senão mudar para "Recusada"
      const novoStatus = statusAtual === 'Em Andamento' ? 'Cancelado' : 'Recusada'
      
      const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/solicitacoes/${solicitacaoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: novoStatus,
          usuario_responsavel_id: user?.id 
        })
      })
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}))
        fetchSolicitacoes()
        // Se a ordem foi atualizada (ex: status mudou de "Aguardando Peças" para "Em Andamento")
        if (data.ordem) {
          window.dispatchEvent(new CustomEvent('ordemAtualizada', { 
            detail: data.ordem 
          }))
        }
        // Disparar evento para atualizar notificações
        window.dispatchEvent(new CustomEvent('notificacaoAtualizada'))
      } else {
        const data = await resp.json().catch(() => ({}))
        console.error('Erro ao recusar/cancelar solicitação:', data?.error)
      }
    } catch (e) {
      console.error('Erro ao recusar/cancelar solicitação:', e)
    }
  }
  
  const handleAcceptRecusada = async (solicitacaoId) => {
    try {
      // Aceitar solicitação recusada - volta para "Em Andamento"
      const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/solicitacoes/${solicitacaoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Em Andamento',
          usuario_responsavel_id: user?.id 
        })
      })
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}))
        fetchSolicitacoes()
        // Se a ordem foi atualizada (ex: status mudou de "Aguardando Peças" para "Em Andamento")
        if (data.ordem) {
          window.dispatchEvent(new CustomEvent('ordemAtualizada', { 
            detail: data.ordem 
          }))
        }
        // Disparar evento para atualizar notificações
        window.dispatchEvent(new CustomEvent('notificacaoAtualizada'))
      } else {
        const data = await resp.json().catch(() => ({}))
        console.error('Erro ao aceitar solicitação recusada:', data?.error)
      }
    } catch (e) {
      console.error('Erro ao aceitar solicitação recusada:', e)
    }
  }

  const handleDeleteSolicitacao = async (solicitacaoId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta solicitação?')) return
    try {
      const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/solicitacoes/${solicitacaoId}`, {
        method: 'DELETE'
      })
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}))
        fetchSolicitacoes()
        // Se a ordem foi atualizada (ex: status mudou de "Aguardando Peças" para "Em Andamento")
        if (data.ordem) {
          window.dispatchEvent(new CustomEvent('ordemAtualizada', { 
            detail: data.ordem 
          }))
        }
      } else {
        const data = await resp.json().catch(() => ({}))
        console.error('Erro ao excluir solicitação:', data?.error)
      }
    } catch (e) {
      console.error('Erro ao excluir solicitação:', e)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-gray-500">Carregando solicitações...</div>
    )
  }

  return (
    <div className={`mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-[300px]`}>
      {/* Header */}
      <div className="bg-gray-50 px-3 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Solicitações</h3>
            {ordemStatus !== 'Serviços Finalizados' && (
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                title="Adicionar"
                onClick={() => openModal(<FormSolicitacao ordemId={ordemId} />)}
              >
                <Plus className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">{solicitacoes.length} solicitação{solicitacoes.length !== 1 ? 'ões' : ''}</span>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div ref={contentRef} className={`flex-1 p-3 space-y-1 overflow-y-auto`}>
        {solicitacoes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-gray-400">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium mb-1">Nenhuma solicitação adicionada</p>
            <p className="text-xs text-center px-3">Adicione solicitações para começar</p>
          </div>
        ) : (
          solicitacoes.map((sol) => {
            return (
             <div key={sol.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
               <div className="flex-1 min-w-0 pr-2">
                 <h4 className="text-xs font-medium text-gray-900 truncate">{sol.assunto || sol.descricao || 'Solicitação'}</h4>
                 <div className="flex items-center gap-2 mt-1">
                   {sol.data_criacao && (
                     <p className="text-xs text-gray-500">Data: {new Date(sol.data_criacao).toLocaleDateString('pt-BR')}</p>
                   )}
                   {sol.prioridade && (
                     <span className={`text-xs px-1.5 py-0.5 rounded ${
                       sol.prioridade === 'Urgente' ? 'bg-red-100 text-red-700' :
                       sol.prioridade === 'Alta' ? 'bg-orange-100 text-orange-700' :
                       sol.prioridade === 'Média' ? 'bg-yellow-100 text-yellow-700' :
                       'bg-blue-100 text-blue-700'
                     }`}>
                       {sol.prioridade}
                     </span>
                   )}
                   {sol.status && (
                     <span className={`text-xs px-1.5 py-0.5 rounded ${
                       sol.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700' :
                       sol.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' :
                       sol.status === 'Finalizado' ? 'bg-green-100 text-green-700' :
                       sol.status === 'Recusada' ? 'bg-red-100 text-red-700' :
                       sol.status === 'Cancelado' ? 'bg-orange-100 text-orange-700' :
                       'bg-gray-100 text-gray-700'
                     }`}>
                       {sol.status}
                     </span>
                   )}
                 </div>
               </div>
              <div className="flex items-center gap-1">
                {/* Esconder todos os botões se status for "Finalizado" */}
                {sol.status !== 'Finalizado' && (
                  <>
                    {/* Botão Aceitar - mostra se for "Pendente", "Em Andamento" ou "Recusada" */}
                    {(sol.status === 'Pendente' || !sol.status || sol.status === 'Em Andamento' || sol.status === 'Recusada') && (
                      <>
                        {/* Botão Aceitar quando status é "Pendente" - verde */}
                        {(sol.status === 'Pendente' || !sol.status) && (
                          <button
                            onClick={() => handleAcceptSolicitacao(sol.id, sol.status)}
                            className="p-2 rounded-lg text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                            title="Aceitar"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {/* Botão Aceitar quando status é "Em Andamento" - amarelo e clicável com ícone de finalizar */}
                        {sol.status === 'Em Andamento' && (
                          <button
                            onClick={() => handleAcceptSolicitacao(sol.id, sol.status)}
                            className="p-2 rounded-lg text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                            title="Finalizar"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {/* Botão Aceitar quando status é "Recusada" - verde para aceitar */}
                        {sol.status === 'Recusada' && (
                          <button
                            onClick={() => handleAcceptRecusada(sol.id)}
                            className="p-2 rounded-lg text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                            title="Aceitar"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                    {/* Botão Recusar - mostra apenas se não estiver "Em Andamento", "Recusada" ou "Cancelado" */}
                    {sol.status !== 'Em Andamento' && sol.status !== 'Recusada' && sol.status !== 'Cancelado' && (
                      <RejectButton
                        onClick={() => handleRejectSolicitacao(sol.id, sol.status)}
                      />
                    )}
                    <button
                      onClick={() => handleDeleteSolicitacao(sol.id)}
                      className="p-2 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ListSolicitacoes

