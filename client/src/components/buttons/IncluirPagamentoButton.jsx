import React from 'react'
import { CircleDollarSign } from 'lucide-react'

const IncluirPagamentoButton = ({ onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors ${className}`}
      title="Incluir Pagamento"
    >
      <CircleDollarSign className="w-4 h-4" />
    </button>
  )
}

export default IncluirPagamentoButton


