import React, { useEffect, useState } from 'react'
import ListBase from './ListBase'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import AddButton from '../buttons/AddButton'
import FormUsuario from '../forms/FormUsuario'
import StatusButton from '../buttons/StatusButton'
import EditButton from '../buttons/EditButton'
import DeleteButton from '../buttons/DeleteButton'
import { getCachedData, setCachedData } from '../../hooks/useCache'

const ListUsuarios = () => {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState(() => {
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (estabelecimentoId) {
      return getCachedData(`usuarios_${estabelecimentoId}`) || []
    }
    return []
  })

  useEffect(() => {
    if (!user) return

    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (!estabelecimentoId) {
      setUsuarios([])
      return
    }

    // Carregar do cache primeiro
    const cached = getCachedData(`usuarios_${estabelecimentoId}`)
    if (cached) {
      setUsuarios(cached)
    }

    // Buscar usuários atualizados em background
    const fetchUsuarios = async () => {
      try {
        const resp = await fetch(`${API_URL}/api/auth/usuarios?estabelecimento_id=${estabelecimentoId}`)
        const data = await resp.json()
        if (resp.ok) {
          const usuariosData = data.usuarios || data || []
          setUsuarios(usuariosData)
          setCachedData(`usuarios_${estabelecimentoId}`, usuariosData)
        }
      } catch (e) {
        console.error('Erro ao buscar usuários:', e)
        const currentCache = getCachedData(`usuarios_${estabelecimentoId}`)
        if (!currentCache) {
          setUsuarios([])
        }
      }
    }
    fetchUsuarios()
  }, [user])

  // Escutar eventos de atualização
  useEffect(() => {
    if (!user) return

    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (!estabelecimentoId) return

    const handleAddUsuario = (event) => {
      const novoUsuario = event.detail;
      setUsuarios(prev => {
        const updated = [...prev, novoUsuario]
        setCachedData(`usuarios_${estabelecimentoId}`, updated)
        return updated
      })
    }

    const handleUsuarioAtualizado = (event) => {
      const usuarioAtualizado = event.detail;
      setUsuarios(prev => {
        const updated = prev.map(u => u.id === usuarioAtualizado.id ? usuarioAtualizado : u)
        setCachedData(`usuarios_${estabelecimentoId}`, updated)
        return updated
      })
    }

    window.addEventListener('addUsuario', handleAddUsuario);
    window.addEventListener('usuarioAtualizado', handleUsuarioAtualizado);

    return () => {
      window.removeEventListener('addUsuario', handleAddUsuario);
      window.removeEventListener('usuarioAtualizado', handleUsuarioAtualizado);
    };
  }, [user])

  const handleToggleStatus = async (usuario) => {
    const novoStatus = usuario.status === 'Ativo' ? 'Inativo' : 'Ativo'
    try {
      const resp = await fetch(`${API_URL}/api/auth/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      })
      const data = await resp.json()
      if (resp.ok) {
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        const updated = usuarios.map(u => u.id === usuario.id ? { ...u, status: novoStatus } : u)
        setUsuarios(updated)
        if (estabelecimentoId) {
          setCachedData(`usuarios_${estabelecimentoId}`, updated)
        }
      } else {
        console.error('Erro ao alterar status:', data?.error)
      }
    } catch (e) {
      console.error('Erro ao alterar status:', e)
    }
  }

  const handleEditUsuario = (usuario) => {
    window.dispatchEvent(new CustomEvent('openModal'))
  }

  const handleDeleteUsuario = async (usuarioId) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return
    try {
      const resp = await fetch(`${API_URL}/api/auth/usuarios/${usuarioId}`, { method: 'DELETE' })
      const data = await resp.json().catch(() => ({}))
      if (resp.ok) {
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        const updated = usuarios.filter(u => u.id !== usuarioId)
        setUsuarios(updated)
        if (estabelecimentoId) {
          setCachedData(`usuarios_${estabelecimentoId}`, updated)
        }
      } else {
        console.error('Erro ao excluir usuário:', data?.error)
      }
    } catch (e) {
      console.error('Erro ao excluir usuário:', e)
    }
  }

  const columns = [
    { header: 'Nome', key: 'nome' },
    { header: 'E-mail', key: 'email' },
    { header: 'WhatsApp', key: 'whatsapp' },
    { header: 'Cargo', key: 'cargo', render: (row) => (row.cargo === 'Proprietário' ? 'Administrador' : row.cargo) },
    { header: 'Ações', key: 'acoes', render: (row) => (
      <div className="flex space-x-2">
        <StatusButton isActive={row.status === 'Ativo'} onClick={() => handleToggleStatus(row)} />
        <EditButton onClick={() => {
          window.dispatchEvent(new CustomEvent('openModal', { detail: {
            content: (
              <FormUsuario usuario={row} onSave={(atual) => {
                const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
                const updated = usuarios.map(u => u.id === atual.id ? atual : u)
                setUsuarios(updated)
                if (estabelecimentoId) {
                  setCachedData(`usuarios_${estabelecimentoId}`, updated)
                }
              }} />
            )
          }}))
        }} />
        <DeleteButton onClick={() => handleDeleteUsuario(row.id)} />
      </div>
    ) },
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">Usuários</h2>
        <AddButton modalContent={<FormUsuario onSave={(novo) => {
          const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
          const updated = [...usuarios, novo]
          setUsuarios(updated)
          if (estabelecimentoId) {
            setCachedData(`usuarios_${estabelecimentoId}`, updated)
          }
        }} />}>
          Novo Usuário
        </AddButton>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden h-[90%] md:h-full">
        <ListBase
          columns={columns}
          data={usuarios}
          emptyMessage="Nenhum usuário encontrado"
          className="h-full"
        />
      </div>
    </div>
  )
}

export default ListUsuarios


