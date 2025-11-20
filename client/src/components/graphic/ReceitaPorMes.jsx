import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const ReceitaPorMes = () => {
  const data = [
    { mes: 'Jan', receita: 12000, gastos: 8000 },
    { mes: 'Fev', receita: 15000, gastos: 9500 },
    { mes: 'Mar', receita: 18000, gastos: 11000 },
    { mes: 'Abr', receita: 14200, gastos: 9200 },
    { mes: 'Mai', receita: 16500, gastos: 10500 },
    { mes: 'Jun', receita: 19200, gastos: 11800 }
  ]

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita por Mês</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="mes" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px'
            }}
            formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="receita" 
            stroke="#3b82f6" 
            fillOpacity={1} 
            fill="url(#colorReceita)" 
            name="Receita"
          />
          <Area 
            type="monotone" 
            dataKey="gastos" 
            stroke="#ef4444" 
            fillOpacity={1} 
            fill="url(#colorGastos)" 
            name="Gastos"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ReceitaPorMes





























