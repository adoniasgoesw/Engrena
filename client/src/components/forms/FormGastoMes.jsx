import React, { useState, useEffect } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const FormGastoMes = ({ despesa = null, mes, ano }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    nome: '',
    valor: '',
    data: '',
    descricao: ''
  })
  const [errors, setErrors] = useState({})

  // Se for edição, carregar dados do gasto
  useEffect(() => {
    if (despesa) {
      setFormData({
        nome: despesa.nome_gasto || '',
        valor: despesa.valor || '',
        data: despesa.data_gasto ? despesa.data_gasto.split('T')[0] : '',
        descricao: despesa.descricao || ''
      })
    }
  }, [despesa])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Limpar erros ao mudar campo
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    // Validações
    if (!formData.nome.trim()) {
      setErrors({ nome: 'Nome do gasto é obrigatório' })
      return
    }

    if (!formData.valor || parseFloat(formData.valor.replace(',', '.')) <= 0) {
      setErrors({ valor: 'Valor é obrigatório e deve ser maior que zero' })
      return
    }

    try {
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoId) {
        setErrors({ general: 'Estabelecimento não encontrado' })
        return
      }

      if (!formData.data) {
        setErrors({ data: 'Data do gasto é obrigatória' })
        return
      }

      const payload = {
        estabelecimento_id: estabelecimentoId,
        nome_gasto: formData.nome.trim(),
        valor: parseFloat(formData.valor.replace(',', '.')) || 0,
        data_gasto: formData.data,
        descricao: formData.descricao.trim() || null
      }

      const url = despesa 
        ? `${API_URL}/api/auth/gastos-mes/${despesa.id}`
        : `${API_URL}/api/auth/gastos-mes`
      
      const method = despesa ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        window.dispatchEvent(new CustomEvent(despesa ? 'gastoMesAtualizado' : 'gastoMesCriado', { detail: data.gasto_mes }))
        window.dispatchEvent(new CustomEvent('modalSaveSuccess', { detail: { gasto_mes: data.gasto_mes } }))
      } else {
        setErrors({ general: data.error || 'Erro ao salvar gasto' })
      }
    } catch (error) {
      console.error('Erro ao salvar gasto:', error)
      setErrors({ general: 'Erro ao salvar gasto. Tente novamente.' })
    }
  }

  return (
    <form className="modal-form p-6 pt-8 space-y-6" onSubmit={handleSubmit}>
      {/* Mensagem de erro geral */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {errors.general}
        </div>
      )}

      {/* Nome / Categoria do Gasto */}
      <div>
        <label htmlFor="gasto-mes-nome" className="block text-sm font-medium text-gray-700 mb-2">
          Nome do Gasto *
        </label>
        <input
          type="text"
          id="gasto-mes-nome"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.nome ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Ex: Compra de mercado, Reabastecimento de peças, Material de escritório"
          required
        />
        {errors.nome && (
          <p className="text-red-600 text-sm mt-1">{errors.nome}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">Digite o nome ou categoria do gasto</p>
      </div>

      {/* Valor */}
      <div>
        <label htmlFor="gasto-mes-valor" className="block text-sm font-medium text-gray-700 mb-2">
          Valor *
        </label>
        <input
          type="text"
          id="gasto-mes-valor"
          name="valor"
          value={formData.valor}
          onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.valor ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="0,00"
          required
        />
        {errors.valor && (
          <p className="text-red-600 text-sm mt-1">{errors.valor}</p>
        )}
      </div>

      {/* Data */}
      <div>
        <label htmlFor="gasto-mes-data" className="block text-sm font-medium text-gray-700 mb-2">
          Data *
        </label>
        <input
          type="date"
          id="gasto-mes-data"
          name="data"
          value={formData.data}
          onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.data ? 'border-red-300' : 'border-gray-300'
          }`}
          required
        />
        {errors.data && (
          <p className="text-red-600 text-sm mt-1">{errors.data}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">Data do gasto</p>
      </div>

      {/* Descrição (opcional) */}
      <div>
        <label htmlFor="gasto-mes-descricao" className="block text-sm font-medium text-gray-700 mb-2">
          Descrição (opcional)
        </label>
        <textarea
          id="gasto-mes-descricao"
          name="descricao"
          value={formData.descricao}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          placeholder="Ex: Compra de peças para estoque, mercado para o escritório, etc."
        />
      </div>
    </form>
  )
}

export default FormGastoMes

