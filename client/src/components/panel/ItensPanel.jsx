import React, { useState, useEffect } from 'react'
import CategoriasModalView from './CategoriasModalView'
import ProdutosServicosGrid from './ProdutosServicosGrid'
import SearchBar from '../layout/SearchBar'

const ItensPanel = ({ isOpen, onClose, ordemId }) => {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      // Resetar categoria ao abrir para permitir seleção automática da primeira
      setSelectedCategory(null)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsAnimating(false)
    setSelectedCategory(null)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleSelectCategory = (categoria) => {
    setSelectedCategory(categoria)
  }

  const handleFirstCategoryLoaded = (categoria) => {
    // Selecionar automaticamente a primeira categoria se nenhuma estiver selecionada
    if (!selectedCategory && categoria) {
      setSelectedCategory(categoria)
    }
  }

  if (!isOpen && !isAnimating) return null

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-[999999] transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Painel lateral */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-1/2 lg:w-[40%] xl:w-[35%] bg-white shadow-2xl z-[1000000] flex flex-col transition-transform duration-300 ease-in-out ${
          isAnimating ? 'transform translate-x-0' : 'transform translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com SearchBar */}
        <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-gray-50/50">
          <SearchBar
            isVisible={isSearchVisible}
            onClose={() => setIsSearchVisible(false)}
            onToggle={() => setIsSearchVisible(!isSearchVisible)}
            onSearch={(term) => {
              setSearchTerm(term)
              console.log('Pesquisar:', term)
            }}
            placeholder="Pesquisar itens..."
            className="w-full"
          />
        </div>

        {/* Conteúdo do painel - categorias e produtos/serviços */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Categorias no topo */}
          <div className="flex-shrink-0">
            <CategoriasModalView 
              onSelectCategory={handleSelectCategory}
              onFirstCategoryLoaded={handleFirstCategoryLoaded}
              selectedCategoryId={selectedCategory?.id}
              hideTitle={true}
              searchTerm={searchTerm}
            />
          </div>
          
          {/* Grid de produtos e serviços abaixo */}
          <div className="flex-1 overflow-y-auto">
            {selectedCategory ? (
              <ProdutosServicosGrid categoriaId={selectedCategory.id} ordemId={ordemId} />
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>Selecione uma categoria para ver os produtos e serviços</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default ItensPanel

