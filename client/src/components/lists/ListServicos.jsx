import React, { useState, useEffect } from 'react'
import ListBase from './ListBase'
import EditButton from '../buttons/EditButton'
import StatusButton from '../buttons/StatusButton'
import DeleteButton from '../buttons/DeleteButton'
import FormServico from '../forms/FormServico'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useModal } from '../../contexts/ModalContext'
import { getCachedData, setCachedData } from '../../hooks/useCache'

const ListServicos = () => {
  const { user } = useAuth()
  const { openModal } = useModal()
  const [servicosData, setServicosData] = useState(() => {
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (estabelecimentoId) {
      const cached = getCachedData(`servicos_${estabelecimentoId}`)
      if (cached) {
        return cached.transformed || []
      }
    }
    return []
  })
  
  // Manter serviços originais da API para edição
  const [servicosOriginais, setServicosOriginais] = useState(() => {
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (estabelecimentoId) {
      const cached = getCachedData(`servicos_${estabelecimentoId}`)
      if (cached) {
        return cached.original || []
      }
    }
    return []
  })

  // Função para formatar tempo de serviço
  const formatarTempoServico = (minutos) => {
    if (!minutos) return '-'
    if (minutos < 60) {
      return `${minutos} min`
    }
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    if (mins === 0) {
      return `${horas}h`
    }
    return `${horas}h ${mins}min`
  }

  // Função para transformar serviço da API para o formato esperado
  const transformServico = (servico) => ({
    id: servico.id,
    servico: servico.nome,
    categoria: servico.categoria_nome || 'Sem categoria',
    valor: parseFloat(servico.preco) || 0,
    tempoServico: formatarTempoServico(servico.tempo_servico),
    status: servico.status === 'Ativo'
  })

  useEffect(() => {
    if (!user) return

    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (!estabelecimentoId) return

    // Carregar do cache primeiro
    const cached = getCachedData(`servicos_${estabelecimentoId}`)
    if (cached) {
      setServicosOriginais(cached.original || [])
      setServicosData(cached.transformed || [])
    }

    // Buscar serviços atualizados em background
    const fetchServicos = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/servicos?estabelecimento_id=${estabelecimentoId}`)
        
        let data
        try {
          data = await response.json()
        } catch (jsonError) {
          const text = await response.text()
          console.error('❌ Resposta não é JSON:', text)
          return
        }

        if (response.ok) {
          const original = data.servicos || []
          const transformed = original.map(transformServico)
          
          setServicosOriginais(original)
          setServicosData(transformed)
          setCachedData(`servicos_${estabelecimentoId}`, { original, transformed })
        } else {
          console.error('Erro ao buscar serviços:', data.error)
        }
      } catch (error) {
        console.error('Erro ao buscar serviços:', error)
        const currentCache = getCachedData(`servicos_${estabelecimentoId}`)
        if (!currentCache) {
          setServicosOriginais([])
          setServicosData([])
        }
      }
    }

    fetchServicos()
  }, [user])

  // Escutar eventos de atualização
  useEffect(() => {
    if (!user) return

    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (!estabelecimentoId) return

    const handleAddServico = (event) => {
      const novoServico = event.detail.servico || event.detail;
      setServicosOriginais(prev => {
        const updatedOriginal = [...prev, novoServico]
        setServicosData(prevData => {
          const updatedTransformed = [...prevData, transformServico(novoServico)].sort((a, b) => a.servico.localeCompare(b.servico))
          setCachedData(`servicos_${estabelecimentoId}`, { original: updatedOriginal, transformed: updatedTransformed })
          return updatedTransformed
        })
        return updatedOriginal
      })
    }

    const handleUpdateServico = (event) => {
      const servicoAtualizado = event.detail.servico || event.detail;
      setServicosOriginais(prev => {
        const updatedOriginal = prev.map(s => s.id === servicoAtualizado.id ? servicoAtualizado : s)
        setServicosData(prevData => {
          const updatedTransformed = prevData.map(s => s.id === servicoAtualizado.id ? transformServico(servicoAtualizado) : s)
          setCachedData(`servicos_${estabelecimentoId}`, { original: updatedOriginal, transformed: updatedTransformed })
          return updatedTransformed
        })
        return updatedOriginal
      })
    }

    const handleServicoCriado = (event) => {
      const novoServico = event.detail.servico || event.detail;
      setServicosOriginais(prev => {
        const updatedOriginal = [...prev, novoServico]
        setServicosData(prevData => {
          const updatedTransformed = [...prevData, transformServico(novoServico)].sort((a, b) => a.servico.localeCompare(b.servico))
          setCachedData(`servicos_${estabelecimentoId}`, { original: updatedOriginal, transformed: updatedTransformed })
          return updatedTransformed
        })
        return updatedOriginal
      })
    }

    window.addEventListener('addServico', handleAddServico);
    window.addEventListener('servicoAtualizado', handleUpdateServico);
    window.addEventListener('servicoCriado', handleServicoCriado);

    return () => {
      window.removeEventListener('addServico', handleAddServico);
      window.removeEventListener('servicoAtualizado', handleUpdateServico);
      window.removeEventListener('servicoCriado', handleServicoCriado);
    };
  }, [user])

  // Função para alterar status do serviço
  const handleToggleStatus = async (servicoItem) => {
    // Buscar serviço original
    const servicoOriginal = servicosOriginais.find(s => transformServico(s).id === servicoItem.id)
    if (!servicoOriginal) return

    const novoStatus = servicoOriginal.status === 'Ativo' ? 'Inativo' : 'Ativo'
    
    try {
      const response = await fetch(`${API_URL}/api/auth/servicos/${servicoItem.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: novoStatus
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log(`✅ Serviço ${novoStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`)
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        const updatedOriginal = servicosOriginais.map(s => s.id === servicoOriginal.id ? { ...s, status: novoStatus } : s)
        const updatedTransformed = servicosData.map(s => s.id === servicoItem.id ? { ...s, status: novoStatus === 'Ativo' } : s)
        setServicosOriginais(updatedOriginal)
        setServicosData(updatedTransformed)
        if (estabelecimentoId) {
          setCachedData(`servicos_${estabelecimentoId}`, { original: updatedOriginal, transformed: updatedTransformed })
        }
      } else {
        console.error('❌ Erro ao alterar status:', data.error)
        alert(data.error || 'Erro ao alterar status do serviço')
      }
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error)
      alert('Erro de conexão. Tente novamente.')
    }
  }

  // Função para editar serviço
  const handleEditServico = (servicoItem) => {
    // Buscar serviço original
    const servicoOriginal = servicosOriginais.find(s => transformServico(s).id === servicoItem.id)
    if (!servicoOriginal) return

    openModal(
      <FormServico 
        servico={servicoOriginal} 
        onSave={(servicoAtualizado) => {
          const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
          const updatedOriginal = servicosOriginais.map(s => s.id === servicoAtualizado.id ? servicoAtualizado : s)
          const updatedTransformed = servicosData.map(s => s.id === servicoItem.id ? transformServico(servicoAtualizado) : s)
          setServicosOriginais(updatedOriginal)
          setServicosData(updatedTransformed)
          if (estabelecimentoId) {
            setCachedData(`servicos_${estabelecimentoId}`, { original: updatedOriginal, transformed: updatedTransformed })
          }
        }} 
      />
    )
  }

  const columns = [
    { header: 'Serviço', key: 'servico' },
    { header: 'Categoria', key: 'categoria' },
    { header: 'Valor', key: 'valor', render: (row) => `R$ ${row.valor.toFixed(2)}` },
    { header: 'Tempo', key: 'tempoServico' },
    { header: 'Ações', key: 'acoes', render: (row) => (
      <div className="flex space-x-2">
        <StatusButton isActive={row.status} onClick={() => handleToggleStatus(row)} />
        <EditButton onClick={() => handleEditServico(row)} />
        <DeleteButton onClick={() => console.log('Excluir serviço:', row.id)} />
      </div>
    )}
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden h-[90%] md:h-full">
        <ListBase 
          columns={columns} 
          data={servicosData}
          emptyMessage="Nenhum serviço encontrado"
          className="h-full"
        />
      </div>
    </div>
  )
}

export default ListServicos
