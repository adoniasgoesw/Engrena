import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const ClientesMaisFrequentes = () => {
  const data = [
    { nome: 'João Silva', visitas: 12, valorTotal: 4800 },
    { nome: 'Maria Santos', visitas: 10, valorTotal: 4200 },
    { nome: 'Pedro Oliveira', visitas: 9, valorTotal: 3600 },
    { nome: 'Ana Costa', visitas: 8, valorTotal: 3200 },
    { nome: 'Carlos Mendes', visitas: 7, valorTotal: 2800 },
    { nome: 'Juliana Ferreira', visitas: 6, valorTotal: 2400 }
  ]

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Clientes Mais Frequentes</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="nome" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px'
            }}
            formatter={(value, name) => {
              if (name === 'valorTotal') return [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor Total']
              return [value, name === 'visitas' ? 'Visitas' : '']
            }}
          />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="visitas" 
            stroke="#f59e0b" 
            strokeWidth={3}
            dot={{ fill: '#f59e0b', r: 5 }}
            activeDot={{ r: 7 }}
            name="Visitas"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ClientesMaisFrequentes





























