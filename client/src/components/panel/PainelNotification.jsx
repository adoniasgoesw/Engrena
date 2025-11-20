import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, Check, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import notificationSound from '../../assets/message-notification-190034.mp3'

const PainelNotification = ({ isOpen, onClose }) => {
  const panelRef = useRef(null)
  const { user } = useAuth()
  const [notificacoes, setNotificacoes] = useState([])
  const [ultimoContador, setUltimoContador] = useState(0)
  const [expandedId, setExpandedId] = useState(null)
  const audioRef = useRef(null)

  // Função para formatar data relativa
  const formatarDataRelativa = (dataString) => {
    if (!dataString) return ''
    const data = new Date(dataString)
    const agora = new Date()
    const diffMs = agora - data
    const diffMinutos = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMinutos / 60)
    const diffDias = Math.floor(diffHoras / 24)

    if (diffMinutos < 1) return 'Agora'
    if (diffMinutos < 60) return `Há ${diffMinutos} minuto${diffMinutos > 1 ? 's' : ''}`
    if (diffHoras < 24) return `Há ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`
    if (diffDias < 7) return `Há ${diffDias} dia${diffDias > 1 ? 's' : ''}`
    return data.toLocaleDateString('pt-BR')
  }

  // Função para mapear tipo de notificação para tipo visual
  const mapearTipoVisual = (tipo, titulo) => {
    // Verificar se é solicitação aceita ou recusada pelo título
    if (tipo?.toLowerCase() === 'solicitação' && titulo) {
      const tituloLower = titulo.toLowerCase()
      if (tituloLower.includes('aceita') || tituloLower.includes('você aceitou')) {
        return 'success'
      }
      if (tituloLower.includes('recusada') || tituloLower.includes('recusou') || tituloLower.includes('você recusou')) {
        return 'error'
      }
      return 'info'
    }
    
    switch (tipo?.toLowerCase()) {
      case 'solicitação':
        return 'info'
      case 'sucesso':
      case 'success':
      case 'pagamento':
      case 'pagamento_realizado':
      case 'pagamento_aprovado':
        return 'success'
      case 'aviso':
      case 'warning':
      case 'estoque':
        return 'warning'
      case 'erro':
      case 'error':
      case 'urgente':
        return 'error'
      default:
        return 'info'
    }
  }

  // Reproduzir som de notificação
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(error => {
        console.log('Erro ao reproduzir som:', error)
      })
    }
  }, [])

  // Buscar notificações
  const fetchNotificacoes = useCallback(async (playSound = false) => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`${API_URL}/api/auth/notificacoes?usuario_id=${user.id}`)
      const data = await response.json()
      
      if (response.ok) {
        const novasNotificacoes = data.notificacoes || []
        const naoLidas = novasNotificacoes.filter(n => n.aberta).length
        
        // Verificar se há nova notificação (contador aumentou)
        setNotificacoes(prev => {
          const prevNaoLidas = prev.filter(n => n.aberta).length
          
          // Preservar estado de notificações marcadas como lidas localmente
          // aberta = true significa NÃO LIDA, aberta = false significa LIDA
          const notificacoesAtualizadas = novasNotificacoes.map(novaNotif => {
            const notifAnterior = prev.find(p => p.id === novaNotif.id)
            
            if (notifAnterior) {
              // Se estava LIDA localmente (aberta = false) mas veio como NÃO LIDA do servidor (aberta = true)
              // Manter como LIDA (preservar estado local até o servidor atualizar)
              if (!notifAnterior.aberta && novaNotif.aberta) {
                return notifAnterior
              }
              // Se estava NÃO LIDA localmente (aberta = true) mas veio como LIDA do servidor (aberta = false)
              // Usar do servidor (foi marcada como lida em outro lugar)
              if (notifAnterior.aberta && !novaNotif.aberta) {
                return novaNotif
              }
            }
            
            return novaNotif
          })
          
          const naoLidasAtualizadas = notificacoesAtualizadas.filter(n => n.aberta).length
          
          // Atualizar contador
          setUltimoContador(naoLidasAtualizadas)
          
          // Tocar som se houver nova notificação (contador aumentou)
          // Toca quando: prevNaoLidas era 0 e agora tem notificações OU prevNaoLidas > 0 e aumentou
          if (playSound && naoLidasAtualizadas > prevNaoLidas) {
            // Reproduzir som
            playNotificationSound()
          }
          
          return notificacoesAtualizadas
        })
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
    }
  }, [user?.id, playNotificationSound])

  // Marcar notificação como lida
  const marcarComoLida = async (notificacaoId) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/notificacoes/${notificacaoId}/lida`, {
        method: 'PATCH'
      })
      
      if (response.ok) {
        // Atualizar estado local imediatamente - aberta = false significa LIDA
        setNotificacoes(prev => {
          const atualizadas = prev.map(n => 
            n.id === notificacaoId ? { ...n, aberta: false, lida_em: new Date().toISOString() } : n
          )
          // Atualizar contador de não lidas
          const naoLidas = atualizadas.filter(n => n.aberta).length
          setUltimoContador(naoLidas)
          return atualizadas
        })
        // Disparar evento para atualizar contador (sem tocar som)
        window.dispatchEvent(new CustomEvent('notificacaoAtualizada'))
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  // Marcar todas como lidas
  const marcarTodasComoLidas = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`${API_URL}/api/auth/notificacoes/marcar-todas-lidas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: user.id })
      })
      
      if (response.ok) {
        // Atualizar estado local imediatamente - aberta = false significa LIDA
        setNotificacoes(prev => {
          const atualizadas = prev.map(n => ({ ...n, aberta: false, lida_em: new Date().toISOString() }))
          setUltimoContador(0)
          return atualizadas
        })
        // Recarregar notificações do servidor (sem tocar som) após um pequeno delay
        setTimeout(() => {
          fetchNotificacoes(false)
        }, 500)
        // Disparar evento para atualizar contador
        window.dispatchEvent(new CustomEvent('notificacaoAtualizada'))
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  // Inicializar contador na primeira carga
  useEffect(() => {
    if (user?.id && ultimoContador === 0) {
      fetch(`${API_URL}/api/auth/notificacoes?usuario_id=${user.id}`)
        .then(res => res.json())
        .then(data => {
          const naoLidas = (data.notificacoes || []).filter(n => n.aberta).length
          setUltimoContador(naoLidas)
        })
        .catch(err => console.error('Erro ao buscar contador inicial:', err))
    }
  }, [user?.id])

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchNotificacoes(false) // Não tocar som ao abrir o painel manualmente
    }
  }, [isOpen, user?.id])

  // Verificar novas notificações periodicamente (polling)
  useEffect(() => {
    if (!user?.id) return

    // Verificar imediatamente ao montar
    fetchNotificacoes(false)

    const intervalId = setInterval(() => {
      fetchNotificacoes(true) // Tocar som se houver nova notificação
    }, 3000) // Verificar a cada 3 segundos

    // Escutar evento de nova notificação
    const handleNovaNotificacao = () => {
      setTimeout(() => {
        fetchNotificacoes(true)
      }, 500)
    }
    
    window.addEventListener('novaNotificacao', handleNovaNotificacao)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('novaNotificacao', handleNovaNotificacao)
    }
  }, [user?.id, fetchNotificacoes])

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => {
        document.removeEventListener('keydown', handleEsc)
      }
    }
  }, [isOpen, onClose])

  const getIcon = (tipoVisual, titulo, tipo) => {
    // Usar sempre o mesmo ícone (Info), apenas mudando a cor
    let iconColor = 'text-blue-800' // Azul padrão
    
    // Para notificações de pagamento, usar ícone Info verde
    if (tipo && (tipo.toLowerCase() === 'pagamento_realizado' || tipo.toLowerCase() === 'pagamento_aprovado')) {
      iconColor = 'text-green-800'
    }
    
    if (titulo) {
      const tituloLower = titulo.toLowerCase()
      if (tituloLower.includes('aceita') || tituloLower.includes('você aceitou')) {
        iconColor = 'text-green-800' // Verde para aceita
      } else if (tituloLower.includes('recusada') || tituloLower.includes('recusou') || tituloLower.includes('você recusou')) {
        iconColor = 'text-red-800' // Vermelho para recusada
      } else if (tituloLower.includes('deletada') || tituloLower.includes('deletou')) {
        iconColor = 'text-red-800' // Vermelho para solicitação/ordem deletada
      }
    } else {
      switch (tipoVisual) {
        case 'success':
          iconColor = 'text-green-800'
          break
        case 'error':
          iconColor = 'text-red-800'
          break
        case 'warning':
          iconColor = 'text-yellow-800'
          break
        default:
          iconColor = 'text-blue-800'
      }
    }
    
    return <Info className={`w-5 h-5 ${iconColor}`} />
  }

  const getBgColor = (tipoVisual, titulo, tipo) => {
    // Para notificações de pagamento, usar verde
    if (tipo && (tipo.toLowerCase() === 'pagamento_realizado' || tipo.toLowerCase() === 'pagamento_aprovado')) {
      return 'bg-green-100 border-green-300'
    }
    
    // Para solicitações aceitas/recusadas e ordens deletadas, usar as mesmas cores dos botões
    if (titulo) {
      const tituloLower = titulo.toLowerCase()
      if (tituloLower.includes('aceita') || tituloLower.includes('você aceitou')) {
        return 'bg-green-100 border-green-300'
      }
      if (tituloLower.includes('recusada') || tituloLower.includes('recusou') || tituloLower.includes('você recusou')) {
        return 'bg-red-100 border-red-300'
      }
      if (tituloLower.includes('deletada') || tituloLower.includes('deletou')) {
        return 'bg-red-100 border-red-300' // Vermelho para solicitação/ordem deletada
      }
    }
    
    // Azul padrão para todas as outras notificações
    return 'bg-blue-100 border-blue-300'
  }

  const notificacoesNaoLidas = notificacoes.filter(n => n.aberta).length

  if (!isOpen) return null

  return (
    <>
      {/* Elemento de áudio */}
      <audio ref={audioRef} src={notificationSound} preload="auto" />
      
      {/* Overlay */}
      <div className="fixed top-0 left-0 right-0 bottom-0 h-screen w-screen bg-black/20 z-40" onClick={onClose} />
      
      {/* Painel */}
      <div
        ref={panelRef}
        className="fixed top-4 right-4 w-96 max-w-[calc(100vw-3rem)] h-[calc(100vh-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Notificações</h3>
            {notificacoesNaoLidas > 0 && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                {notificacoesNaoLidas}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Notificações */}
        <div className="flex-1 overflow-y-auto p-4">
          {notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-gray-400">
              <Bell className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs text-center mt-1">Você está em dia!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificacoes.map((notificacao) => {
                const tipoVisual = mapearTipoVisual(notificacao.tipo, notificacao.titulo)
                const isNaoLida = notificacao.aberta
                const isExpanded = expandedId === notificacao.id
                
                return (
                  <div
                    key={notificacao.id}
                    className={`transition-all rounded-lg border ${
                      isNaoLida 
                        ? 'bg-white border-gray-200 shadow-sm hover:shadow-md' 
                        : 'bg-gray-50/50 border-gray-100'
                    }`}
                  >
                    {/* Cabeçalho colapsável */}
                    <div
                      onClick={async () => {
                        // Primeiro expandir/colapsar
                        setExpandedId(isExpanded ? null : notificacao.id)
                        // Depois marcar como lida se necessário (sem tocar som)
                        if (isNaoLida) {
                          await marcarComoLida(notificacao.id)
                        }
                      }}
                      className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        {/* Ícone */}
                        <div className={`flex-shrink-0 p-2.5 rounded-lg ${getBgColor(tipoVisual, notificacao.titulo, notificacao.tipo)}`}>
                          {getIcon(tipoVisual, notificacao.titulo, notificacao.tipo)}
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-medium text-gray-900 ${isNaoLida ? '' : 'text-gray-600'}`}>
                                {(() => {
                                  // Para notificações de pagamento, garantir que o título seja apenas "Pagamento realizado"
                                  const isPagamento = notificacao.tipo && (
                                    notificacao.tipo.toLowerCase() === 'pagamento_realizado' || 
                                    notificacao.tipo.toLowerCase() === 'pagamento_aprovado'
                                  )
                                  
                                  if (isPagamento) {
                                    // Remover qualquer método de pagamento do título
                                    const tituloLimpo = notificacao.titulo?.split(' • ')[0] || notificacao.titulo
                                    // Se for pagamento_aprovado, garantir que mostre "Pagamento aprovado"
                                    if (notificacao.tipo?.toLowerCase() === 'pagamento_aprovado') {
                                      return tituloLimpo || 'Pagamento aprovado'
                                    }
                                    // Se for pagamento_realizado, garantir que mostre "Pagamento realizado"
                                    return tituloLimpo || 'Pagamento realizado'
                                  }
                                  
                                  return notificacao.titulo
                                })()}
                              </h4>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatarDataRelativa(notificacao.data_criacao)}
                              </p>
                            </div>
                            
                            {/* Indicador de não lida */}
                            {isNaoLida && (
                              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo expandido */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pl-16 border-t border-gray-100 bg-gray-50/30 rounded-b-lg">
                        <div className="pt-4 space-y-3">
                          {/* Informações completas */}
                          <div className="space-y-2 text-sm">
                            {/* De: sempre primeiro */}
                            <div>
                              <span className="text-gray-500 font-medium">De:</span>
                              <span className="text-gray-700 ml-2">
                                {(() => {
                                  // Para pagamentos, sempre mostrar "Sistema"
                                  const isPagamento = notificacao.tipo && (
                                    notificacao.tipo.toLowerCase() === 'pagamento_realizado' || 
                                    notificacao.tipo.toLowerCase() === 'pagamento_aprovado'
                                  )
                                  return isPagamento ? 'Sistema' : (notificacao.remetente_nome || 'Sistema')
                                })()}
                              </span>
                            </div>
                            
                            {(() => {
                              // Verificar se é notificação de pagamento
                              const isPagamento = notificacao.tipo && (
                                notificacao.tipo.toLowerCase() === 'pagamento_realizado' || 
                                notificacao.tipo.toLowerCase() === 'pagamento_aprovado'
                              )
                              
                              if (isPagamento) {
                                // Para pagamentos, mostrar "Pagamento" como tipo
                                return (
                                  <div>
                                    <span className="text-gray-500 font-medium">Tipo:</span>
                                    <span className="text-gray-700 ml-2">
                                      Pagamento
                                    </span>
                                  </div>
                                )
                              }
                              
                              // Verificar se é solicitação aceita ou recusada pelo título
                              const tituloLower = notificacao.titulo?.toLowerCase() || ''
                              const isAceita = tituloLower.includes('aceita') || tituloLower.includes('você aceitou')
                              const isRecusada = tituloLower.includes('recusada') || tituloLower.includes('recusou') || tituloLower.includes('você recusou')
                              
                              // Definir o tipo a ser exibido
                              let tipoExibido = notificacao.tipo
                              if (isAceita) {
                                tipoExibido = 'Solicitação Aceita'
                              } else if (isRecusada) {
                                tipoExibido = 'Solicitação Recusada'
                              }
                              
                              return (
                                tipoExibido && (
                                  <div>
                                    <span className="text-gray-500 font-medium">Tipo:</span>
                                    <span className="text-gray-700 ml-2 capitalize">
                                      {tipoExibido}
                                    </span>
                                  </div>
                                )
                              )
                            })()}
                            
                            {/* Meio de pagamento: apenas para notificações de pagamento */}
                            {(() => {
                              const isPagamento = notificacao.tipo && (
                                notificacao.tipo.toLowerCase() === 'pagamento_realizado' || 
                                notificacao.tipo.toLowerCase() === 'pagamento_aprovado'
                              )
                              
                              if (isPagamento) {
                                // Buscar método de pagamento e data do metadata
                                let metodoPagamento = 'Não informado'
                                let dataPagamento = null
                                try {
                                  const metadata = typeof notificacao.metadata === 'string' 
                                    ? JSON.parse(notificacao.metadata) 
                                    : notificacao.metadata
                                  if (metadata) {
                                    if (metadata.metodo_pagamento) {
                                      metodoPagamento = metadata.metodo_pagamento
                                    }
                                    if (metadata.data_pagamento) {
                                      dataPagamento = metadata.data_pagamento
                                    }
                                  }
                                } catch (e) {
                                  console.error('Erro ao parsear metadata:', e)
                                }
                                
                                return (
                                  <>
                                    <div>
                                      <span className="text-gray-500 font-medium">Meio de pagamento:</span>
                                      <span className="text-gray-700 ml-2">
                                        {metodoPagamento}
                                      </span>
                                    </div>
                                    {dataPagamento && (
                                      <div>
                                        <span className="text-gray-500 font-medium">Data de pagamento:</span>
                                        <span className="text-gray-700 ml-2">
                                          {new Date(dataPagamento).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )
                              }
                              return null
                            })()}
                            
                            {/* OS: sempre após Tipo, para solicitações e ordens */}
                            {(() => {
                              const tituloLower = notificacao.titulo?.toLowerCase() || ''
                              const isNovaSolicitacao = tituloLower.includes('nova solicitação')
                              const isOrdem = notificacao.tipo === 'Ordem' || notificacao.tipo?.includes('Ordem')
                              
                              if ((isNovaSolicitacao || notificacao.tipo?.includes('Solicitação') || isOrdem) && notificacao.ordem_codigo) {
                                return (
                                  <div>
                                    <span className="text-gray-500 font-medium">OS:</span>
                                    <span className="text-gray-700 ml-2 font-semibold">
                                      {notificacao.ordem_codigo}
                                    </span>
                                  </div>
                                )
                              }
                              return null
                            })()}
                            
                            {(() => {
                              // Para notificações de Ordem, mostrar dados da ordem
                              const isOrdem = notificacao.tipo === 'Ordem' || notificacao.tipo?.includes('Ordem')
                              
                              if (isOrdem) {
                                return (
                                  <>
                                    {/* Cliente - sempre exibir */}
                                    <div>
                                      <span className="text-gray-500 font-medium">Cliente:</span>
                                      <span className="text-gray-700 ml-2">
                                        {notificacao.cliente_nome || 'Não informado'}
                                      </span>
                                    </div>
                                    
                                    {/* Responsável - sempre exibir */}
                                    <div>
                                      <span className="text-gray-500 font-medium">Responsável:</span>
                                      <span className="text-gray-700 ml-2">
                                        {notificacao.responsavel_nome || 'Não informado'}
                                      </span>
                                    </div>
                                    
                                    {/* Previsão de Saída (Tempo de Previsão) - sempre exibir */}
                                    <div>
                                      <span className="text-gray-500 font-medium">Tempo de Previsão:</span>
                                      <span className="text-gray-700 ml-2">
                                        {notificacao.ordem_previsao_saida 
                                          ? new Date(notificacao.ordem_previsao_saida).toLocaleDateString('pt-BR', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })
                                          : 'Não informado'
                                        }
                                      </span>
                                    </div>
                                  </>
                                )
                              }
                              
                              // Verificar se é notificação de pagamento
                              const isPagamento = notificacao.tipo && (
                                notificacao.tipo.toLowerCase() === 'pagamento_realizado' || 
                                notificacao.tipo.toLowerCase() === 'pagamento_aprovado'
                              )
                              
                              // Para solicitações: ocultar prioridade para aceitas/recusadas
                              // Para pagamentos: não mostrar prioridade
                              const tituloLower = notificacao.titulo?.toLowerCase() || ''
                              const isAceita = tituloLower.includes('aceita') || tituloLower.includes('você aceitou')
                              const isRecusada = tituloLower.includes('recusada') || tituloLower.includes('recusou') || tituloLower.includes('você recusou')
                              
                              // Só mostrar prioridade se não for pagamento, aceita nem recusada
                              if (!isPagamento && !isAceita && !isRecusada && notificacao.prioridade) {
                                return (
                                  <div>
                                    <span className="text-gray-500 font-medium">Prioridade:</span>
                                    <span className={`ml-2 font-medium ${
                                      notificacao.prioridade === 'Urgente' ? 'text-red-600' :
                                      notificacao.prioridade === 'Alta' ? 'text-orange-600' :
                                      notificacao.prioridade === 'Média' ? 'text-yellow-600' :
                                      'text-gray-600'
                                    }`}>
                                      {notificacao.prioridade}
                                    </span>
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>

                          {/* Mensagem completa */}
                          <div className="pt-2 border-t border-gray-200">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {(() => {
                                const mensagem = notificacao.mensagem || ''
                                const isPagamento = notificacao.tipo && (
                                  notificacao.tipo.toLowerCase() === 'pagamento_realizado' || 
                                  notificacao.tipo.toLowerCase() === 'pagamento_aprovado'
                                )
                                
                                if (isPagamento) {
                                  // Para pagamentos: remover código da OS (ex: "(OS #38)")
                                  return mensagem.replace(/\s*\(OS\s*#\d+\)/gi, '')
                                }
                                
                                const isOrdem = notificacao.tipo === 'Ordem' || notificacao.tipo?.includes('Ordem')
                                
                                if (isOrdem) {
                                  // Para ordens deletadas: manter a mensagem completa
                                  if (mensagem.match(/.+ deletou a ordem/i)) {
                                    return mensagem
                                  }
                                  // Para ordens criadas: remover o prefixo "Nome criou uma ordem de serviço: "
                                  const mensagemLimpa = mensagem.replace(
                                    /^[^:]+criou uma ordem de serviço:\s*/i,
                                    ''
                                  )
                                  return mensagemLimpa || mensagem
                                } else {
                                  // Para solicitações deletadas: manter a mensagem completa
                                  if (mensagem.match(/.+ deletou a solicitação/i)) {
                                    return mensagem
                                  }
                                  // Para solicitações: remover o prefixo automático
                                  // Padrão: "Nome enviou uma solicitação de "Tipo" para você: "
                                  const prefixPattern = /^[^:]+enviou uma solicitação de "[^"]+" para você:\s*/i
                                  const mensagemLimpa = mensagem.replace(prefixPattern, '')
                                  return mensagemLimpa || mensagem
                                }
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notificacoes.length > 0 && notificacoesNaoLidas > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={marcarTodasComoLidas}
              className="w-full px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Marcar todas como lidas
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default PainelNotification

