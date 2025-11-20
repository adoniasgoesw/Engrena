import React from 'react'
import StatusButton from '../buttons/StatusButton'
import EditButton from '../buttons/EditButton'
import DeleteButton from '../buttons/DeleteButton'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const ProvedorCard = ({ 
  provedor, 
  onEdit, 
  onDelete, 
  onToggleStatus,
  onTestarConexao,
  className = ""
}) => {
  const isActive = provedor.status === 'Ativo'
  const ambiente = provedor.ambiente || 'production'
  const isSandbox = ambiente === 'sandbox'

  // Logo do Mercado Pago (placeholder - pode ser substituído por imagem real)
  const getProvedorLogo = (tipo) => {
    if (tipo === 'Mercado Pago') {
      return (
        <div className="w-full h-32 bg-gradient-to-br from-[#009EE3] to-[#00A8E8] flex items-center justify-center">
          <div className="text-white font-bold text-2xl">MP</div>
        </div>
      )
    }
    return (
      <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
        <span className="text-gray-400 text-sm">Logo</span>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col ${className}`}>
      {/* Logo do provedor */}
      <div className="w-full h-32 overflow-hidden flex-shrink-0">
        {getProvedorLogo(provedor.tipo)}
      </div>

      {/* Conteúdo do card */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Nome do provedor */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {provedor.nome || provedor.tipo}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="capitalize">{provedor.tipo}</span>
            {isSandbox && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                Sandbox
              </span>
            )}
          </div>
        </div>

        {/* Status e Métodos habilitados */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            {isActive ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm ${isActive ? 'text-green-600' : 'text-red-600'}`}>
              {isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          
          {/* Métodos habilitados */}
          {provedor.metodos_pagamento && provedor.metodos_pagamento.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {provedor.metodos_pagamento.map((metodo, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                >
                  {metodo}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <StatusButton
              isActive={isActive}
              onClick={() => onToggleStatus(provedor)}
              size="sm"
            />
            <EditButton
              onClick={() => onEdit(provedor)}
              size="sm"
            />
            <DeleteButton
              onClick={() => onDelete(provedor)}
              size="sm"
            />
          </div>
          <button
            onClick={() => onTestarConexao(provedor)}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            title="Testar Conexão"
          >
            Testar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProvedorCard




