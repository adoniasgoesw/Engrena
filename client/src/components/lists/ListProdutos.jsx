import React, { useState, useEffect } from 'react'
import ListBase from './ListBase'
import EditButton from '../buttons/EditButton'
import StatusButton from '../buttons/StatusButton'
import DeleteButton from '../buttons/DeleteButton'
import FormProduto from '../forms/FormProduto'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useModal } from '../../contexts/ModalContext'
import { getCachedData, setCachedData } from '../../hooks/useCache'

const ListProdutos = () => {
  const { user } = useAuth()
  const { openModal } = useModal()
  const [produtosData, setProdutosData] = useState(() => {
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (estabelecimentoId) {
      const cached = getCachedData(`produtos_${estabelecimentoId}`)
      if (cached) {
        return cached.transformed || []
      }
    }
    return []
  })
  
  // Manter produtos originais da API para edição
  const [produtosOriginais, setProdutosOriginais] = useState(() => {
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (estabelecimentoId) {
      const cached = getCachedData(`produtos_${estabelecimentoId}`)
      if (cached) {
        return cached.original || []
      }
    }
    return []
  })

  // Função para transformar produto da API para o formato esperado
  const transformProduto = (produto) => ({
    id: produto.id,
    produto: produto.nome,
    categoria: produto.categoria_nome || 'Sem categoria',
    valor: parseFloat(produto.preco) || 0,
    estoque: produto.estoque || 0,
    status: produto.status === 'Ativo'
  })

  useEffect(() => {
    if (!user) return

    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (!estabelecimentoId) return

    // Carregar do cache primeiro
    const cached = getCachedData(`produtos_${estabelecimentoId}`)
    if (cached) {
      setProdutosOriginais(cached.original || [])
      setProdutosData(cached.transformed || [])
    }

    // Buscar produtos atualizados em background
    const fetchProdutos = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/produtos?estabelecimento_id=${estabelecimentoId}`)
        
        let data
        try {
          data = await response.json()
        } catch (jsonError) {
          const text = await response.text()
          console.error('❌ Resposta não é JSON:', text)
          return
        }

        if (response.ok) {
          const original = data.produtos || []
          const transformed = original.map(transformProduto)
          
          setProdutosOriginais(original)
          setProdutosData(transformed)
          setCachedData(`produtos_${estabelecimentoId}`, { original, transformed })
        } else {
          console.error('Erro ao buscar produtos:', data.error)
        }
      } catch (error) {
        console.error('Erro ao buscar produtos:', error)
        const currentCache = getCachedData(`produtos_${estabelecimentoId}`)
        if (!currentCache) {
          setProdutosOriginais([])
          setProdutosData([])
        }
      }
    }

    fetchProdutos()
  }, [user])

  // Escutar eventos de atualização
  useEffect(() => {
    if (!user) return

    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (!estabelecimentoId) return

    const handleAddProduto = (event) => {
      const novoProduto = event.detail.produto || event.detail;
      setProdutosOriginais(prev => {
        const updatedOriginal = [...prev, novoProduto]
        setProdutosData(prevData => {
          const updatedTransformed = [...prevData, transformProduto(novoProduto)].sort((a, b) => a.produto.localeCompare(b.produto))
          setCachedData(`produtos_${estabelecimentoId}`, { original: updatedOriginal, transformed: updatedTransformed })
          return updatedTransformed
        })
        return updatedOriginal
      })
    }

    const handleUpdateProduto = (event) => {
      const produtoAtualizado = event.detail.produto || event.detail;
      setProdutosOriginais(prev => {
        const updatedOriginal = prev.map(p => p.id === produtoAtualizado.id ? produtoAtualizado : p)
        setProdutosData(prevData => {
          const updatedTransformed = prevData.map(p => p.id === produtoAtualizado.id ? transformProduto(produtoAtualizado) : p)
          setCachedData(`produtos_${estabelecimentoId}`, { original: updatedOriginal, transformed: updatedTransformed })
          return updatedTransformed
        })
        return updatedOriginal
      })
    }

    const handleProdutoCriado = (event) => {
      const novoProduto = event.detail.produto || event.detail;
      setProdutosOriginais(prev => {
        const updatedOriginal = [...prev, novoProduto]
        setProdutosData(prevData => {
          const updatedTransformed = [...prevData, transformProduto(novoProduto)].sort((a, b) => a.produto.localeCompare(b.produto))
          setCachedData(`produtos_${estabelecimentoId}`, { original: updatedOriginal, transformed: updatedTransformed })
          return updatedTransformed
        })
        return updatedOriginal
      })
    }

    window.addEventListener('addProduto', handleAddProduto);
    window.addEventListener('produtoAtualizado', handleUpdateProduto);
    window.addEventListener('produtoCriado', handleProdutoCriado);

    return () => {
      window.removeEventListener('addProduto', handleAddProduto);
      window.removeEventListener('produtoAtualizado', handleUpdateProduto);
      window.removeEventListener('produtoCriado', handleProdutoCriado);
    };
  }, [user])

  // Função para alterar status do produto
  const handleToggleStatus = async (produtoItem) => {
    // Buscar produto original
    const produtoOriginal = produtosOriginais.find(p => transformProduto(p).id === produtoItem.id)
    if (!produtoOriginal) return

    const novoStatus = produtoOriginal.status === 'Ativo' ? 'Inativo' : 'Ativo'
    
    try {
      const response = await fetch(`${API_URL}/api/auth/produtos/${produtoItem.id}/status`, {
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
        console.log(`✅ Produto ${novoStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`)
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        const updatedOriginal = produtosOriginais.map(p => p.id === produtoOriginal.id ? { ...p, status: novoStatus } : p)
        const updatedTransformed = produtosData.map(p => p.id === produtoItem.id ? { ...p, status: novoStatus === 'Ativo' } : p)
        setProdutosOriginais(updatedOriginal)
        setProdutosData(updatedTransformed)
        if (estabelecimentoId) {
          setCachedData(`produtos_${estabelecimentoId}`, { original: updatedOriginal, transformed: updatedTransformed })
        }
      } else {
        console.error('❌ Erro ao alterar status:', data.error)
        alert(data.error || 'Erro ao alterar status do produto')
      }
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error)
      alert('Erro de conexão. Tente novamente.')
    }
  }

  // Função para editar produto
  const handleEditProduto = (produtoItem) => {
    // Buscar produto original
    const produtoOriginal = produtosOriginais.find(p => transformProduto(p).id === produtoItem.id)
    if (!produtoOriginal) return

    openModal(
      <FormProduto 
        produto={produtoOriginal} 
        onSave={(produtoAtualizado) => {
          const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
          const updatedOriginal = produtosOriginais.map(p => p.id === produtoAtualizado.id ? produtoAtualizado : p)
          const updatedTransformed = produtosData.map(p => p.id === produtoItem.id ? transformProduto(produtoAtualizado) : p)
          setProdutosOriginais(updatedOriginal)
          setProdutosData(updatedTransformed)
          if (estabelecimentoId) {
            setCachedData(`produtos_${estabelecimentoId}`, { original: updatedOriginal, transformed: updatedTransformed })
          }
        }} 
      />
    )
  }

  const columns = [
    { header: 'Produto', key: 'produto' },
    { header: 'Categoria', key: 'categoria' },
    { header: 'Valor', key: 'valor', render: (row) => `R$ ${row.valor.toFixed(2)}` },
    { header: 'Estoque', key: 'estoque', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.estoque === 0 ? 'bg-red-100 text-red-800' : 
        row.estoque < 10 ? 'bg-yellow-100 text-yellow-800' : 
        'bg-green-100 text-green-800'
      }`}>
        {row.estoque} unidades
      </span>
    )},
    { header: 'Ações', key: 'acoes', render: (row) => (
      <div className="flex space-x-2">
        <StatusButton isActive={row.status} onClick={() => handleToggleStatus(row)} />
        <EditButton onClick={() => handleEditProduto(row)} />
        <DeleteButton onClick={() => console.log('Excluir produto:', row.id)} />
      </div>
    )}
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden h-[90%] md:h-full">
        <ListBase
          columns={columns}
          data={produtosData}
          emptyMessage="Nenhum produto encontrado"
          className="h-full"
        />
      </div>
    </div>
  )
}

export default ListProdutos
