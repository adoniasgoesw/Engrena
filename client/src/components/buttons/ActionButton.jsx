import React, { useState } from 'react'
import { MoreVertical, Edit, Power, Trash2 } from 'lucide-react'

const ActionButton = ({ onEdit, onToggleStatus, onDelete, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-md"
      >
        <MoreVertical className="w-4 h-4 mr-2" />
        Ações
      </button>

      {isOpen && (
        <>
          {/* Overlay para fechar o dropdown ao clicar fora */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-2xl py-1 z-20">
            <button
              onClick={() => {
                onEdit()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Editar</span>
            </button>
            
            <button
              onClick={() => {
                onToggleStatus()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Power className="w-4 h-4" />
              <span>Ativar/Desativar</span>
            </button>
            
            <button
              onClick={() => {
                onDelete()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ActionButton






























