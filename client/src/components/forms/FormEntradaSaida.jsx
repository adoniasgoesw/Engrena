import React, { useState } from 'react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const FormEntradaSaida = ({ tipo, caixaAberto, onSave }) => {
  const { user } = useAuth()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const value = e.target.value
    // Formatar valores monetários (remover caracteres não numéricos exceto vírgula/ponto)
    const v = value.replace(/[^\d,]/g, '').replace(',', '.')
    setValor(v)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!descricao || descricao.trim() === '') {
      setError('A descrição é obrigatória')
      return
    }

    const valorNumerico = parseFloat(valor.replace(',', '.')) || 0
    if (valorNumerico <= 0) {
      setError(`O valor de ${tipo === 'entrada' ? 'entrada' : 'saída'} deve ser maior que zero`)
      return
    }

    if (!caixaAberto || !caixaAberto.id) {
      setError('Caixa não encontrado')
      return
    }

    try {
      setLoading(true)

      // Criar movimentação (que já atualiza entradas/saidas no caixa e salva em fluxo_caixa)
      const movimentacaoResponse = await fetch(`${API_URL}/api/auth/movimentacoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caixa_id: caixaAberto.id,
          tipo: tipo,
          descricao: descricao.trim(),
          valor: valorNumerico,
          usuario_id: user?.id || null
        }),
      })

      let data
      try {
        data = await movimentacaoResponse.json()
      } catch (jsonError) {
        const text = await movimentacaoResponse.text()
        console.error('❌ Resposta não é JSON:', text)
        setError(`Erro ao adicionar ${tipo === 'entrada' ? 'entrada' : 'saída'}: ${movimentacaoResponse.status} ${movimentacaoResponse.statusText}`)
        return
      }

      if (!movimentacaoResponse.ok) {
        setError(data.error || `Erro ao adicionar ${tipo === 'entrada' ? 'entrada' : 'saída'}`)
        return
      }

      // Buscar caixa atualizado para retornar
      try {
        const caixaResponse = await fetch(`${API_URL}/api/auth/caixas/aberto?estabelecimento_id=${user?.estabelecimento_id || user?.estabelecimento?.id}`)
        const caixaData = await caixaResponse.json()
        
        if (caixaResponse.ok && caixaData.caixa) {
          data.caixa = caixaData.caixa
        }
      } catch (caixaError) {
        console.warn('Aviso: Erro ao buscar caixa atualizado:', caixaError)
      }

      const resultData = {
        caixa: data.caixa,
        tipo: tipo,
        descricao: descricao.trim(),
        valor: valorNumerico
      }
      
      // Limpar formulário após sucesso
      setDescricao('')
      setValor('')
      
      onSave && onSave(resultData)
      window.dispatchEvent(new CustomEvent('modalSaveSuccess', { detail: resultData }))
      window.dispatchEvent(new CustomEvent('caixaAtualizado', { detail: data.caixa }))
      window.dispatchEvent(new CustomEvent('movimentacaoCriada'))
    } catch (err) {
      console.error(`Erro ao adicionar ${tipo}:`, err)
      setError(err.message || `Erro ao adicionar ${tipo === 'entrada' ? 'entrada' : 'saída'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!caixaAberto) {
    return (
      <div className="p-6 pt-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          Nenhum caixa aberto. Por favor, abra um caixa antes de adicionar {tipo === 'entrada' ? 'entradas' : 'saídas'}.
        </div>
      </div>
    )
  }

  return (
    <form className="modal-form p-6 pt-8 space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
            Descrição da {tipo === 'entrada' ? 'Entrada' : 'Saída'}
          </label>
          <input
            type="text"
            id="descricao"
            name="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder={`Descreva a ${tipo === 'entrada' ? 'entrada' : 'saída'}...`}
            autoFocus
            required
          />
        </div>

        <div>
          <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-2">
            Valor da {tipo === 'entrada' ? 'Entrada' : 'Saída'}
          </label>
          <input
            type="text"
            id="valor"
            name="valor"
            value={valor}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-semibold"
            placeholder="0,00"
            required
          />
        </div>
      </div>
    </form>
  )
}

export default FormEntradaSaida

