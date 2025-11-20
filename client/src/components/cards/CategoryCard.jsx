import React from 'react';
import StatusButton from '../buttons/StatusButton';
import EditButton from '../buttons/EditButton';
import DeleteButton from '../buttons/DeleteButton';

const CategoryCard = ({ 
  categoria, 
  onEdit, 
  onDelete, 
  onToggleStatus,
  className = ""
}) => {
  const isActive = categoria.status === 'Ativo';

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col ${className}`}>
      {/* Imagem da categoria */}
      <div className="w-full h-32 bg-gray-100 overflow-hidden flex-shrink-0">
        {categoria.imagem ? (
          <>
            <img
              src={categoria.imagem}
              alt={categoria.nome}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400" style={{ display: 'none' }}>
              <span className="text-sm">Erro ao carregar imagem</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
            <span className="text-sm">Sem imagem</span>
          </div>
        )}
      </div>

      {/* Conteúdo do card - nome à esquerda, botões à direita */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          {/* Nome da categoria à esquerda */}
          <h3 className="text-base font-semibold text-gray-900 flex-1 truncate" title={categoria.nome}>
            {categoria.nome}
          </h3>

          {/* Botões de ação à direita */}
          <div className="flex items-center gap-1">
            <StatusButton
              isActive={isActive}
              onClick={() => onToggleStatus(categoria)}
              size="sm"
            />
            <EditButton
              onClick={() => onEdit(categoria)}
              size="sm"
            />
            <DeleteButton
              onClick={() => onDelete(categoria)}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryCard;
