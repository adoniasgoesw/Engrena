import React from 'react'
import { useModal } from '../../contexts/ModalContext'

const AddButton = ({ onClick, modalContent, className = "", children = "Adicionar" }) => {
  const { openModal } = useModal()

  const handleClick = () => {
    if (modalContent) {
      openModal(modalContent)
    } else if (onClick) {
      onClick()
    }
  }

  // Se children for "Abrir caixa", não mostrar ícone
  const showIcon = children !== 'Abrir caixa'
  
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 text-white font-semibold rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${className}`}
    >
      {showIcon && (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )}
      {children}
    </button>
  )
}

export default AddButton