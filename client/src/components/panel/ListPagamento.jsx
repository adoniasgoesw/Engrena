import React from 'react'
import { DollarSign, CreditCard, Wallet, Zap } from 'lucide-react'

const ListPagamento = ({ ordemId, ordemStatus, ordemTotal = 0 }) => {
  const formasPagamento = [
    { 
      id: 'Dinheiro', 
      nome: 'Dinheiro', 
      icon: DollarSign
    },
    { 
      id: 'Debito', 
      nome: 'Débito', 
      icon: CreditCard
    },
    { 
      id: 'Pix', 
      nome: 'Pix', 
      icon: Zap
    },
    { 
      id: 'Credito', 
      nome: 'Crédito', 
      icon: CreditCard
    }
  ]

  const handleSelecionarForma = (forma) => {
    console.log('Forma de pagamento selecionada:', forma)
    // TODO: Implementar lógica para processar pagamento
  }

  return (
    <div className="w-full">
      {/* Cards de formas de pagamento em linha */}
      <div className="p-4 flex items-center gap-3 overflow-x-auto">
        {formasPagamento.map((forma) => {
          const Icon = forma.icon
          return (
            <button
              key={forma.id}
              onClick={() => handleSelecionarForma(forma)}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:shadow-md hover:border-gray-300 transition-all duration-200 flex-shrink-0 min-w-[80px]"
            >
              <div className="p-2 rounded-full bg-gray-100">
                <Icon className="w-5 h-5 text-gray-900" />
              </div>
              <span className="text-xs font-semibold text-gray-900">{forma.nome}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ListPagamento

