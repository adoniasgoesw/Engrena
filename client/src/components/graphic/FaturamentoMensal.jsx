import React, { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts'
import { API_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { TrendingUp, DollarSign, Calendar } from 'lucide-react'

const FaturamentoMensal = () => {
  const { user } = useAuth()
  const [periodo, setPeriodo] = useState('meses')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  // Função para buscar faturamento mensal (últimos 6 meses)
  const fetchFaturamentoMensal = async () => {
    try {
      setLoading(true)
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoId) {
        setData([])
        setLoading(false)
        return
      }

      // Calcular os últimos 6 meses (incluindo o mês atual)
      const hoje = new Date()
      const meses = []
      for (let i = 5; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
        meses.push({
          ano: data.getFullYear(),
          mes: data.getMonth() + 1,
          nome: data.toLocaleDateString('pt-BR', { month: 'short' })
        })
      }

      // Buscar faturamento e contagem de ordens de cada mês
      const faturamentoData = await Promise.all(
        meses.map(async (mesInfo) => {
          try {
            const [faturamentoRes, ordensRes] = await Promise.all([
              fetch(
                `${API_URL}/api/auth/caixas/faturamento?estabelecimento_id=${estabelecimentoId}&ano=${mesInfo.ano}&mes=${mesInfo.mes}`
              ),
              fetch(
                `${API_URL}/api/auth/caixas/contagem-ordens-mensal?estabelecimento_id=${estabelecimentoId}&ano=${mesInfo.ano}&mes=${mesInfo.mes}`
              )
            ])
            const faturamentoResult = await faturamentoRes.json()
            const ordensResult = await ordensRes.json()
            return {
              periodo: mesInfo.nome,
              faturamento: parseFloat(faturamentoResult.faturamento || 0),
              total_ordens: parseInt(ordensResult.total_ordens || 0)
            }
          } catch (error) {
            console.error(`Erro ao buscar faturamento de ${mesInfo.nome}:`, error)
            return {
              periodo: mesInfo.nome,
              faturamento: 0,
              total_ordens: 0
            }
          }
        })
      )

      setData(faturamentoData)
    } catch (error) {
      console.error('Erro ao buscar faturamento mensal:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Função para buscar faturamento anual (últimos 6 anos)
  const fetchFaturamentoAnual = async () => {
    try {
      setLoading(true)
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoId) {
        setData([])
        setLoading(false)
        return
      }

      // Calcular os últimos 6 anos (incluindo o ano atual)
      const hoje = new Date()
      const anos = []
      for (let i = 5; i >= 0; i--) {
        const ano = hoje.getFullYear() - i
        anos.push({
          ano: ano,
          nome: ano.toString()
        })
      }

      // Buscar faturamento e contagem de ordens de cada ano
      const faturamentoData = await Promise.all(
        anos.map(async (anoInfo) => {
          try {
            const [faturamentoRes, ordensRes] = await Promise.all([
              fetch(
                `${API_URL}/api/auth/caixas/faturamento-anual?estabelecimento_id=${estabelecimentoId}&ano=${anoInfo.ano}`
              ),
              fetch(
                `${API_URL}/api/auth/caixas/contagem-ordens-anual?estabelecimento_id=${estabelecimentoId}&ano=${anoInfo.ano}`
              )
            ])
            const faturamentoResult = await faturamentoRes.json()
            const ordensResult = await ordensRes.json()
            return {
              periodo: anoInfo.nome,
              faturamento: parseFloat(faturamentoResult.faturamento || 0),
              total_ordens: parseInt(ordensResult.total_ordens || 0)
            }
          } catch (error) {
            console.error(`Erro ao buscar faturamento de ${anoInfo.nome}:`, error)
            return {
              periodo: anoInfo.nome,
              faturamento: 0,
              total_ordens: 0
            }
          }
        })
      )

      setData(faturamentoData)
    } catch (error) {
      console.error('Erro ao buscar faturamento anual:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      if (periodo === 'meses') {
        fetchFaturamentoMensal()
      } else if (periodo === 'anos') {
        fetchFaturamentoAnual()
      }
    }
  }, [user, periodo])

  // Formatar valor para exibição
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Formatar valor compacto para exibição no gráfico (com decimais quando necessário)
  const formatCurrencyCompact = (value) => {
    if (value >= 1000000) {
      const valorM = Math.floor(value / 100000) / 10 // Truncar para 1 decimal
      return `R$ ${valorM.toFixed(1)}M`
    } else if (value >= 1000) {
      // Truncar ao invés de arredondar para mostrar valores precisos
      const valorK = Math.floor(value / 100) / 10 // Truncar para 1 decimal
      if (valorK % 1 === 0) {
        return `R$ ${valorK.toFixed(0)}k`
      } else {
        return `R$ ${valorK.toFixed(1)}k`
      }
    }
    return formatCurrency(value)
  }

  // Calcular intervalo do eixo Y dinamicamente
  const calcularIntervaloY = useMemo(() => {
    if (data.length === 0) return { domain: [0, 10000], ticks: [0, 2000, 4000, 6000, 8000, 10000] }
    
    const valores = data.map(d => d.faturamento)
    const maxValor = Math.max(...valores, 0)
    
    // Até 10k: incrementos de 2k (0, 2k, 4k, 6k, 8k, 10k)
    if (maxValor <= 10000) {
      let maxArredondado = Math.ceil(maxValor / 2000) * 2000
      if (maxArredondado < 10000) maxArredondado = 10000
      const ticks = []
      for (let i = 0; i <= maxArredondado; i += 2000) {
        ticks.push(i)
      }
      return { domain: [0, maxArredondado], ticks }
    }
    // Acima de 10k até 50k: começa em 20k, incrementos de 4k (0, 20k, 24k, 28k, 32k, 36k, 40k, 44k, 48k, 50k)
    else if (maxValor <= 50000) {
      const maxArredondado = Math.ceil(maxValor / 4000) * 4000
      const ticks = [0, 20000]
      for (let i = 24000; i <= maxArredondado; i += 4000) {
        ticks.push(i)
      }
      return { domain: [0, maxArredondado], ticks }
    }
    // De 50k até 100k: incrementos de 10k
    else if (maxValor <= 100000) {
      const maxArredondado = Math.ceil(maxValor / 10000) * 10000
      const ticks = [0, 50000]
      for (let i = 60000; i <= maxArredondado; i += 10000) {
        ticks.push(i)
      }
      return { domain: [0, maxArredondado], ticks }
    }
    // De 100k até 500k: incrementos de 50k
    else if (maxValor <= 500000) {
      const maxArredondado = Math.ceil(maxValor / 50000) * 50000
      const ticks = [0, 100000]
      for (let i = 150000; i <= maxArredondado; i += 50000) {
        ticks.push(i)
      }
      return { domain: [0, maxArredondado], ticks }
    }
    // De 500k até 1 milhão: incrementos de 100k
    else if (maxValor <= 1000000) {
      const maxArredondado = Math.ceil(maxValor / 100000) * 100000
      const ticks = [0, 500000]
      for (let i = 600000; i <= maxArredondado; i += 100000) {
        ticks.push(i)
      }
      return { domain: [0, maxArredondado], ticks }
    }
    // De 1 milhão até 10 milhões: incrementos de 1 milhão
    else if (maxValor <= 10000000) {
      const maxArredondado = Math.ceil(maxValor / 1000000) * 1000000
      const ticks = [0, 1000000]
      for (let i = 2000000; i <= maxArredondado; i += 1000000) {
        ticks.push(i)
      }
      return { domain: [0, maxArredondado], ticks }
    }
    // Acima de 10 milhões: incrementos de 10 milhões
    else {
      const maxArredondado = Math.ceil(maxValor / 10000000) * 10000000
      const ticks = [0, 10000000]
      for (let i = 20000000; i <= maxArredondado; i += 10000000) {
        ticks.push(i)
      }
      return { domain: [0, maxArredondado], ticks }
    }
  }, [data])

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    if (data.length === 0) return null
    
    const valores = data.map(d => d.faturamento)
    const total = valores.reduce((acc, val) => acc + val, 0)
    const maior = Math.max(...valores)
    const totalOrdens = data.reduce((acc, d) => acc + (d.total_ordens || 0), 0)
    const ticketMedio = totalOrdens > 0 ? total / totalOrdens : 0
    const crescimento = valores.length > 1 
      ? ((valores[valores.length - 1] - valores[valores.length - 2]) / valores[valores.length - 2] * 100)
      : 0

    return { total, maior, ticketMedio, crescimento }
  }, [data])

  // Custom label para mostrar valores nos pontos
  const CustomLabel = (props) => {
    const { x, y, value } = props
    if (!value || value === 0) return null
    return (
      <text
        x={x}
        y={y - 12}
        fill="#3b82f6"
        fontSize={11}
        fontWeight={700}
        textAnchor="middle"
        className="drop-shadow-sm"
      >
        {formatCurrencyCompact(value)}
      </text>
    )
  }

  // Custom tooltip moderno
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const valor = payload[0].value
      const periodo = payload[0].payload.periodo
      return (
        <div className="bg-white p-4 rounded-xl shadow-2xl border border-gray-100 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">{periodo}</p>
          </div>
          <div className="flex items-baseline gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(valor)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Carregando dados...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-xl border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Faturamento {periodo === 'meses' ? 'Mensal' : 'Anual'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Últimos 6 {periodo === 'meses' ? 'meses' : 'anos'}
            </p>
          </div>
        </div>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
        >
          <option value="meses">Meses</option>
          <option value="anos">Anos</option>
        </select>
      </div>

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</p>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(estatisticas.total)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket Médio</p>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(estatisticas.ticketMedio)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Maior</p>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(estatisticas.maior)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {estatisticas.crescimento >= 0 ? 'Crescimento' : 'Queda'}
              </p>
              <TrendingUp className={`w-4 h-4 ${estatisticas.crescimento >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <p className={`text-2xl font-bold ${estatisticas.crescimento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {estatisticas.crescimento >= 0 ? '+' : ''}{estatisticas.crescimento.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <ResponsiveContainer width="100%" height={450}>
          <LineChart 
            key={`${periodo}-${data.length}`}
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e5e7eb" 
              vertical={false}
            />
            <XAxis 
              dataKey="periodo" 
              tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              domain={calcularIntervaloY.domain}
              ticks={calcularIntervaloY.ticks}
              allowDecimals={false}
              tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }}
              tickFormatter={(value) => formatCurrencyCompact(value)}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="natural" 
              dataKey="faturamento" 
              stroke="#3b82f6" 
              strokeWidth={4}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
              dot={{ 
                r: 8, 
                fill: '#3b82f6', 
                stroke: '#fff', 
                strokeWidth: 3,
                className: 'drop-shadow-lg'
              }}
              activeDot={{ 
                r: 12, 
                fill: '#3b82f6',
                stroke: '#fff',
                strokeWidth: 3,
                className: 'drop-shadow-xl'
              }}
              name="Faturamento"
            >
              <LabelList content={<CustomLabel />} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default FaturamentoMensal
