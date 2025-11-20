import React from 'react'

const currency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ListValores = ({ 
  ordemTotal = 0,
  subtotal = 0,
  desconto = 0,
  acrescimos = 0,
  juros = 0,
  valorPago = 0,
          onPagar,
          formaSelecionada,
          disabled = false
}) => {
  // Calcular valores
  // NOTA: Juros não são aplicados imediatamente no cálculo
  // Os juros só serão aplicados quando a data de vencimento passar e o pagamento não for pago
  const valorDesconto = Number(desconto) || 0
  const valorAcrescimos = Number(acrescimos) || 0
  const valorSubtotal = Number(subtotal) || Number(ordemTotal) || 0
  // Calcular total SEM juros (juros serão aplicados apenas se passar da data de vencimento)
  const totalCalculado = valorSubtotal - valorDesconto + valorAcrescimos
  const saldoRestante = totalCalculado - (Number(valorPago) || 0)

  return (
    <div className="bg-white flex-shrink-0 shadow-lg p-4">
      {/* Resumo de valores */}
      <div className="p-4 space-y-2 bg-gray-200 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium text-gray-900">{currency(valorSubtotal)}</span>
        </div>
        
        {valorDesconto > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Desconto:</span>
            <span className="font-medium text-gray-900">- {currency(valorDesconto)}</span>
          </div>
        )}
        
        {valorAcrescimos > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Acréscimos:</span>
            <span className="font-medium text-gray-900">+ {currency(valorAcrescimos)}</span>
          </div>
        )}
        
        {/* Juros não são mostrados aqui - serão aplicados apenas se passar da data de vencimento */}
        
        <div className="pt-2 flex justify-between items-center">
          <span className="text-base font-semibold text-gray-900">Total:</span>
          <span className="text-base font-bold text-gray-900">{currency(totalCalculado)}</span>
        </div>
        
        {valorPago > 0 && (
          <>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
              <span className="text-gray-600">Valor Pago:</span>
              <span className="font-medium text-green-600">{currency(valorPago)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Saldo Restante:</span>
              <span className={`font-semibold ${saldoRestante > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {currency(saldoRestante)}
              </span>
            </div>
          </>
        )}

        {/* Botão Confirmar Pagamento - sempre visível */}
        <div className="pt-4 mt-4 border-t border-gray-300">
          <button
            onClick={onPagar}
            disabled={disabled || !formaSelecionada}
            className="w-full inline-flex items-center justify-center px-5 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white font-semibold rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  )
}

export default ListValores

