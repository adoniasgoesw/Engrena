import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const ServicosMaisUtilizados = () => {
  const data = [
    { nome: 'Troca de Óleo', quantidade: 45 },
    { nome: 'Alinhamento', quantidade: 32 },
    { nome: 'Revisão Completa', quantidade: 28 },
    { nome: 'Troca de Freios', quantidade: 25 },
    { nome: 'Lavagem', quantidade: 40 },
    { nome: 'Balanceamento', quantidade: 22 },
    { nome: 'Troca de Bateria', quantidade: 18 }
  ]

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Serviços Mais Utilizados</h3>
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
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px'
            }}
          />
          <Legend />
          <Bar 
            dataKey="quantidade" 
            fill="#3b82f6" 
            radius={[8, 8, 0, 0]}
            name="Quantidade"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ServicosMaisUtilizados





























