import React from 'react'
import FaturamentoMensal from './FaturamentoMensal'
import TopItensVendidos from './TopItensVendidos'
import TopClientesFrequentes from './TopClientesFrequentes'

const DashboardCharts = () => {
  return (
    <div className="w-full space-y-6">
      <FaturamentoMensal />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopItensVendidos />
        <TopClientesFrequentes />
      </div>
    </div>
  )
}

export default DashboardCharts

