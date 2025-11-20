import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DetailPanel from './DetailPanel'
import OrdemItensList from './OrdemItensList'
import ListSolicitacoes from './ListSolicitacoes'
import ListChecklist from './ListChecklist'
import ConfirmButton from '../buttons/ConfirmButton'
import DeleteButton from '../buttons/DeleteButton'
import { Hash, User, Car, CalendarDays, Flag, Clock, UserCircle, FileSpreadsheet, MessageCircle } from 'lucide-react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const statusPillClasses = (status) => {
  const map = {
    'Pendente': 'bg-yellow-500 text-white',
    'Em Andamento': 'bg-blue-500 text-white',
    'Aprovada': 'bg-green-500 text-white',
    'Cancelada': 'bg-rose-600 text-white',
    'Recusada': 'bg-red-500 text-white',
    'Aguardando Peças': 'bg-orange-500 text-white',
    'Serviço Parado': 'bg-gray-500 text-white',
    'Em Supervisão': 'bg-indigo-500 text-white',
    'Serviços Finalizados': 'bg-emerald-600 text-white',
    'Serviço Reaberto': 'bg-blue-600 text-white',
    'Finalizado': 'bg-green-700 text-white'
  }
  return map[status] || 'bg-gray-300 text-gray-900'
}

const formatDate = (value) => {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleDateString('pt-BR')
}

