import React, { useState, useEffect } from 'react'
import ListBase from './ListBase'
import EditButton from '../buttons/EditButton'
import StatusButton from '../buttons/StatusButton'
import DeleteButton from '../buttons/DeleteButton'
import AddButton from '../buttons/AddButton'
import FormVeiculo from '../forms/FormVeiculo'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useModal } from '../../contexts/ModalContext'
import { getCachedData, setCachedData } from '../../hooks/useCache'

const ListVeiculos = () => {
  const { user, loading: authLoading } = useAuth()
  const { openModal } = useModal()
  const [veiculosData, setVeiculosData] = useState(() => {
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (estabelecimentoId) {
      return getCachedData(`veiculos_${estabelecimentoId}`) || []
    }
    return []
  })

  useEffect(() => {
    // Se o auth ainda está carregando, aguardar
    if (authLoading) {
      return
    }

    if (!user) {
      setVeiculosData([])
      return
    }

    const estabelecimentoId = user.estabelecimento_id || user.estabelecimento?.id
    
    if (!estabelecimentoId) {
      setVeiculosData([])
      return
    }

    // Carregar do cache primeiro
    const cachedData = getCachedData(`veiculos_${estabelecimentoId}`)
    if (cachedData) {
      setVeiculosData(cachedData)
    }

    // Buscar veículos atualizados em background
    const fetchVeiculos = async () => {
      try {
        const url = `${API_URL}/api/auth/veiculos?estabelecimento_id=${estabelecimentoId}`
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Erro desconhecido'}`)
        }

        const data = await response.json()
        const veiculos = data.veiculos || data || []
        
        setVeiculosData(veiculos)
        setCachedData(`veiculos_${estabelecimentoId}`, veiculos)
      } catch (error) {
        console.error('❌ Erro ao buscar veículos:', error)
        const currentCache = getCachedData(`veiculos_${estabelecimentoId}`)
        if (!currentCache) {
          setVeiculosData([])
        }
      }
    }

    fetchVeiculos()
  }, [user, authLoading])

  // Listener para atualizar após criar/editar veículo
  useEffect(() => {
    if (!user) return
    
    const estabelecimentoId = user.estabelecimento_id || user.estabelecimento?.id
    if (!estabelecimentoId) return

    const handleRefresh = async () => {
      console.log('🔄 Evento refreshVeiculos recebido, atualizando lista...')
      try {
        const response = await fetch(`${API_URL}/api/auth/veiculos?estabelecimento_id=${estabelecimentoId}`)
        const data = await response.json()
        
        if (response.ok) {
          const veiculos = data.veiculos || data || []
          setVeiculosData(veiculos)
          setCachedData(`veiculos_${estabelecimentoId}`, veiculos)
        }
      } catch (error) {
        console.error('❌ Erro ao atualizar veículos:', error)
      }
    }

    const handleAddVeiculo = (event) => {
      const novoVeiculo = event.detail;
      const estabelecimentoId = user.estabelecimento_id || user.estabelecimento?.id
      setVeiculosData(prev => {
        const updated = [...prev, novoVeiculo].sort((a, b) => a.placa.localeCompare(b.placa))
        if (estabelecimentoId) {
          setCachedData(`veiculos_${estabelecimentoId}`, updated)
        }
        return updated
      })
    };

    const handleVeiculoAtualizado = (event) => {
      const veiculoAtualizado = event.detail;
      const estabelecimentoId = user.estabelecimento_id || user.estabelecimento?.id
      setVeiculosData(prev => {
        const updated = prev.map(v => v.id === veiculoAtualizado.id ? veiculoAtualizado : v)
        if (estabelecimentoId) {
          setCachedData(`veiculos_${estabelecimentoId}`, updated)
        }
        return updated
      })
    };

    window.addEventListener('refreshVeiculos', handleRefresh)
    window.addEventListener('addVeiculo', handleAddVeiculo)
    window.addEventListener('veiculoAtualizado', handleVeiculoAtualizado)
    return () => {
      window.removeEventListener('refreshVeiculos', handleRefresh)
      window.removeEventListener('addVeiculo', handleAddVeiculo)
      window.removeEventListener('veiculoAtualizado', handleVeiculoAtualizado)
    }
  }, [user])

  // Função para alterar status do veículo
  const handleToggleStatus = async (veiculo) => {
    const novoStatus = veiculo.status === 'Ativo' ? 'Inativo' : 'Ativo'
    
    try {
      const response = await fetch(`${API_URL}/api/auth/veiculos/${veiculo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: novoStatus }),
      })

      const data = await response.json()

      if (response.ok) {
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        const updated = veiculosData.map(v => v.id === veiculo.id ? { ...v, status: novoStatus } : v)
        setVeiculosData(updated)
        if (estabelecimentoId) {
          setCachedData(`veiculos_${estabelecimentoId}`, updated)
        }
      } else {
        console.error('❌ Erro ao alterar status:', data.error)
        alert(data.error || 'Erro ao alterar status do veículo')
      }
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error)
      alert('Erro de conexão. Tente novamente.')
    }
  }

  // Função para editar veículo
  const handleEditVeiculo = (veiculo) => {
    openModal(<FormVeiculo veiculo={veiculo} onSave={(veiculoAtualizado) => {
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      const updated = veiculosData.map(v => v.id === veiculoAtualizado.id ? veiculoAtualizado : v)
      setVeiculosData(updated)
      if (estabelecimentoId) {
        setCachedData(`veiculos_${estabelecimentoId}`, updated)
      }
    }} />)
  }

  // Função para deletar veículo
  const handleDeleteVeiculo = async (veiculoId) => {
    if (!window.confirm('Tem certeza que deseja excluir este veículo?')) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/veiculos/${veiculoId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Veículo deletado com sucesso!')
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        const updated = veiculosData.filter(v => v.id !== veiculoId)
        setVeiculosData(updated)
        if (estabelecimentoId) {
          setCachedData(`veiculos_${estabelecimentoId}`, updated)
        }
      } else {
        console.error('❌ Erro ao deletar veículo:', data.error)
        alert(data.error || 'Erro ao deletar veículo')
      }
    } catch (error) {
      console.error('❌ Erro ao deletar veículo:', error)
      alert('Erro de conexão. Tente novamente.')
    }
  }

  const columns = [
    { header: 'Veículo', key: 'veiculoDescricao', render: (row) => `${row.marca} ${row.modelo}` },
    { header: 'Cliente', key: 'cliente_nome' },
    { header: 'Placa', key: 'placa' },
    { header: 'Ano', key: 'ano' },
    { header: 'Cor', key: 'cor' },
    { header: 'Ações', key: 'acoes', render: (row) => (
      <div className="flex space-x-2">
        <StatusButton isActive={row.status === 'Ativo'} onClick={() => handleToggleStatus(row)} />
        <EditButton onClick={() => handleEditVeiculo(row)} />
        <DeleteButton onClick={() => handleDeleteVeiculo(row.id)} />
      </div>
    )}
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">Veículos</h2>
        <AddButton modalContent={<FormVeiculo onSave={(novoVeiculo) => {
          const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
          const updated = [...veiculosData, novoVeiculo].sort((a, b) => a.placa.localeCompare(b.placa))
          setVeiculosData(updated)
          if (estabelecimentoId) {
            setCachedData(`veiculos_${estabelecimentoId}`, updated)
          }
        }} />}>Novo Veículo</AddButton>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden h-[90%] md:h-full">
        <ListBase 
          columns={columns} 
          data={veiculosData}
          emptyMessage="Nenhum veículo encontrado"
          className="h-full"
        />
      </div>
    </div>
  )
}

export default ListVeiculos