import React, { useEffect, useRef, useState, useCallback } from 'react'
import { API_URL } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import notificationSound from '../assets/message-notification-190034.mp3'

const NotificationSound = () => {
  const { user } = useAuth()
  const [ultimoContador, setUltimoContador] = useState(0)
  const audioRef = useRef(null)

  // Reproduzir som de notificação
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(error => {
        console.log('Erro ao reproduzir som:', error)
      })
    }
  }, [])

  // Buscar contador de notificações não lidas
  const fetchNotificacoesNaoLidas = useCallback(async (playSound = false) => {
    if (!user?.id) return
    
    try {
      const resp = await fetch(`${API_URL}/api/auth/notificacoes?usuario_id=${user.id}`)
      const data = await resp.json()
      
      if (resp.ok) {
        const naoLidas = (data.notificacoes || []).filter(n => n.aberta).length
        
        // Verificar se há nova notificação (contador aumentou)
        if (playSound && naoLidas > ultimoContador && ultimoContador >= 0) {
          // Reproduzir som apenas se o contador aumentou
          playNotificationSound()
        }
        
        setUltimoContador(naoLidas)
      }
    } catch (e) {
      console.error('Erro ao buscar notificações:', e)
    }
  }, [user?.id, ultimoContador, playNotificationSound])

  useEffect(() => {
    if (!user?.id) return

    // Inicializar contador na primeira carga
    const initCounter = async () => {
      try {
        const resp = await fetch(`${API_URL}/api/auth/notificacoes?usuario_id=${user.id}`)
        const data = await resp.json()
        if (resp.ok) {
          const naoLidas = (data.notificacoes || []).filter(n => n.aberta).length
          setUltimoContador(naoLidas)
        }
      } catch (e) {
        console.error('Erro ao inicializar contador:', e)
      }
    }
    
    initCounter()

    // Atualizar quando evento for disparado
    const handleRefreshNotificacoes = () => {
      fetchNotificacoesNaoLidas(false)
    }
    
    // Escutar evento de nova notificação criada (tocar som imediatamente)
    const handleNovaNotificacao = (event) => {
      // Verificar se a notificação é para o usuário atual
      const destinatarioId = event.detail?.destinatario_id
      if (!destinatarioId || parseInt(destinatarioId) === user?.id) {
        // É para o usuário atual - verificar e tocar som
        setTimeout(() => {
          fetchNotificacoesNaoLidas(true)
        }, 1000) // Aguardar 1s para garantir que a notificação foi salva no banco
      }
    }
    
    window.addEventListener('notificacaoAtualizada', handleRefreshNotificacoes)
    window.addEventListener('novaNotificacao', handleNovaNotificacao)
    
    // Verificar novas notificações periodicamente (polling)
    const intervalId = setInterval(() => {
      fetchNotificacoesNaoLidas(true) // Tocar som se houver nova notificação
    }, 3000) // Verificar a cada 3 segundos
    
    return () => {
      window.removeEventListener('notificacaoAtualizada', handleRefreshNotificacoes)
      window.removeEventListener('novaNotificacao', handleNovaNotificacao)
      clearInterval(intervalId)
    }
  }, [user?.id, fetchNotificacoesNaoLidas])

  return (
    <audio ref={audioRef} src={notificationSound} preload="auto" />
  )
}

export default NotificationSound

