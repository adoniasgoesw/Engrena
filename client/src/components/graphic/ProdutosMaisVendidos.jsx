import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const ProdutosMaisVendidos = () => {
  const data = [
    { nome: 'Óleo 5W30', quantidade: 120, receita: 4800 },
    { nome: 'Filtro de Óleo', quantidade: 95, receita: 2850 },
    { nome: 'Pastilhas Freio', quantidade: 68, receita: 5440 },
    { nome: 'Bateria 60Ah', quantidade: 45, receita: 6750 },
    { nome: 'Filtro de Ar', quantidade: 82, receita: 2460 },
    { nome: 'Correia Dentada', quantidade: 35, receita: 2800 }
  ]

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          <YAxis 
            yAxisId="right" 
            orientation="right"
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
              if (name === 'receita') return [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']
              return [value, name === 'quantidade' ? 'Quantidade' : '']
            }}
          />
          <Legend />
          <Bar 
            yAxisId="left"
            dataKey="quantidade" 
            fill="#10b981" 
            radius={[8, 8, 0, 0]}
            name="Quantidade"
          />
          <Bar 
            yAxisId="right"
            dataKey="receita" 
            fill="#8b5cf6" 
            radius={[8, 8, 0, 0]}
            name="Receita (R$)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ProdutosMaisVendidos





























