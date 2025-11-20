import React, { useState, useEffect } from 'react'
import ActionButton from '../buttons/ActionButton'

const ListBase = ({ 
  columns = [], 
  data = [], 
  loading = false,
  emptyMessage = "Nenhum item encontrado",
  className = "",
  hideCheckboxes = false,
  topButton = null,
  children = null,
  headerMarginTop = false,
  onRowClick = null
}) => {
  const [selectedItems, setSelectedItems] = useState([])
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  
  const totalItems = data.length;
  const selectedCount = selectedItems.length;
  const allSelected = data.length > 0 && data.every(item => selectedItems.includes(item.id));
  
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems([]);
    } else {
      const allIds = data.map(item => item.id);
      setSelectedItems(allIds);
    }
  }
  
  const handleSelectItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  }

  // Atualizar largura da janela ao redimensionar - DEVE estar antes dos returns condicionais
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Removido: tela de carregamento - dados são carregados do cache primeiro

  // Se há children, renderizar em grid (para cards)
  if (children !== null) {
    const hasItems = React.Children.count(children) > 0;
    
    return (
      <div className="flex flex-col h-full">
        {/* Área superior: título com botão personalizado */}
        {topButton && (
          <div className="px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0 mb-4">
            {typeof topButton === 'object' && topButton.title ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900">{topButton.title}</h3>
                {topButton.button}
              </>
          ) : (
            <div className="flex items-center justify-start w-full">
              {topButton}
            </div>
          )}
          </div>
        )}
        
        {!hasItems ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <div className={`grid ${className || 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'} overflow-y-auto flex-1 items-start`}>
            {children}
          </div>
        )}
      </div>
    );
  }

  // Não retornar cedo quando a lista estiver vazia; precisamos manter o header (ex.: abas)

  // Renderizar o conteúdo da primeira coluna (nome) com ou sem checkbox
  const renderFirstColumn = (row, rowIndex) => {
    const firstColumn = columns[0];
    if (hideCheckboxes) {
      return (
        <span className="truncate">
          {firstColumn.render ? firstColumn.render(row, rowIndex) : row[firstColumn.key]}
        </span>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={selectedItems.includes(row.id)}
          onChange={() => handleSelectItem(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded cursor-pointer focus:outline-none flex-shrink-0"
        />
        <span className="truncate">
          {firstColumn.render ? firstColumn.render(row, rowIndex) : row[firstColumn.key]}
        </span>
      </div>
    );
  }

  // Detectar número de colunas a exibir baseado na largura da tela
  const getVisibleColumns = () => {
    // Telas pequenas (mobile): apenas 1 coluna
    if (windowWidth < 640) {
      return [columns[0]]; // Apenas a primeira coluna
    }
    // Telas médias (tablet): 4 colunas
    else if (windowWidth < 1024) {
      return columns.slice(0, Math.min(4, columns.length));
    }
    // Telas grandes: todas as colunas
    else {
      return columns;
    }
  };

  const visibleColumns = getVisibleColumns();

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col ${className}`} style={{ height: windowWidth < 768 ? '90%' : '100%' }}>
      {/* Área superior: contador de seleção ou título com botão personalizado */}
      {hideCheckboxes && topButton ? (
        <div className="px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0 mx-2 my-2">
          {typeof topButton === 'object' && topButton.title ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900">{topButton.title}</h3>
              {topButton.button}
            </>
          ) : (
            <div className="flex items-center justify-start w-full">
              {topButton}
            </div>
          )}
        </div>
      ) : !hideCheckboxes && (
        <div className="px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0 mx-2 my-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded cursor-pointer focus:outline-none"
            />
            <span className="text-sm text-gray-700 font-medium">
              {selectedCount > 0 ? `${selectedCount} de ${totalItems} selecionados` : `${totalItems} ${columns[0]?.header?.toLowerCase() || 'itens'}`}
            </span>
          </div>
          
          {selectedCount > 0 && (
            <ActionButton
              onEdit={() => console.log('Editar selecionados:', selectedItems)}
              onToggleStatus={() => console.log('Alterar status dos selecionados:', selectedItems)}
              onDelete={() => console.log('Excluir selecionados:', selectedItems)}
            />
          )}
        </div>
      )}
      
      <div className="overflow-y-auto flex-1 overflow-x-hidden px-2 pt-2">
        <table className="w-full table-fixed">
          {/* Cabeçalho - sempre visível */}
          <thead className={`sticky top-0 ${headerMarginTop ? 'pt-4' : ''}`}>
            <tr>
              {visibleColumns.map((column, index) => {
                const columnWidth = column.width || `${100/visibleColumns.length}%`
                const align = column.align || 'left'
                const textAlignClass = align === 'center' ? 'text-center' : align === 'right' || align === 'end' ? 'text-right' : 'text-left'
                return (
                  <th
                    key={index}
                    className={`px-4 py-3 ${textAlignClass} text-sm font-bold text-gray-900 uppercase tracking-wider bg-blue-200 first:rounded-tl-lg last:rounded-tr-lg first:rounded-bl-lg last:rounded-br-lg`}
                    style={{ width: columnWidth }}
                  >
                    {column.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          
          {/* Corpo da tabela */}
          <tbody className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td 
                  colSpan={visibleColumns.length} 
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className={`hover:bg-gray-50 transition-colors duration-150 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {visibleColumns.map((column, colIndex) => {
                    const columnWidth = column.width || `${100/visibleColumns.length}%`
                    const align = column.align || 'left'
                    const textAlignClass = align === 'center' ? 'text-center' : align === 'right' || align === 'end' ? 'text-right' : 'text-left'
                    if (colIndex === 0) {
                      // Primeira coluna com checkbox
                      return (
                        <td
                          key={colIndex}
                          className={`px-4 py-2.5 text-sm text-gray-900 ${textAlignClass}`}
                          style={{ width: columnWidth }}
                        >
                          {renderFirstColumn(row, rowIndex)}
                        </td>
                      );
                    }
                    return (
                      <td
                        key={colIndex}
                        className={`px-4 py-2.5 text-sm text-gray-900 ${textAlignClass} ${colIndex === visibleColumns.length - 1 ? '' : 'truncate'}`}
                        style={{ width: columnWidth }}
                      >
                        {column.render ? column.render(row, rowIndex) : row[column.key]}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="h-4"></div>
    </div>
  );
};

export default ListBase;