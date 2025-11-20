import React, { useState, useEffect } from 'react'
import ListBase from './ListBase'
import { Info } from 'lucide-react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useModal } from '../../contexts/ModalContext'
import DetalhesFinanceiro from '../detalhes/DetalhesFinanceiro'

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDateAbreviada = (dateString) => {
  if (!dateString) return '--'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const ListCaixa = ({ topButton = null }) => {
  const { user } = useAuth()
  const { openModal } = useModal()
  const [caixas, setCaixas] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCaixas = async () => {
    try {
      setLoading(true)
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoId) {
        setCaixas([])
        setLoading(false)
        return
      }

      // Buscar apenas caixas fechados (status = false)
      const url = `${API_URL}/api/auth/caixas?estabelecimento_id=${estabelecimentoId}&status=false`
      const response = await fetch(url)
      const data = await response.json()
      
      if (response.ok) {
        setCaixas(data.caixas || [])
      } else {
        console.error('Erro ao buscar caixas:', data.error)
        setCaixas([])
      }
    } catch (error) {
      console.error('Erro ao buscar caixas:', error)
      setCaixas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchCaixas()
    }

    // Escutar eventos de atualização
    const handleCaixaFechado = () => {
      fetchCaixas()
    }

    const handleCaixaAtualizado = () => {
      fetchCaixas()
    }

    window.addEventListener('caixaFechado', handleCaixaFechado)
    window.addEventListener('caixaAtualizado', handleCaixaAtualizado)
    
    return () => {
      window.removeEventListener('caixaFechado', handleCaixaFechado)
      window.removeEventListener('caixaAtualizado', handleCaixaAtualizado)
    }
  }, [user])

  const handleDetalhes = (caixa) => {
    openModal(<DetalhesFinanceiro caixaId={caixa.id} />, { hideButtons: true })
  }

  const columns = [
    {
      header: 'Data de abertura',
      key: 'criado_em',
      render: (row) => (
        <span className="text-gray-900">
          {formatDateAbreviada(row.criado_em)}
        </span>
      )
    },
    {
      header: 'Valor de abertura',
      key: 'valor_abertura',
      render: (row) => (
        <span className="text-gray-900 font-medium">
          {formatCurrency(row.valor_abertura || 0)}
        </span>
      )
    },
    {
      header: 'Valor de fechamento',
      key: 'valor_fechamento',
      render: (row) => (
        <span className="text-gray-900 font-medium">
          {formatCurrency(row.valor_fechamento || 0)}
        </span>
      )
    },
    {
      header: 'Diferença',
      key: 'diferenca',
      render: (row) => {
        const diferenca = parseFloat(row.diferenca || 0)
        const isPositiva = diferenca >= 0
        return (
          <span className={`font-semibold ${isPositiva ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(diferenca)}
          </span>
        )
      }
    },
    {
      header: 'Detalhes',
      key: 'detalhes',
      width: '80px',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDetalhes(row)
          }}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors duration-200"
          title="Ver detalhes"
        >
          <Info className="w-4 h-4" />
        </button>
      )
    }
  ]

  return (
    <ListBase
      columns={columns}
      data={caixas}
      loading={loading}
      hideCheckboxes={true}
      topButton={topButton}
      emptyMessage="Nenhum caixa fechado encontrado"
      headerMarginTop={true}
    />
  )
}

export default ListCaixa

