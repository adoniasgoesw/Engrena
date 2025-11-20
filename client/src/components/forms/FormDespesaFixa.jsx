import React, { useState, useEffect } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const FormDespesaFixa = ({ despesa = null, mes, ano }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    categoria: '',
    usuario_id: '',
    valor: '',
    data_vencimento: '',
    descricao: ''
  })
  const [funcionarios, setFuncionarios] = useState([])
  const [errors, setErrors] = useState({})

  // Categorias de despesas fixas
  const categorias = [
    { value: 'aluguel', label: 'Aluguel' },
    { value: 'luz', label: 'Luz' },
    { value: 'agua', label: 'Água' },
    { value: 'internet', label: 'Internet' },
    { value: 'telefone', label: 'Telefone' },
    { value: 'salario', label: 'Salário' },
    { value: 'funcionario', label: 'Funcionário' },
    { value: 'seguranca', label: 'Segurança' },
    { value: 'limpeza', label: 'Limpeza' },
    { value: 'manutencao', label: 'Manutenção' },
    { value: 'impostos', label: 'Impostos' },
    { value: 'outros', label: 'Outros' }
  ]

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
        categoria: despesa.categoria || '',
        usuario_id: despesa.usuario_id || '',
        valor: despesa.valor || '',
        data_vencimento: despesa.data_vencimento ? despesa.data_vencimento.split('T')[0] : '',
        descricao: despesa.descricao || ''
      })
    }
  }, [user, despesa, mes, ano])

  const handleChange = (e) => {
    const { name, value } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Limpar usuário se mudar categoria
    if (name === 'categoria' && value !== 'salario' && value !== 'funcionario') {
      setFormData(prev => ({
        ...prev,
        categoria: value,
        usuario_id: ''
      }))
    }

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
    if (!formData.categoria) {
      setErrors({ categoria: 'Categoria é obrigatória' })
      return
    }

    if ((formData.categoria === 'salario' || formData.categoria === 'funcionario') && !formData.usuario_id) {
      setErrors({ usuario_id: 'Funcionário é obrigatório para esta categoria' })
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

      // Criar descrição baseada na categoria e funcionário
      let descricao = categorias.find(c => c.value === formData.categoria)?.label || formData.categoria
      if (formData.usuario_id) {
        const funcionario = funcionarios.find(f => f.id === parseInt(formData.usuario_id))
        if (funcionario) {
          descricao = `${descricao} - ${funcionario.nome}`
        }
      }

      const payload = {
        estabelecimento_id: estabelecimentoId,
        usuario_id: (formData.categoria === 'salario' || formData.categoria === 'funcionario') ? parseInt(formData.usuario_id) : null,
        categoria: formData.categoria,
        valor: parseFloat(formData.valor.replace(',', '.')) || 0,
        data_vencimento: formData.data_vencimento || null,
        descricao: formData.descricao || descricao
      }

      const url = despesa 
        ? `${API_URL}/api/auth/despesas-fixas/${despesa.id}`
        : `${API_URL}/api/auth/despesas-fixas`
      
      const method = despesa ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        window.dispatchEvent(new CustomEvent(despesa ? 'despesaFixaAtualizada' : 'despesaFixaCriada', { detail: data.despesa_fixa }))
        window.dispatchEvent(new CustomEvent('modalSaveSuccess', { detail: { despesa_fixa: data.despesa_fixa } }))
      } else {
        setErrors({ general: data.error || 'Erro ao salvar despesa fixa' })
      }
    } catch (error) {
      console.error('Erro ao salvar despesa:', error)
      setErrors({ general: 'Erro ao salvar despesa. Tente novamente.' })
    }
  }

  const mostrarFuncionario = formData.categoria === 'salario' || formData.categoria === 'funcionario'

  return (
    <form className="modal-form p-6 pt-8 space-y-6" onSubmit={handleSubmit}>
      {/* Mensagem de erro geral */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {errors.general}
        </div>
      )}

      {/* Categoria */}
      <div>
        <label htmlFor="despesa-fixa-categoria" className="block text-sm font-medium text-gray-700 mb-2">
          Categoria *
        </label>
        <select
          id="despesa-fixa-categoria"
          name="categoria"
          value={formData.categoria}
          onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.categoria ? 'border-red-300' : 'border-gray-300'
          }`}
          required
        >
          <option value="">Selecione a categoria</option>
          {categorias.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        {errors.categoria && (
          <p className="text-red-600 text-sm mt-1">{errors.categoria}</p>
        )}
      </div>

      {/* Funcionário (apenas se categoria for salário ou funcionário) */}
      {mostrarFuncionario && (
        <div>
          <label htmlFor="despesa-fixa-funcionario" className="block text-sm font-medium text-gray-700 mb-2">
            Funcionário *
          </label>
          <select
            id="despesa-fixa-funcionario"
            name="usuario_id"
            value={formData.usuario_id}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
              errors.usuario_id ? 'border-red-300' : 'border-gray-300'
            }`}
            required={mostrarFuncionario}
          >
            <option value="">Selecione o funcionário</option>
            {funcionarios.map(func => (
              <option key={func.id} value={func.id}>
                {func.nome}{func.cargo ? ` – ${func.cargo}` : ''}
              </option>
            ))}
          </select>
          {errors.usuario_id && (
            <p className="text-red-600 text-sm mt-1">{errors.usuario_id}</p>
          )}
        </div>
      )}

      {/* Valor */}
      <div>
        <label htmlFor="despesa-fixa-valor" className="block text-sm font-medium text-gray-700 mb-2">
          Valor *
        </label>
        <input
          type="text"
          id="despesa-fixa-valor"
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

      {/* Descrição */}
      <div>
        <label htmlFor="despesa-fixa-descricao" className="block text-sm font-medium text-gray-700 mb-2">
          Descrição
        </label>
        <textarea
          id="despesa-fixa-descricao"
          name="descricao"
          value={formData.descricao}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          placeholder="Descrição adicional da despesa (opcional)"
        />
      </div>

      {/* Data de Vencimento */}
      <div>
        <label htmlFor="despesa-fixa-vencimento" className="block text-sm font-medium text-gray-700 mb-2">
          Data de Vencimento
        </label>
        <input
          type="date"
          id="despesa-fixa-vencimento"
          name="data_vencimento"
          value={formData.data_vencimento}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

    </form>
  )
}

export default FormDespesaFixa

