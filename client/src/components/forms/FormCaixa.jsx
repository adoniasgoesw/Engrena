import React, { useState, useMemo, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Denominações de cédulas e moedas
const DENOMINACOES = [
  { valor: 200, tipo: 'cedula', label: 'R$ 200' },
  { valor: 100, tipo: 'cedula', label: 'R$ 100' },
  { valor: 50, tipo: 'cedula', label: 'R$ 50' },
  { valor: 20, tipo: 'cedula', label: 'R$ 20' },
  { valor: 10, tipo: 'cedula', label: 'R$ 10' },
  { valor: 5, tipo: 'cedula', label: 'R$ 5' },
  { valor: 2, tipo: 'cedula', label: 'R$ 2' },
  { valor: 1, tipo: 'moeda', label: 'R$ 1' },
  { valor: 0.50, tipo: 'moeda', label: 'R$ 0,50' },
  { valor: 0.25, tipo: 'moeda', label: 'R$ 0,25' },
  { valor: 0.10, tipo: 'moeda', label: 'R$ 0,10' },
  { valor: 0.05, tipo: 'moeda', label: 'R$ 0,05' }
]

const FormCaixa = ({ onSave, caixaAberto = null }) => {
  const { user } = useAuth()
  const isFechar = !!caixaAberto
  const [formData, setFormData] = useState({
    total: '',
    valor_abertura: '',
    valor_fechamento: ''
  })
  const [quantidades, setQuantidades] = useState({})
  const [mostrarCedulas, setMostrarCedulas] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Calcular soma das cédulas baseado nas quantidades
  const somaCedulas = useMemo(() => {
    return DENOMINACOES.reduce((acc, denom) => {
      const qtd = quantidades[denom.valor] || 0
      return acc + (denom.valor * qtd)
    }, 0)
  }, [quantidades])

  const handleChange = (e) => {
    const { name, value } = e.target
    let v = value
    
    // Formatar valores monetários (remover caracteres não numéricos exceto vírgula/ponto)
    if (name === 'total' || name === 'valor_fechamento') {
      v = value.replace(/[^\d,]/g, '').replace(',', '.')
      setFormData(prev => ({ ...prev, [name]: v }))
    }
  }

  const handleChangeQuantidade = (valor, quantidade) => {
    const qtd = parseInt(quantidade) || 0
    const novasQuantidades = { ...quantidades }
    if (qtd > 0) {
      novasQuantidades[valor] = qtd
    } else {
      delete novasQuantidades[valor]
    }
    setQuantidades(novasQuantidades)
  }

  // Atualizar valor_abertura ou valor_fechamento quando total ou quantidades mudarem
  useEffect(() => {
    const totalInput = parseFloat(formData.total.replace(',', '.')) || 0
    const totalCedulas = DENOMINACOES.reduce((acc, denom) => {
      const q = quantidades[denom.valor] || 0
      return acc + (denom.valor * q)
    }, 0)
    
    const valorCalculado = totalInput + totalCedulas
    
    if (isFechar) {
      setFormData(prev => ({
        ...prev,
        valor_fechamento: valorCalculado.toFixed(2).replace('.', ',')
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        valor_abertura: valorCalculado.toFixed(2).replace('.', ',')
      }))
    }
  }, [formData.total, quantidades, isFechar])

  const handleAdicionarCedulas = () => {
    setMostrarCedulas(true)
    setError('')
  }

  const handleFecharCedulas = () => {
    setMostrarCedulas(false)
    // Limpar quantidades ao fechar
    setQuantidades({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    // Se for fechar caixa
    if (isFechar) {
      const valorFechamento = parseFloat(formData.valor_fechamento.replace(',', '.')) || 0
      if (valorFechamento <= 0) {
        setError('O valor de fechamento deve ser maior que zero')
        return
      }

      // Validar que temos caixaAberto
      if (!caixaAberto || !caixaAberto.id) {
        setError('Caixa não encontrado')
        return
      }

      try {
        setLoading(true)
        
        const response = await fetch(`${API_URL}/api/auth/caixas/${caixaAberto.id}/fechar`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            valor_fechamento: valorFechamento,
            fechado_por: user.id
          }),
        })

        let data
        try {
          data = await response.json()
        } catch (jsonError) {
          const text = await response.text()
          console.error('❌ Resposta não é JSON:', text)
          setError(`Erro ao fechar caixa: ${response.status} ${response.statusText}`)
          return
        }

        if (response.ok) {
          const resultData = {
            caixa: data.caixa,
            valor_fechamento: valorFechamento
          }
          
          onSave && onSave(resultData)
          window.dispatchEvent(new CustomEvent('modalSaveSuccess', { detail: resultData }))
          window.dispatchEvent(new CustomEvent('caixaFechado', { detail: data.caixa }))
        } else {
          setError(data.error || 'Erro ao fechar caixa')
        }
      } catch (err) {
        console.error('Erro ao fechar caixa:', err)
        setError(err.message || 'Erro ao fechar caixa')
      } finally {
        setLoading(false)
      }
      return
    }

    // Se for abrir caixa
    const valorAbertura = parseFloat(formData.valor_abertura.replace(',', '.')) || 0
    if (valorAbertura <= 0) {
      setError('O valor de abertura deve ser maior que zero')
      return
    }

    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (!estabelecimentoId) {
      setError('Estabelecimento não identificado')
      return
    }
    
    try {
      setLoading(true)
      
      const dataToSend = {
        estabelecimento_id: estabelecimentoId,
        valor_abertura: valorAbertura,
        aberto_por: user.id
      }
      
      const response = await fetch(`${API_URL}/api/auth/caixas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        const text = await response.text()
        console.error('❌ Resposta não é JSON:', text)
        setError(`Erro ao abrir caixa: ${response.status} ${response.statusText}`)
        return
      }

      if (response.ok) {
        const resultData = {
          caixa: data.caixa,
          total: valorAbertura,
          valor_abertura: valorAbertura,
          quantidades: quantidades
        }
        
        onSave && onSave(resultData)
        window.dispatchEvent(new CustomEvent('modalSaveSuccess', { detail: resultData }))
        window.dispatchEvent(new CustomEvent('caixaAberto', { detail: data.caixa }))
      } else {
        setError(data.error || 'Erro ao abrir caixa')
      }
    } catch (err) {
      console.error('Erro ao abrir caixa:', err)
      setError(err.message || 'Erro ao abrir caixa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="modal-form p-6 pt-8 space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Total e Valor de abertura/fechamento */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="caixa-total" className="block text-sm font-medium text-gray-700 mb-2">
            Total
          </label>
          <input
            type="text"
            id="caixa-total"
            name="total"
            value={formData.total}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="0,00"
          />
        </div>
        <div>
          <label htmlFor={isFechar ? "caixa-valor-fechamento" : "caixa-valor-abertura"} className="block text-sm font-medium text-gray-700 mb-2">
            {isFechar ? 'Valor de fechamento' : 'Valor de abertura'}
          </label>
          <input
            type="text"
            id={isFechar ? "caixa-valor-fechamento" : "caixa-valor-abertura"}
            name={isFechar ? "valor_fechamento" : "valor_abertura"}
            value={isFechar ? formData.valor_fechamento : formData.valor_abertura}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-100"
            placeholder="0,00"
            readOnly
          />
        </div>
      </div>

      {/* Informações do caixa ao fechar */}
      {isFechar && caixaAberto && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Saldo total:</span>
            <span className="text-base font-bold text-gray-900">{formatCurrency(caixaAberto.saldo_total || 0)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-300">
            <span className="text-sm font-medium text-gray-700">Diferença:</span>
            <span className={`text-base font-bold ${
              (parseFloat(formData.valor_fechamento.replace(',', '.')) || 0) - (caixaAberto.saldo_total || 0) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formatCurrency((parseFloat(formData.valor_fechamento.replace(',', '.')) || 0) - (caixaAberto.saldo_total || 0))}
            </span>
          </div>
        </div>
      )}

      {/* Botão Adicionar Cédulas */}
      {!mostrarCedulas && (
        <div>
          <button
            type="button"
            onClick={handleAdicionarCedulas}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 text-white font-semibold rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Adicionar cedulas
          </button>
        </div>
      )}

      {/* Inputs de cédulas e moedas */}
      {mostrarCedulas && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">
              Quantidade de cédulas e moedas
            </div>
            <button
              type="button"
              onClick={handleFecharCedulas}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Fechar cedulas
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {DENOMINACOES.map((denom) => (
              <div key={denom.valor}>
                <label htmlFor={`cedula-${denom.valor}`} className="block text-sm font-medium text-gray-700 mb-2">
                  {denom.label}
                </label>
                <input
                  type="number"
                  id={`cedula-${denom.valor}`}
                  min="0"
                  value={quantidades[denom.valor] || ''}
                  onChange={(e) => handleChangeQuantidade(denom.valor, e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          
          {/* Resumo do cálculo */}
          {somaCedulas > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total calculado:</span>
                <span className="text-base font-bold text-gray-900">{formatCurrency(somaCedulas)}</span>
              </div>
            </div>
          )}
        </div>
      )}

    </form>
  )
}

export default FormCaixa

