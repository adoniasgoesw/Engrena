import React from 'react'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const PerformanceMensal = () => {
  const data = [
    { mes: 'Jan', ordens: 45, receita: 12000, satisfacao: 4.2 },
    { mes: 'Fev', ordens: 52, receita: 15000, satisfacao: 4.5 },
    { mes: 'Mar', ordens: 58, receita: 18000, satisfacao: 4.6 },
    { mes: 'Abr', ordens: 48, receita: 14200, satisfacao: 4.3 },
    { mes: 'Mai', ordens: 55, receita: 16500, satisfacao: 4.7 },
    { mes: 'Jun', ordens: 62, receita: 19200, satisfacao: 4.8 }
  ]

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Mensal</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="mes" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            domain={[3, 5]}
            label={{ value: 'Satisfação', angle: -90, position: 'insideRight' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px'
            }}
            formatter={(value, name) => {
              if (name === 'receita') return [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']
              if (name === 'satisfacao') return [value.toFixed(1), 'Satisfação']
              return [value, name === 'ordens' ? 'Ordens' : '']
            }}
          />
          <Legend />
          <Bar 
            yAxisId="left"
            dataKey="ordens" 
            fill="#8b5cf6" 
            radius={[8, 8, 0, 0]}
            name="Ordens"
          />
          <Bar 
            yAxisId="left"
            dataKey="receita" 
            fill="#3b82f6" 
            radius={[8, 8, 0, 0]}
            name="Receita (R$)"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="satisfacao" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 5 }}
            activeDot={{ r: 7 }}
            name="Satisfação"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PerformanceMensal





























