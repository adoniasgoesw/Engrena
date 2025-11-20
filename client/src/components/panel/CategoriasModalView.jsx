import React, { useState, useEffect, useMemo } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const CategoriasModalView = ({ onSelectCategory, onFirstCategoryLoaded, selectedCategoryId, hideTitle = false, searchTerm = '' }) => {
  const { user } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtrar categorias baseado no termo de pesquisa
  const filteredCategorias = useMemo(() => {
    if (!searchTerm.trim()) return categorias
    const term = searchTerm.toLowerCase().trim()
    return categorias.filter(cat => 
      cat.nome.toLowerCase().includes(term)
    )
  }, [categorias, searchTerm])

  useEffect(() => {
    const fetchCategorias = async () => {
      if (!user) return
      
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/auth/categorias?estabelecimento_id=${estabelecimentoId}`)
        const data = await response.json()

        if (response.ok) {
          // Filtrar apenas categorias ativas
          const categoriasAtivas = (data.categorias || []).filter(cat => cat.status === 'Ativo')
          setCategorias(categoriasAtivas)
        }
      } catch (err) {
        console.error('Erro ao buscar categorias:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategorias()
  }, [user])

  // Quando filteredCategorias muda, notificar sobre primeira categoria se necessário
  useEffect(() => {
    if (filteredCategorias.length > 0 && onFirstCategoryLoaded && !selectedCategoryId) {
      // Pequeno delay para garantir que o estado foi atualizado
      const timeoutId = setTimeout(() => {
        onFirstCategoryLoaded(filteredCategorias[0])
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [filteredCategorias, onFirstCategoryLoaded, selectedCategoryId])

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Carregando categorias...</p>
      </div>
    )
  }

  return (
    <div className="py-4">
      {!hideTitle && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecione uma categoria</h3>
      )}
      
      {filteredCategorias.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          <p>{categorias.length === 0 ? 'Nenhuma categoria disponível' : 'Nenhuma categoria encontrada'}</p>
        </div>
      ) : (
        <div className="categorias-scroll flex gap-4 overflow-x-auto overflow-y-hidden pb-3 px-4" style={{ scrollbarWidth: 'thin', msOverflowStyle: 'auto' }}>
          {filteredCategorias.map((categoria) => {
            // Verificar se a imagem já é uma URL completa (começa com http) ou é apenas o nome do arquivo
            let imagemUrl = null
            
            if (categoria.imagem) {
              if (categoria.imagem.startsWith('http://') || categoria.imagem.startsWith('https://')) {
                // Já é uma URL completa (Cloudinary)
                imagemUrl = categoria.imagem
              } else {
                // Montar URL local - servidor serve em /uploads
                imagemUrl = `${API_URL}/uploads/categorias/${categoria.imagem}`
              }
            }

            const isSelected = selectedCategoryId === categoria.id

            return (
              <button
                key={categoria.id}
                onClick={() => onSelectCategory && onSelectCategory(categoria)}
                className={`flex flex-col items-center gap-2 transition-all cursor-pointer group flex-shrink-0 ${
                  isSelected 
                    ? 'opacity-100 scale-105' 
                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                }`}
              >
                <div className="relative">
                  {imagemUrl ? (
                    <img
                      src={imagemUrl}
                      alt={categoria.nome}
                      className={`w-20 h-20 rounded-full border-[4px] object-cover transition-all ${
                        isSelected ? 'border-blue-600 shadow-md shadow-blue-200' : 'border-blue-500'
                      }`}
                      onError={(e) => {
                        console.error('Erro ao carregar imagem:', imagemUrl, categoria)
                        // Se a imagem falhar ao carregar, mostrar placeholder
                        e.target.style.display = 'none'
                        const placeholder = e.target.parentElement.querySelector('.placeholder')
                        if (placeholder) placeholder.style.display = 'flex'
                      }}
                      onLoad={() => {
                        console.log('Imagem carregada com sucesso:', imagemUrl)
                      }}
                    />
                  ) : null}
                  <div className={`w-20 h-20 rounded-full border-[4px] bg-gray-200 flex items-center justify-center ${imagemUrl ? 'hidden' : ''} placeholder transition-all ${
                    isSelected ? 'border-blue-600 shadow-md shadow-blue-200' : 'border-blue-500'
                  }`}>
                    <span className="text-gray-400 text-xs">Sem imagem</span>
                  </div>
                </div>
                <span className={`text-xs font-medium text-center max-w-[100px] transition-colors truncate ${
                  isSelected 
                    ? 'text-blue-600 font-semibold' 
                    : 'text-gray-700 group-hover:text-blue-600'
                }`}>
                  {categoria.nome}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CategoriasModalView

