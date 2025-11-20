import React, { useState, useEffect } from 'react'
import ListBase from './ListBase'
import EditButton from '../buttons/EditButton'
import StatusButton from '../buttons/StatusButton'
import DeleteButton from '../buttons/DeleteButton'
import AddButton from '../buttons/AddButton'
import FormCliente from '../forms/FormCliente'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useModal } from '../../contexts/ModalContext'
import { getCachedData, setCachedData } from '../../hooks/useCache'

const ListClientes = () => {
  const { user, loading: authLoading } = useAuth()
  const { openModal } = useModal()
  const [clientesData, setClientesData] = useState(() => {
    // Carregar do cache imediatamente
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (estabelecimentoId) {
      return getCachedData(`clientes_${estabelecimentoId}`) || []
    }
    return []
  })

  useEffect(() => {
    // Se o auth ainda está carregando, aguardar
    if (authLoading) {
      return
    }

    // Verificar se user existe antes de acessar suas propriedades
    if (!user) {
      setClientesData([])
      return
    }

    // Obter estabelecimento_id (pode estar em user.estabelecimento_id ou user.estabelecimento.id)
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    
    // Se não tem estabelecimento_id, limpar dados
    if (!estabelecimentoId) {
      setClientesData([])
      return
    }

    // Carregar do cache primeiro
    const cachedData = getCachedData(`clientes_${estabelecimentoId}`)
    if (cachedData) {
      setClientesData(cachedData)
    }

    // Buscar clientes atualizados em background (sem mostrar loading)
    const fetchClientes = async () => {
      try {
        const url = `${API_URL}/api/auth/clientes?estabelecimento_id=${estabelecimentoId}`
        
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
        const clientes = data.clientes || data || []
        
        setClientesData(clientes)
        setCachedData(`clientes_${estabelecimentoId}`, clientes)
      } catch (error) {
        console.error('❌ Erro ao buscar clientes:', error)
        // Se houver erro e não tiver cache, manter array vazio
        const currentCache = getCachedData(`clientes_${estabelecimentoId}`)
        if (!currentCache) {
          setClientesData([])
        }
      }
    }

    fetchClientes()
  }, [user, authLoading])

  // Listener para atualizar após criar/editar cliente
  useEffect(() => {
    if (!user) return
    
    const estabelecimentoId = user.estabelecimento_id || user.estabelecimento?.id
    if (!estabelecimentoId) return

    const handleRefresh = async () => {
      console.log('🔄 Evento refreshClientes recebido, atualizando lista...')
      try {
        const response = await fetch(`${API_URL}/api/auth/clientes?estabelecimento_id=${estabelecimentoId}`)
        const data = await response.json()
        
        if (response.ok) {
          const clientes = data.clientes || data || []
          setClientesData(clientes)
          setCachedData(`clientes_${estabelecimentoId}`, clientes)
        }
      } catch (error) {
        console.error('❌ Erro ao atualizar clientes:', error)
      }
    }

    const handleAddCliente = (event) => {
      const novoCliente = event.detail;
      const estabelecimentoId = user.estabelecimento_id || user.estabelecimento?.id
      // Adicionar novo cliente na lista e atualizar cache
      setClientesData(prev => {
        const updated = [...prev, novoCliente].sort((a, b) => a.nome.localeCompare(b.nome))
        if (estabelecimentoId) {
          setCachedData(`clientes_${estabelecimentoId}`, updated)
        }
        return updated
      })
    };

    const handleClienteAtualizado = (event) => {
      const clienteAtualizado = event.detail;
      const estabelecimentoId = user.estabelecimento_id || user.estabelecimento?.id
      // Atualizar cliente na lista e cache
      setClientesData(prev => {
        const updated = prev.map(c => c.id === clienteAtualizado.id ? clienteAtualizado : c)
        if (estabelecimentoId) {
          setCachedData(`clientes_${estabelecimentoId}`, updated)
        }
        return updated
      })
    };

    window.addEventListener('refreshClientes', handleRefresh)
    window.addEventListener('addCliente', handleAddCliente)
    window.addEventListener('clienteAtualizado', handleClienteAtualizado)
    return () => {
      window.removeEventListener('refreshClientes', handleRefresh)
      window.removeEventListener('addCliente', handleAddCliente)
      window.removeEventListener('clienteAtualizado', handleClienteAtualizado)
    }
  }, [user])

  // Função para alterar status do cliente
  const handleToggleStatus = async (cliente) => {
    const novoStatus = cliente.status === 'Ativo' ? 'Inativo' : 'Ativo'
    
    try {
      const response = await fetch(`${API_URL}/api/auth/clientes/${cliente.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: novoStatus
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log(`✅ Cliente ${novoStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`)
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        // Atualizar status na lista local e cache
        const updated = clientesData.map(c => c.id === cliente.id ? { ...c, status: novoStatus } : c)
        setClientesData(updated)
        if (estabelecimentoId) {
          setCachedData(`clientes_${estabelecimentoId}`, updated)
        }
      } else {
        console.error('❌ Erro ao alterar status:', data.error)
        alert(data.error || 'Erro ao alterar status do cliente')
      }
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error)
      alert('Erro de conexão. Tente novamente.')
    }
  }

  // Função para editar cliente
  const handleEditCliente = (cliente) => {
    openModal(<FormCliente cliente={cliente} onSave={(clienteAtualizado) => {
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      // Atualizar cliente na lista local e cache
      const updated = clientesData.map(c => c.id === clienteAtualizado.id ? clienteAtualizado : c)
      setClientesData(updated)
      if (estabelecimentoId) {
        setCachedData(`clientes_${estabelecimentoId}`, updated)
      }
    }} />)
  }

  // Função para deletar cliente
  const handleDeleteCliente = async (clienteId) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/clientes/${clienteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Cliente deletado com sucesso!')
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        // Remover cliente da lista local e atualizar cache
        const updated = clientesData.filter(cliente => cliente.id !== clienteId)
        setClientesData(updated)
        if (estabelecimentoId) {
          setCachedData(`clientes_${estabelecimentoId}`, updated)
        }
      } else {
        console.error('❌ Erro ao deletar cliente:', data.error)
        alert(data.error || 'Erro ao deletar cliente')
      }
    } catch (error) {
      console.error('❌ Erro ao deletar cliente:', error)
      alert('Erro de conexão. Tente novamente.')
    }
  }

  // Função para formatar CPF/CNPJ
  const formatarCpfCnpj = (cpf, cnpj) => {
    if (cnpj) {
      return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    }
    if (cpf) {
      return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
    }
    return '-'
  }

  const columns = [
    { header: 'Cliente', key: 'nome' },
    { header: 'CPF/CNPJ', key: 'cpfCnpj', render: (row) => formatarCpfCnpj(row.cpf, row.cnpj) },
    { header: 'WhatsApp', key: 'whatsapp' },
    { header: 'E-mail', key: 'email' },
    { header: 'Ações', key: 'acoes', render: (row) => (
      <div className="flex space-x-2">
        <StatusButton isActive={row.status === 'Ativo'} onClick={() => handleToggleStatus(row)} />
        <EditButton onClick={() => handleEditCliente(row)} />
        <DeleteButton onClick={() => handleDeleteCliente(row.id)} />
      </div>
    )}
  ]


  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
        <AddButton modalContent={<FormCliente onSave={(novoCliente) => {
          const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
          // Adicionar novo cliente na lista local e atualizar cache
          const updated = [...clientesData, novoCliente].sort((a, b) => a.nome.localeCompare(b.nome))
          setClientesData(updated)
          if (estabelecimentoId) {
            setCachedData(`clientes_${estabelecimentoId}`, updated)
          }
        }} />}>Novo Cliente</AddButton>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden h-[90%] md:h-full">
        <ListBase 
          columns={columns} 
          data={clientesData}
          emptyMessage="Nenhum cliente encontrado"
          className="h-full"
        />
      </div>
    </div>
  )
}

export default ListClientes