const formatDateTime = (value) => {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const OrdemDetailPanel = ({ ordemId }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ordem, setOrdem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [usuarios, setUsuarios] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [selectedResponsavel, setSelectedResponsavel] = useState('')
  const [updatingResponsavel, setUpdatingResponsavel] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [subtotalItens, setSubtotalItens] = useState(0)
  const [caixaAberto, setCaixaAberto] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        if (!estabelecimentoId || !ordemId) { setLoading(false); return }
        const [ordDetalhesResp, ordResp, usrResp, caixaResp] = await Promise.all([
          fetch(`${API_URL}/api/auth/ordens/${ordemId}/detalhes`),
          fetch(`${API_URL}/api/auth/ordens?estabelecimento_id=${estabelecimentoId}`),
          fetch(`${API_URL}/api/auth/usuarios?estabelecimento_id=${estabelecimentoId}`),
          fetch(`${API_URL}/api/auth/caixas/aberto?estabelecimento_id=${estabelecimentoId}`)
        ])
        const ordDetalhesData = await ordDetalhesResp.json()
        const ordData = await ordResp.json()
        const usrData = await usrResp.json()
        if (ordDetalhesResp.ok && ordDetalhesData.ordem) {
          setOrdem(ordDetalhesData.ordem)
          setSelectedStatus((ordDetalhesData.ordem?.status || ordDetalhesData.ordem?.situacao || 'Pendente'))
          setSelectedResponsavel(ordDetalhesData.ordem?.resposavel ? String(ordDetalhesData.ordem.resposavel) : '')
        } else if (ordResp.ok) {
          const lista = ordData.ordens || []
          const found = lista.find(o => String(o.id) === String(ordemId))
          setOrdem(found || null)
          setSelectedStatus((found?.status || found?.situacao || 'Pendente'))
          setSelectedResponsavel(found?.resposavel ? String(found.resposavel) : '')
        }
        if (usrResp.ok) {
          setUsuarios(usrData.usuarios || usrData || [])
        }
        if (caixaResp.ok) {
          const caixaData = await caixaResp.json()
          setCaixaAberto(caixaData.caixa || null)
        } else {
          setCaixaAberto(null)
        }
      } catch (e) {
        console.error('Erro ao carregar detalhes da ordem:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    // Escutar eventos de atualização da ordem
    const handleOrdemAtualizada = (e) => {
      const ordemAtualizada = e.detail
      if (ordemAtualizada && String(ordemAtualizada.id) === String(ordemId)) {
        setOrdem(ordemAtualizada)
        setSelectedStatus(ordemAtualizada.status || ordemAtualizada.situacao || 'Pendente')
      }
    }

    window.addEventListener('ordemAtualizada', handleOrdemAtualizada)
    
    // Escutar evento de subtotal dos itens atualizado
    const handleSubtotalAtualizado = (e) => {
      if (e.detail && String(e.detail.ordemId) === String(ordemId)) {
        setSubtotalItens(e.detail.subtotal || 0)
      }
    }
    
    window.addEventListener('subtotalItensAtualizado', handleSubtotalAtualizado)
    
    // Escutar eventos de caixa
    const handleCaixaAberto = async () => {
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (estabelecimentoId) {
        try {
          const response = await fetch(`${API_URL}/api/auth/caixas/aberto?estabelecimento_id=${estabelecimentoId}`)
          if (response.ok) {
            const data = await response.json()
            setCaixaAberto(data.caixa || null)
          } else {
            setCaixaAberto(null)
          }
        } catch (error) {
          console.error('Erro ao buscar caixa:', error)
          setCaixaAberto(null)
        }
      }
    }
    
    window.addEventListener('caixaAberto', handleCaixaAberto)
    window.addEventListener('caixaFechado', handleCaixaAberto)
    window.addEventListener('caixaAtualizado', handleCaixaAberto)
    
    return () => {
      window.removeEventListener('ordemAtualizada', handleOrdemAtualizada)
      window.removeEventListener('subtotalItensAtualizado', handleSubtotalAtualizado)
      window.removeEventListener('caixaAberto', handleCaixaAberto)
      window.removeEventListener('caixaFechado', handleCaixaAberto)
      window.removeEventListener('caixaAtualizado', handleCaixaAberto)
    }
  }, [user, ordemId])

  const header = (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="p-2">
          <div className="text-gray-500 mb-0.5">Código</div>
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-500" />
            <div className="font-medium text-gray-900">{ordem?.codigo || '--'}</div>
          </div>
        </div>
        <div className="p-2">
          <div className="text-gray-500 mb-0.5">Cliente</div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <div className="font-medium text-gray-900">{ordem?.cliente_nome || '--'}</div>
          </div>
        </div>
        <div className="p-2">
          <div className="text-gray-500 mb-0.5">Veículo</div>
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-gray-500" />
            <div className="font-medium text-gray-900">{ordem?.veiculo_descricao || ordem?.veiculo_placa || '--'}</div>
          </div>
        </div>
        <div className="p-2">
          <div className="text-gray-500 mb-0.5">Data de Abertura</div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-500" />
            <div className="font-medium text-gray-900">{formatDate(ordem?.data_abertura)}</div>
          </div>
        </div>
        <div className="p-2">
          <div className="text-gray-500 mb-0.5">Status</div>
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-gray-500" />
            <select
              value={selectedStatus}
              onChange={async (e) => {
                const newStatus = e.target.value
                setSelectedStatus(newStatus)
                if (!ordem?.id) return
                try {
                  setUpdatingStatus(true)
                  const resp = await fetch(`${API_URL}/api/auth/ordens/${ordem.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                  })
                  const data = await resp.json()
                  if (resp.ok) {
                    setOrdem(data.ordem)
                    window.dispatchEvent(new CustomEvent('ordemAtualizada', { detail: data.ordem }))
                  }
                } catch (err) {
                  console.error('Erro ao mudar status:', err)
                } finally {
                  setUpdatingStatus(false)
                }
              }}
              disabled={updatingStatus}
              className={`px-2 py-1 pr-5 rounded-full text-xs font-medium disabled:opacity-50 w-auto ${statusPillClasses(selectedStatus)}`}
            >
              {[
                'Em Andamento',
                'Aprovada',
                'Cancelada',
                'Recusada',
                'Aguardando Peças',
                'Serviço Parado',
                'Em Supervisão',
                'Serviços Finalizados',
                'Serviço Reaberto',
                'Finalizado'
              ].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-2">
          <div className="text-gray-500 mb-0.5">Previsão de Saída</div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <div className="font-medium text-gray-900">{formatDateTime(ordem?.previsao_saida)}</div>
          </div>
        </div>
        <div className="md:col-span-3 p-2">
          <div className="text-gray-500 mb-1">Responsável</div>
          <div className="flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-gray-500" />
            <select
              value={selectedResponsavel}
              onChange={async (e) => {
                const newRespId = e.target.value
                setSelectedResponsavel(newRespId)
                if (!ordem?.id) return
                try {
                  setUpdatingResponsavel(true)
                  const resp = await fetch(`${API_URL}/api/auth/ordens/${ordem.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: selectedStatus || (ordem?.status || 'Pendente'), responsavel_id: newRespId ? parseInt(newRespId) : null })
                  })
                  const data = await resp.json()
                  if (resp.ok) {
                    setOrdem(data.ordem)
                    window.dispatchEvent(new CustomEvent('ordemAtualizada', { detail: data.ordem }))
                  }
                } catch (err) {
                  console.error('Erro ao mudar responsável:', err)
                } finally {
                  setUpdatingResponsavel(false)
                }
              }}
              disabled={updatingResponsavel}
              className="px-3 py-1.5 pr-8 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 w-full md:w-auto"
            >
              <option value="">Selecionar responsável</option>
              {(() => {
                const allowed = ['Mecânico','Assistente Mecânico']
                const permitted = usuarios.filter(u => allowed.includes(u.cargo))
                const inPermitted = permitted.some(u => String(u.id) === String(selectedResponsavel))
                const current = usuarios.find(u => String(u.id) === String(selectedResponsavel))
                return (
                  <>
                    {!inPermitted && current && (
                      <option value={current.id}>{current.nome}</option>
                    )}
                    {permitted.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </>
                )
              })()}
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <DetailPanel header={header} className="flex-1">
      {loading ? (
        <div className="text-gray-500">Carregando...</div>
      ) : !ordem ? (
        <div className="text-gray-500">Ordem não encontrada.</div>
      ) : (
        <div className="text-gray-700 flex-1 min-h-0 flex flex-col">
          {/* Três listas em linha (horizontal) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <OrdemItensList ordemId={ordem?.id} ordemStatus={ordem?.status} />
            <ListSolicitacoes ordemId={ordem?.id} ordemStatus={ordem?.status} />
            <ListChecklist ordemId={ordem?.id} ordemStatus={ordem?.status} />
          </div>

          {/* Botões de ação no bottom */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 mt-auto">
            <button
              onClick={async () => {
                if (!ordem?.id) return
                
                const isFinalizado = ordem?.status === 'Serviços Finalizados'
                const novoStatus = isFinalizado ? 'Serviço Reaberto' : 'Serviços Finalizados'
                
                try {
                  setUpdatingStatus(true)
                  const resp = await fetch(`${API_URL}/api/auth/ordens/${ordem.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: novoStatus })
                  })
                  const data = await resp.json()
                  if (resp.ok) {
                    setOrdem(data.ordem)
                    setSelectedStatus(novoStatus)
                    window.dispatchEvent(new CustomEvent('ordemAtualizada', { detail: data.ordem }))
                    // Disparar evento para atualizar notificações
                    window.dispatchEvent(new CustomEvent('notificacaoAtualizada'))
                  }
                } catch (err) {
                  console.error('Erro ao finalizar/reabrir serviços:', err)
                } finally {
                  setUpdatingStatus(false)
                }
              }}
              disabled={updatingStatus}
              className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 text-white font-semibold rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 h-[42px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ordem?.status === 'Serviços Finalizados' ? 'Reabrir Serviço' : 'Finalizar Serviços'}
            </button>
            
            {/* Botão "Finalizar Ordem" - aparece apenas quando status é "Serviços Finalizados" */}
            {ordem?.status === 'Serviços Finalizados' && (
              <button
                onClick={async () => {
                  if (!ordem?.id) return
                  try {
                    setUpdatingStatus(true)
                    const resp = await fetch(`${API_URL}/api/auth/ordens/${ordem.id}/status`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'Finalizado' })
                    })
                    const data = await resp.json()
                    if (resp.ok) {
                      setOrdem(data.ordem)
                      setSelectedStatus('Finalizado')
                      window.dispatchEvent(new CustomEvent('ordemAtualizada', { detail: data.ordem }))
                      window.dispatchEvent(new CustomEvent('notificacaoAtualizada'))
                      // Disparar evento para atualizar pagamentos
                      window.dispatchEvent(new CustomEvent('pagamentoAdicionado'))
                      // Redirecionar para home após finalizar
                      navigate('/home')
                    }
                  } catch (err) {
                    console.error('Erro ao finalizar ordem:', err)
                  } finally {
                    setUpdatingStatus(false)
                  }
                }}
                disabled={updatingStatus}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-500 hover:to-green-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 h-[42px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Finalizar Ordem
              </button>
            )}
            
            <button
              onClick={async () => {
                try {
                  if (!ordem?.id) {
                    alert('ID da ordem não encontrado')
                    return
                  }

                  // Chamar API para gerar PDF da ordem
                  const response = await fetch(`${API_URL}/api/auth/ordens/${ordem.id}/pdf`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  })

                  if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Erro ao gerar PDF da ordem')
                  }

                  // Criar blob e fazer download
                  const blob = await response.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `ordem-${ordem.codigo || ordem.id}.pdf`
                  document.body.appendChild(a)
                  a.click()
                  window.URL.revokeObjectURL(url)
                  document.body.removeChild(a)
                } catch (error) {
                  console.error('Erro ao gerar PDF da ordem:', error)
                  alert(error.message || 'Erro ao gerar PDF da ordem')
                }
              }}
              className="p-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors h-[42px] w-[42px] flex items-center justify-center"
              title="Gerar PDF"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            
            {/* Botão WhatsApp */}
            <button
              onClick={async () => {
                try {
                  if (!ordem?.id) {
                    alert('ID da ordem não encontrado')
                    return
                  }

                  // Verificar se o cliente tem WhatsApp
                  if (!ordem?.cliente_whatsapp) {
                    alert('Cliente não possui WhatsApp cadastrado. Por favor, cadastre o WhatsApp do cliente antes de enviar.')
                    return
                  }

                  // Limpar número do WhatsApp (remover caracteres não numéricos)
                  const whatsappLimpo = ordem.cliente_whatsapp.replace(/\D/g, '')
                  
                  // Verificar se o número está vazio após limpar
                  if (!whatsappLimpo) {
                    alert('Cliente não possui WhatsApp cadastrado. Por favor, cadastre o WhatsApp do cliente antes de enviar.')
                    return
                  }
                  
                  // Gerar link do PDF (usar a URL da API)
                  const pdfUrl = `${API_URL}/api/auth/ordens/${ordem.id}/pdf`
                  
                  // Mensagem pré-formatada
                  const mensagem = encodeURIComponent(
                    `Olá, ${ordem.cliente_nome || 'querido cliente'}! Segue o relatório da sua ordem de serviço.\n\n` +
                    `Código: ${ordem.codigo || ordem.id}\n` +
                    `Link do PDF: ${pdfUrl}`
                  )

                  // Abrir WhatsApp Web
                  const whatsappUrl = `https://wa.me/${whatsappLimpo}?text=${mensagem}`
                  window.open(whatsappUrl, '_blank')
                } catch (error) {
                  console.error('Erro ao abrir WhatsApp:', error)
                  alert('Erro ao abrir WhatsApp. Verifique se o cliente possui WhatsApp cadastrado.')
                }
              }}
              className="p-2 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 transition-colors h-[42px] w-[42px] flex items-center justify-center"
              title="Enviar por WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            
            <button
              onClick={async () => {
                if (window.confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
                  try {
                    setDeleting(true)
                    const resp = await fetch(`${API_URL}/api/auth/ordens/${ordem.id}`, {
                      method: 'DELETE'
                    })
                    const data = await resp.json()
                    
                    if (resp.ok) {
                      // Disparar eventos para atualizar listas
                      window.dispatchEvent(new CustomEvent('ordemAtualizada'))
                      window.dispatchEvent(new CustomEvent('notificacaoAtualizada'))
                      
                      // Voltar para página anterior (home/dashboard)
                      navigate('/home')
                    } else {
                      alert(data?.error || 'Erro ao excluir ordem de serviço')
                    }
                  } catch (err) {
                    console.error('Erro ao excluir ordem:', err)
                    alert('Erro ao excluir ordem de serviço. Tente novamente.')
                  } finally {
                    setDeleting(false)
                  }
                }
              }}
              disabled={deleting}
              className="p-2 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors h-[42px] w-[42px] flex items-center justify-center ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
              title="Excluir"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}

    </DetailPanel>
  )
}

export default OrdemDetailPanel








