import React, { useState, useEffect, useMemo } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { Heart } from 'lucide-react'

const ProdutosServicosGrid = ({ categoriaId, ordemId }) => {
  const { user } = useAuth()
  const [produtos, setProdutos] = useState([])
  const [servicos, setServicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [favoritos, setFavoritos] = useState(new Set())
  const [itensAdicionados, setItensAdicionados] = useState(new Set())
  const [quantidades, setQuantidades] = useState(new Map()) // Map<itemId, quantidade>

  const toggleFavorito = (itemId) => {
    setFavoritos(prev => {
      const novo = new Set(prev)
      if (novo.has(itemId)) {
        novo.delete(itemId)
      } else {
        novo.add(itemId)
      }
      return novo
    })
  }

  useEffect(() => {
    const fetchItens = async () => {
      if (!user || !categoriaId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        
        if (!estabelecimentoId) {
          setLoading(false)
          return
        }

        // Buscar produtos e serviços
        const [produtosResponse, servicosResponse] = await Promise.all([
          fetch(`${API_URL}/api/auth/produtos?estabelecimento_id=${estabelecimentoId}`),
          fetch(`${API_URL}/api/auth/servicos?estabelecimento_id=${estabelecimentoId}`)
        ])

        const produtosData = await produtosResponse.json()
        const servicosData = await servicosResponse.json()

        if (produtosResponse.ok && produtosData.produtos) {
          // Filtrar apenas produtos ativos da categoria selecionada
          const produtosFiltrados = produtosData.produtos.filter(
            p => String(p.categoria_id) === String(categoriaId) && p.status === 'Ativo'
          )
          setProdutos(produtosFiltrados)
        }

        if (servicosResponse.ok && servicosData.servicos) {
          // Filtrar apenas serviços ativos da categoria selecionada
          const servicosFiltrados = servicosData.servicos.filter(
            s => String(s.categoria_id) === String(categoriaId) && s.status === 'Ativo'
          )
          setServicos(servicosFiltrados)
        }
      } catch (error) {
        console.error('Erro ao buscar itens:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchItens()
  }, [user, categoriaId])

  // Buscar itens já adicionados à ordem
  useEffect(() => {
    if (!ordemId || (produtos.length === 0 && servicos.length === 0)) return
    
    const fetchItensOrdem = async () => {
      try {
        const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/itens`)
        const data = await resp.json()
        if (resp.ok && data.itens) {
          const itensIds = new Set(data.itens.map(i => i.item_id))
          setItensAdicionados(itensIds)
          
          // Atualizar quantidades baseado nos itens já adicionados
          const quantidadesMap = new Map()
          data.itens.forEach(it => {
            // Verificar se é produto pelo item_tipo da resposta ou se está na lista de produtos
            const isProduto = it.item_tipo === 'produto' || produtos.find(p => p.id === it.item_id)
            if (isProduto) {
              // Usar a quantidade do item na ordem (agora é acumulada pela API)
              quantidadesMap.set(it.item_id, Number(it.quantidade) || 1)
            }
          })
          setQuantidades(quantidadesMap)
        }
      } catch (error) {
        console.error('Erro ao buscar itens da ordem:', error)
      }
    }
    
    fetchItensOrdem()

    // Escutar eventos de adição/remoção de itens
    const handleItemChange = () => {
      fetchItensOrdem()
    }

    // Escutar quando item é removido para atualizar contadores
    const handleItemRemovido = () => {
      fetchItensOrdem()
    }

    window.addEventListener('itemAdicionado', handleItemChange)
    window.addEventListener('itemRemovido', handleItemRemovido)

    return () => {
      window.removeEventListener('itemAdicionado', handleItemChange)
      window.removeEventListener('itemRemovido', handleItemRemovido)
    }
  }, [ordemId, produtos, servicos])

  // Estado para controlar requisições em andamento
  const [loadingItems, setLoadingItems] = useState(new Set())

  const handleAddItem = async (item) => {
    if (!ordemId) {
      console.error('Ordem ID não disponível')
      return
    }

    // Prevenir múltiplas requisições simultâneas para o mesmo item
    if (loadingItems.has(item.id)) {
      return // Já está processando este item
    }

    // Para serviços, verificar se já foi adicionado
    if (item.tipo === 'servico' && itensAdicionados.has(item.id)) {
      return // Serviço já adicionado, não pode adicionar novamente
    }

    // Marcar item como em processamento
    setLoadingItems(prev => new Set([...prev, item.id]))

    // Para produtos, incrementar contador
    if (item.tipo === 'produto') {
      const qtdAtual = quantidades.get(item.id) || 0
      setQuantidades(prev => {
        const novo = new Map(prev)
        novo.set(item.id, qtdAtual + 1)
        return novo
      })
    }

    try {
      // Sempre adiciona quantidade 1 por vez
      const resp = await fetch(`${API_URL}/api/auth/ordens/${ordemId}/itens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_id: item.id,
          quantidade: 1
        })
      })

      const data = await resp.json()

      if (resp.ok) {
        // Adicionar ao set de itens adicionados (apenas se ainda não estava)
        if (!itensAdicionados.has(item.id)) {
          setItensAdicionados(prev => new Set([...prev, item.id]))
        }
        
        // Disparar evento para atualizar a lista de itens imediatamente
        window.dispatchEvent(new CustomEvent('itemAdicionado', { detail: { item: data.item } }))
      } else {
        console.error('Erro ao adicionar item:', data.error)
        // Reverter contador em caso de erro
        if (item.tipo === 'produto') {
          setQuantidades(prev => {
            const novo = new Map(prev)
            const qtdAtual = novo.get(item.id) || 0
            if (qtdAtual > 0) {
              novo.set(item.id, qtdAtual - 1)
            }
            return novo
          })
        }
        alert(data.error || 'Erro ao adicionar item à ordem')
      }
    } catch (error) {
      console.error('Erro ao adicionar item:', error)
      // Reverter contador em caso de erro
      if (item.tipo === 'produto') {
        setQuantidades(prev => {
          const novo = new Map(prev)
          const qtdAtual = novo.get(item.id) || 0
          if (qtdAtual > 0) {
            novo.set(item.id, qtdAtual - 1)
          }
          return novo
        })
      }
      alert('Erro de conexão. Tente novamente.')
    } finally {
      // Remover item do estado de loading
      setLoadingItems(prev => {
        const novo = new Set(prev)
        novo.delete(item.id)
        return novo
      })
    }
  }

  // Combinar produtos e serviços (os dados já vêm com tipo da API)
  const itens = useMemo(() => {
    const produtosComTipo = produtos.map(p => ({ ...p, tipo: p.tipo || 'produto' }))
    const servicosComTipo = servicos.map(s => ({ ...s, tipo: s.tipo || 'servico' }))
    return [...produtosComTipo, ...servicosComTipo]
  }, [produtos, servicos])

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Carregando itens...</p>
      </div>
    )
  }

  if (itens.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhum produto ou serviço encontrado nesta categoria</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {itens.map((item) => {
          // Verificar se a imagem já é uma URL completa (começa com http) ou é apenas o nome do arquivo
          let imagemUrl = null
          
          if (item.imagem) {
            if (item.imagem.startsWith('http://') || item.imagem.startsWith('https://')) {
              // Já é uma URL completa (Cloudinary)
              imagemUrl = item.imagem
              } else {
              // Montar URL local - pode estar em itens ou no caminho completo
              // Primeiro tenta itens, depois apenas o arquivo
              imagemUrl = `${API_URL}/uploads/itens/${item.imagem}`
            }
          }

          const isServico = item.tipo === 'servico'
          const jaAdicionado = itensAdicionados.has(item.id)
          const isDisabled = isServico && jaAdicionado
          const quantidade = quantidades.get(item.id) || 0
          const mostrarContador = !isServico && quantidade > 0

          return (
            <div
              key={item.id}
              onClick={() => !isDisabled && handleAddItem(item)}
              className={`relative aspect-[3/4] rounded-lg border border-gray-100 shadow-md transition-all overflow-hidden bg-white flex flex-col ${
                isDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:shadow-lg hover:border-gray-200 cursor-pointer'
              }`}
            >
              {/* Contador de quantidade no topo (apenas para produtos) */}
              {mostrarContador && (
                <div className="absolute top-2 left-2 z-20 bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                  <span className="text-white text-xs font-bold">{quantidade}</span>
                </div>
              )}
              {/* Imagem */}
              <div className="flex-1 w-full overflow-hidden relative">
                {imagemUrl ? (
                  <img
                    src={imagemUrl}
                    alt={item.nome}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      const placeholder = e.target.parentElement.querySelector('.placeholder')
                      if (placeholder) placeholder.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-gray-200 flex items-center justify-center ${imagemUrl ? 'hidden' : ''} placeholder`}>
                  <span className="text-gray-400 text-xs text-center px-2">Sem imagem</span>
                </div>
                
                {/* Ícone de favorito */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorito(item.id)
                  }}
                  className={`absolute top-2 right-2 p-1 rounded-full z-10 transition-all ${
                    favoritos.has(item.id) 
                      ? 'bg-gray-300' 
                      : 'bg-gray-300'
                  }`}
                  title={favoritos.has(item.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <Heart 
                    className={`w-3.5 h-3.5 transition-all ${
                      favoritos.has(item.id)
                        ? 'stroke-white fill-white'
                        : 'stroke-gray fill-none'
                    }`}
                    strokeWidth={2}
                  />
                </button>
              </div>

              {/* Nome e Preço embaixo */}
              <div className="p-3 bg-white">
                {/* Nome */}
                <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate" title={item.nome}>
                  {item.nome}
                </h3>

                {/* Preço */}
                <p className="text-base font-bold text-blue-600">
                  R$ {parseFloat(item.preco || 0).toFixed(2)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProdutosServicosGrid

