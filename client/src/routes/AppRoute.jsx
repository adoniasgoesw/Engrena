import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from '../pages/Landing.jsx'
import Home from '../pages/Home.jsx'
import Historico from '../pages/Historico.jsx'
import Cliente from '../pages/Cliente.jsx'
import Veiculos from '../pages/Veiculos.jsx'
import Categorias from '../pages/Categorias.jsx'
import ProdutosServicos from '../pages/ProdutosServicos.jsx'
import OrdemServicos from '../pages/OrdemServicos.jsx'
import DetalhesOrdem from '../pages/DetalhesOrdem.jsx'
import Relatorios from '../pages/Relatorios.jsx'
import Financeiro from '../pages/Financeiro.jsx'
import Contas from '../pages/Contas.jsx'
import Estoque from '../pages/Estoque.jsx'
import Ajustes from '../pages/Ajustes.jsx'
import Usuarios from '../pages/Usuarios.jsx'

export default function AppRoute() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/cliente" element={<Cliente />} />
        <Route path="/veiculos" element={<Veiculos />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/produtos-servicos" element={<ProdutosServicos />} />
        <Route path="/ordem-servicos" element={<OrdemServicos />} />
        <Route path="/ordem-servicos/:id" element={<DetalhesOrdem />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/carteira" element={<Contas />} />
        <Route path="/contas" element={<Contas />} /> {/* Redirecionar rota antiga */}
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="/usuarios" element={<Usuarios />} />
      </Routes>
    </Router>
  )
}