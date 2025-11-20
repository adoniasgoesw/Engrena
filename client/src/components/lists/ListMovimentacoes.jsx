import React, { useState, useEffect } from 'react'
import ListBase from './ListBase'
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'R$ 0,00'
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDateTime = (dateString) => {
  if (!dateString) return '--'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const ListMovimentacoes = ({ topButton = null }) => {
  const { user } = useAuth()
  const [movimentacoes, setMovimentacoes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMovimentacoes = async () => {
    try {
      setLoading(true)
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoId) {
        setMovimentacoes([])
        setLoading(false)
        return
      }

      const url = `${API_URL}/api/auth/movimentacoes/caixa-aberto?estabelecimento_id=${estabelecimentoId}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (response.ok) {
        setMovimentacoes(data.movimentacoes || [])
      } else {
        console.error('Erro ao buscar movimentações:', data.error)
        setMovimentacoes([])
      }
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error)
      setMovimentacoes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchMovimentacoes()
    }

    // Escutar eventos de atualização
    const handleMovimentacaoCriada = () => {
      fetchMovimentacoes()
    }

    const handleCaixaAtualizado = () => {
      fetchMovimentacoes()
    }

    window.addEventListener('movimentacaoCriada', handleMovimentacaoCriada)
    window.addEventListener('caixaAtualizado', handleCaixaAtualizado)
    window.addEventListener('caixaAberto', handleCaixaAtualizado)
    
    return () => {
      window.removeEventListener('movimentacaoCriada', handleMovimentacaoCriada)
      window.removeEventListener('caixaAtualizado', handleCaixaAtualizado)
      window.removeEventListener('caixaAberto', handleCaixaAtualizado)
    }
  }, [user])

  const columns = [
    {
      header: 'Data/Hora',
      key: 'criado_em',
      render: (row) => (
        <span className="text-gray-900">
          {formatDateTime(row.criado_em)}
        </span>
      )
    },
    {
      header: 'Tipo',
      key: 'tipo',
      render: (row) => {
        const isEntrada = row.tipo === 'entrada'
        const Icon = isEntrada ? ArrowUpCircle : ArrowDownCircle
        return (
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${isEntrada ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`font-semibold capitalize ${isEntrada ? 'text-green-600' : 'text-red-600'}`}>
              {row.tipo === 'entrada' ? 'Entrada' : 'Saída'}
            </span>
          </div>
        )
      }
    },
    {
      header: 'Descrição',
      key: 'descricao',
      render: (row) => (
        <span className="text-gray-900">{row.descricao || '--'}</span>
      )
    },
    {
      header: 'Valor',
      key: 'valor',
      render: (row) => {
        const isEntrada = row.tipo === 'entrada'
        return (
          <span className={`font-semibold ${isEntrada ? 'text-green-600' : 'text-red-600'}`}>
            {isEntrada ? '+' : '-'} {formatCurrency(row.valor)}
          </span>
        )
      }
    }
  ]

  return (
    <ListBase
      columns={columns}
      data={movimentacoes}
      loading={loading}
      hideCheckboxes={true}
      hideHeader={true}
      topButton={topButton}
      emptyMessage="Nenhuma movimentação encontrada"
      headerMarginTop={true}
    />
  )
}

export default ListMovimentacoes


















