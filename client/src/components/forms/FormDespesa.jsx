import React, { useState, useEffect } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const FormDespesa = ({ despesa = null, mes, ano, recorrente = null, onClose }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    tipo: 'fixa',
    categoria: '',
    descricao: '',
    valor: '',
    funcionario_id: '',
    recorrente: recorrente !== null ? recorrente : false,
    data_vencimento: '',
    data_pagamento: '',
    mes_referencia: mes || new Date().getMonth() + 1,
    ano_referencia: ano || new Date().getFullYear()
  })
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Carregar funcionários
  useEffect(() => {
    const fetchFuncionarios = async () => {
      try {
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        if (!estabelecimentoId) return

        const response = await fetch(`${API_URL}/api/auth/usuarios?estabelecimento_id=${estabelecimentoId}`)
        const data = await response.json()

        if (response.ok) {
          setFuncionarios(data.usuarios || data || [])
        }
      } catch (error) {
        console.error('Erro ao buscar funcionários:', error)
      }
    }

    if (user) {
      fetchFuncionarios()
    }

    // Se for edição, carregar dados da despesa
    if (despesa) {
      setFormData({
        tipo: despesa.tipo || 'fixa',
        categoria: despesa.categoria || '',
        descricao: despesa.descricao || '',
        valor: despesa.valor || '',
        funcionario_id: despesa.funcionario_id || '',
        recorrente: despesa.recorrente || false,
        data_vencimento: despesa.data_vencimento ? despesa.data_vencimento.split('T')[0] : '',
        data_pagamento: despesa.data_pagamento ? despesa.data_pagamento.split('T')[0] : '',
        mes_referencia: despesa.mes_referencia || mes || new Date().getMonth() + 1,
        ano_referencia: despesa.ano_referencia || ano || new Date().getFullYear()
      })
    }
  }, [user, despesa, mes, ano])

  const tiposDespesa = [
    { value: 'fixa', label: 'Fixa' },
    { value: 'fisica', label: 'Física' },
    { value: 'alimentar', label: 'Alimentar' },
    { value: 'outros', label: 'Outros' }
  ]

  const categoriasDespesa = {
    fixa: [
      { value: 'aluguel', label: 'Aluguel' },
      { value: 'luz', label: 'Luz' },
      { value: 'agua', label: 'Água' },
      { value: 'internet', label: 'Internet' },
      { value: 'telefone', label: 'Telefone' },
      { value: 'outros', label: 'Outros' }
    ],
    fisica: [
      { value: 'salario', label: 'Salário' },
      { value: 'bonus', label: 'Bônus' },
      { value: 'comissao', label: 'Comissão' },
      { value: 'outros', label: 'Outros' }
    ],
    alimentar: [
      { value: 'refeicao', label: 'Refeição' },
      { value: 'lanche', label: 'Lanche' },
      { value: 'bebida', label: 'Bebida' },
      { value: 'outros', label: 'Outros' }
    ],
    outros: [
      { value: 'manutencao', label: 'Manutenção' },
      { value: 'material', label: 'Material' },
      { value: 'outros', label: 'Outros' }
    ]
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Se mudar o tipo, resetar categoria
    if (name === 'tipo') {
      setFormData(prev => ({
        ...prev,
        tipo: value,
        categoria: '',
        funcionario_id: value !== 'fisica' ? '' : prev.funcionario_id
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoId) {
        setError('Estabelecimento não encontrado')
        return
      }

      const payload = {
        estabelecimento_id: estabelecimentoId,
        tipo: formData.tipo,
        categoria: formData.categoria,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor.replace(',', '.')) || 0,
        funcionario_id: formData.funcionario_id || null,
        recorrente: formData.recorrente,
        data_vencimento: formData.data_vencimento || null,
        data_pagamento: formData.data_pagamento || null,
        mes_referencia: parseInt(formData.mes_referencia),
        ano_referencia: parseInt(formData.ano_referencia)
      }

      const url = despesa 
        ? `${API_URL}/api/auth/despesas/${despesa.id}`
        : `${API_URL}/api/auth/despesas`
      
      const method = despesa ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        window.dispatchEvent(new CustomEvent(despesa ? 'despesaAtualizada' : 'despesaCriada', { detail: data.despesa }))
        if (onClose) onClose()
        // Fechar modal se estiver em um
        window.dispatchEvent(new CustomEvent('modalClose'))
      } else {
        setError(data.error || 'Erro ao salvar despesa')
      }
    } catch (error) {
      console.error('Erro ao salvar despesa:', error)
      setError('Erro ao salvar despesa. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tipo de Despesa *
          </label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm bg-white"
            required
          >
            {tiposDespesa.map(tipo => (
              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Categoria *
          </label>
          <select
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm bg-white"
            required
          >
            <option value="">Selecione...</option>
            {categoriasDespesa[formData.tipo]?.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Descrição *
          </label>
          <input
            type="text"
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
            placeholder="Ex: Aluguel do mês de janeiro"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Valor *
          </label>
          <input
            type="text"
            name="valor"
            value={formData.valor}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
            placeholder="0,00"
            required
          />
        </div>

        {formData.tipo === 'fisica' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Funcionário
            </label>
            <select
              name="funcionario_id"
              value={formData.funcionario_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm bg-white"
            >
              <option value="">Selecione...</option>
              {funcionarios.map(func => (
                <option key={func.id} value={func.id}>{func.nome}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Data de Vencimento
          </label>
          <input
            type="date"
            name="data_vencimento"
            value={formData.data_vencimento}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Data de Pagamento
          </label>
          <input
            type="date"
            name="data_pagamento"
            value={formData.data_pagamento}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="recorrente"
              checked={formData.recorrente}
              onChange={handleChange}
              className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Despesa recorrente (todo mês)</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => {
            if (onClose) onClose()
            window.dispatchEvent(new CustomEvent('modalClose'))
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvando...' : despesa ? 'Atualizar' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}

export default FormDespesa

