import React, { useState } from 'react'
import { API_URL } from '../../services/api'
import { formatCPF, formatWhatsApp } from '../../utils/format'
import { useAuth } from '../../contexts/AuthContext'

const cargos = [
  'Administrador',
  'Assistente Mecânico',
  'Atendente',
  'Caixa',
  'Entregador',
  'Gerente',
  'Mecânico'
]

const FormUsuario = ({ usuario = null, onSave }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    nome: usuario?.nome || '',
    cpf: usuario?.cpf || '',
    whatsapp: usuario?.whatsapp || '',
    email: usuario?.email || '',
    senha: '',
    cargo: usuario?.cargo || cargos[0],
    status: usuario?.status || 'Ativo'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    let v = value
    if (name === 'cpf') v = formatCPF(value)
    if (name === 'whatsapp') v = formatWhatsApp(value)
    setFormData(prev => ({ ...prev, [name]: v }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      setLoading(true)
      const estabelecimento_id = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimento_id) {
        setError('Estabelecimento não identificado')
        return
      }
      const url = usuario ? `${API_URL}/api/auth/usuarios/${usuario.id}` : `${API_URL}/api/auth/usuarios`
      const method = usuario ? 'PUT' : 'POST'
      const payload = { ...formData, estabelecimento_id }
      if (usuario) {
        // Não enviar senha vazia em edição
        if (!payload.senha) delete payload.senha
      }
      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data?.error || 'Erro ao criar usuário')
      }
      onSave && onSave(data.usuario)
      
      // Disparar evento para adicionar/atualizar usuário diretamente na lista
      if (usuario) {
        // Usuário atualizado
        window.dispatchEvent(new CustomEvent('usuarioAtualizado', {
          detail: data.usuario
        }));
      } else {
        // Usuário criado
        window.dispatchEvent(new CustomEvent('addUsuario', {
          detail: data.usuario
        }));
      }
      
      window.dispatchEvent(new CustomEvent('refreshUsuarios'))
      window.dispatchEvent(new CustomEvent('modalSaveSuccess', { detail: data.usuario }))
    } catch (err) {
      setError(err.message || 'Erro ao criar usuário')
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

      {/* Nome */}
      <div>
        <label htmlFor="usuario-nome" className="block text-sm font-medium text-gray-700 mb-2">
          Nome *
        </label>
        <input
          type="text"
          id="usuario-nome"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="Digite o nome completo"
          required
        />
      </div>

      {/* CPF */}
      <div>
        <label htmlFor="usuario-cpf" className="block text-sm font-medium text-gray-700 mb-2">
          CPF *
        </label>
        <input
          type="text"
          id="usuario-cpf"
          name="cpf"
          value={formData.cpf}
          onChange={handleChange}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="000.000.000-00"
          required
        />
      </div>

      {/* WhatsApp */}
      <div>
        <label htmlFor="usuario-whatsapp" className="block text-sm font-medium text-gray-700 mb-2">
          WhatsApp *
        </label>
        <input
          type="text"
          id="usuario-whatsapp"
          name="whatsapp"
          value={formData.whatsapp}
          onChange={handleChange}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="(11) 99999-9999"
          required
        />
      </div>

      {/* E-mail */}
      <div>
        <label htmlFor="usuario-email" className="block text-sm font-medium text-gray-700 mb-2">
          E-mail *
        </label>
        <input
          type="email"
          id="usuario-email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="email@exemplo.com"
          required
        />
      </div>

      {/* Senha */}
      <div>
        <label htmlFor="usuario-senha" className="block text-sm font-medium text-gray-700 mb-2">
          Senha *
        </label>
        <input
          type="password"
          id="usuario-senha"
          name="senha"
          value={formData.senha}
          onChange={handleChange}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="Digite a senha"
          required
        />
      </div>

      {/* Cargo */}
      <div>
        <label htmlFor="usuario-cargo" className="block text-sm font-medium text-gray-700 mb-2">
          Cargo *
        </label>
        <select
          id="usuario-cargo"
          name="cargo"
          value={formData.cargo}
          onChange={handleChange}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          {cargos.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </form>
  )
}

export default FormUsuario


