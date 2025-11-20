import React, { useState, useEffect } from 'react'
import Sidebar from '../components/layout/Sidebar'
import { useSidebar } from '../contexts/SidebarContext'
import { useAuth } from '../contexts/AuthContext'
import { useModal } from '../contexts/ModalContext'
import { API_URL } from '../services/api'
import FiltrosOrdemServico from '../components/filters/FiltrosOrdemServico'
import TabelaRelatorioOrdens from '../components/lists/TabelaRelatorioOrdens'
import TabelaRelatorioFinanceiroOrdens from '../components/lists/TabelaRelatorioFinanceiroOrdens'
import TabelaRelatorioFinanceiroCaixa from '../components/lists/TabelaRelatorioFinanceiroCaixa'
import GerarRelatorioButton from '../components/buttons/GerarRelatorioButton'
import ExportarPDFButton from '../components/buttons/ExportarPDFButton'
import ExportarExcelButton from '../components/buttons/ExportarExcelButton'
import DetalhesOrdem from '../components/detalhes/DetalhesOrdem'

const Relatorios = () => {
  const { isCollapsed } = useSidebar()
  const { user } = useAuth()
  const { openModal } = useModal()
  
  // Estado principal
  const [tipoRelatorio, setTipoRelatorio] = useState('')
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Filtros para Ordem de Serviço
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroVeiculo, setFiltroVeiculo] = useState('')
  
  // Filtros para Financeiro
  const [subtipoFinanceiro, setSubtipoFinanceiro] = useState('')
  const [filtroFinanceiroDataInicio, setFiltroFinanceiroDataInicio] = useState('')
  const [filtroFinanceiroDataFim, setFiltroFinanceiroDataFim] = useState('')
  const [filtroFinanceiroCliente, setFiltroFinanceiroCliente] = useState('')
  
  // Filtros para Clientes e Veículos
  const [filtroClientesDataInicio, setFiltroClientesDataInicio] = useState('')
  const [filtroClientesDataFim, setFiltroClientesDataFim] = useState('')
  const [ordenarClientesPor, setOrdenarClientesPor] = useState('total_vendas')
  const [ordemClientes, setOrdemClientes] = useState('DESC')
  
  const [filtroVeiculosDataInicio, setFiltroVeiculosDataInicio] = useState('')
  const [filtroVeiculosDataFim, setFiltroVeiculosDataFim] = useState('')
  const [ordenarVeiculosPor, setOrdenarVeiculosPor] = useState('total_vendas')
  const [ordemVeiculos, setOrdemVeiculos] = useState('DESC')
  
  // Filtros para Produtos, Serviços e Categorias
  const [filtroProdutosDataInicio, setFiltroProdutosDataInicio] = useState('')
  const [filtroProdutosDataFim, setFiltroProdutosDataFim] = useState('')
  const [filtroProdutosCategoria, setFiltroProdutosCategoria] = useState('')
  
  const [filtroServicosDataInicio, setFiltroServicosDataInicio] = useState('')
  const [filtroServicosDataFim, setFiltroServicosDataFim] = useState('')
  const [filtroServicosCategoria, setFiltroServicosCategoria] = useState('')
  
  const [filtroCategoriasDataInicio, setFiltroCategoriasDataInicio] = useState('')
  const [filtroCategoriasDataFim, setFiltroCategoriasDataFim] = useState('')
  
  // Opções para dropdowns
  const [usuarios, setUsuarios] = useState([])
  const [clientes, setClientes] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [categorias, setCategorias] = useState([])

  // Carregar opções para filtros
  useEffect(() => {
    if (!user) return

    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (!estabelecimentoId) return

    // Carregar usuários (para ordem-servico)
    if (tipoRelatorio === 'ordem-servico') {
      fetch(`${API_URL}/api/auth/usuarios?estabelecimento_id=${estabelecimentoId}`)
        .then(res => res.json())
        .then(data => {
          if (data.usuarios || Array.isArray(data)) {
            setUsuarios(data.usuarios || data || [])
          }
        })
        .catch(err => console.error('Erro ao buscar usuários:', err))
    }

    // Carregar clientes (para vários tipos de relatório)
    if (['ordem-servico', 'financeiro', 'clientes'].includes(tipoRelatorio)) {
    fetch(`${API_URL}/api/auth/clientes?estabelecimento_id=${estabelecimentoId}`)
      .then(res => res.json())
      .then(data => {
        if (data.clientes || Array.isArray(data)) {
          setClientes(data.clientes || data || [])
        }
      })
      .catch(err => console.error('Erro ao buscar clientes:', err))
    }

    // Carregar veículos (para ordem-servico)
    if (tipoRelatorio === 'ordem-servico') {
      fetch(`${API_URL}/api/auth/veiculos?estabelecimento_id=${estabelecimentoId}`)
        .then(res => res.json())
        .then(data => {
          if (data.veiculos || Array.isArray(data)) {
            setVeiculos(data.veiculos || data || [])
          }
        })
        .catch(err => console.error('Erro ao buscar veículos:', err))
    }

    // Carregar categorias (para produtos, serviços e categorias)
    if (['produtos', 'servicos', 'categorias'].includes(tipoRelatorio)) {
      fetch(`${API_URL}/api/auth/categorias?estabelecimento_id=${estabelecimentoId}`)
        .then(res => res.json())
        .then(data => {
          if (data.categorias || Array.isArray(data)) {
            setCategorias(data.categorias || data || [])
          }
        })
        .catch(err => console.error('Erro ao buscar categorias:', err))
    }
  }, [user, tipoRelatorio])

  // Gerar relatório
  const handleGerarRelatorio = async () => {
    if (!tipoRelatorio) {
      alert('Selecione um tipo de relatório')
      return
    }

    setLoading(true)
    try {
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      if (!estabelecimentoId) return

      // Construir query params
      const params = new URLSearchParams({
        estabelecimento_id: estabelecimentoId,
        tipo: tipoRelatorio
      })

      if (tipoRelatorio === 'ordem-servico') {
        if (filtroDataInicio) params.append('data_inicio', filtroDataInicio)
        if (filtroDataFim) params.append('data_fim', filtroDataFim)
        if (filtroResponsavel) params.append('responsavel_id', filtroResponsavel)
        if (filtroCliente) params.append('cliente_id', filtroCliente)
        if (filtroVeiculo) params.append('veiculo_id', filtroVeiculo)
      }

      if (tipoRelatorio === 'financeiro') {
        if (!subtipoFinanceiro) {
          alert('Selecione um subtipo de relatório financeiro')
          setLoading(false)
          return
        }
        params.append('subtipo', subtipoFinanceiro)
        if (filtroFinanceiroDataInicio) params.append('data_inicio', filtroFinanceiroDataInicio)
        if (filtroFinanceiroDataFim) params.append('data_fim', filtroFinanceiroDataFim)
        if (subtipoFinanceiro === 'ordem-servico' && filtroFinanceiroCliente) {
          params.append('cliente_id', filtroFinanceiroCliente)
        }
      }

      if (tipoRelatorio === 'clientes') {
        if (filtroClientesDataInicio) params.append('data_inicio', filtroClientesDataInicio)
        if (filtroClientesDataFim) params.append('data_fim', filtroClientesDataFim)
        if (ordenarClientesPor) params.append('ordenar_por', ordenarClientesPor)
        if (ordemClientes) params.append('ordem', ordemClientes)
      }

      if (tipoRelatorio === 'veiculos') {
        if (filtroVeiculosDataInicio) params.append('data_inicio', filtroVeiculosDataInicio)
        if (filtroVeiculosDataFim) params.append('data_fim', filtroVeiculosDataFim)
        if (ordenarVeiculosPor) params.append('ordenar_por', ordenarVeiculosPor)
        if (ordemVeiculos) params.append('ordem', ordemVeiculos)
      }

      if (tipoRelatorio === 'produtos') {
        if (filtroProdutosDataInicio) params.append('data_inicio', filtroProdutosDataInicio)
        if (filtroProdutosDataFim) params.append('data_fim', filtroProdutosDataFim)
        if (filtroProdutosCategoria) params.append('categoria_id', filtroProdutosCategoria)
      }

      if (tipoRelatorio === 'servicos') {
        if (filtroServicosDataInicio) params.append('data_inicio', filtroServicosDataInicio)
        if (filtroServicosDataFim) params.append('data_fim', filtroServicosDataFim)
        if (filtroServicosCategoria) params.append('categoria_id', filtroServicosCategoria)
      }

      if (tipoRelatorio === 'categorias') {
        if (filtroCategoriasDataInicio) params.append('data_inicio', filtroCategoriasDataInicio)
        if (filtroCategoriasDataFim) params.append('data_fim', filtroCategoriasDataFim)
      }

      const url = `${API_URL}/api/auth/relatorios?${params.toString()}`
      console.log('URL da requisição:', url)
      
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setDados(data.dados || data.ordens || [])
        if ((data.dados || data.ordens || []).length === 0) {
          alert('Nenhum resultado encontrado para os filtros selecionados')
        }
      } else {
        console.error('Erro ao gerar relatório:', data)
        alert('Erro ao gerar relatório: ' + (data.error || data.details || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      alert('Erro ao gerar relatório. Verifique se o servidor está rodando.')
    } finally {
      setLoading(false)
    }
  }

  // Exportar PDF (placeholder)
  const handleExportarPDF = () => {
    alert('Funcionalidade de exportar PDF em desenvolvimento')
  }

  // Exportar Excel (placeholder)
  const handleExportarExcel = () => {
    alert('Funcionalidade de exportar Excel em desenvolvimento')
  }

  // Abrir detalhes da ordem
  const handleDetalhes = (ordemId) => {
    openModal(<DetalhesOrdem ordemId={ordemId} />, { hideButtons: true })
  }

  // Imprimir ordem (placeholder)
  const handleImprimir = (ordemId) => {
    alert(`Funcionalidade de imprimir ordem ${ordemId} em desenvolvimento`)
  }

  // Resetar filtros quando mudar tipo de relatório
  const handleTipoRelatorioChange = (value) => {
    setTipoRelatorio(value)
    setDados([])
    setFiltroDataInicio('')
    setFiltroDataFim('')
    setFiltroResponsavel('')
    setFiltroCliente('')
    setFiltroVeiculo('')
    setSubtipoFinanceiro('')
    setFiltroFinanceiroDataInicio('')
    setFiltroFinanceiroDataFim('')
    setFiltroFinanceiroCliente('')
    setFiltroClientesDataInicio('')
    setFiltroClientesDataFim('')
    setOrdenarClientesPor('total_vendas')
    setOrdemClientes('DESC')
    setFiltroVeiculosDataInicio('')
    setFiltroVeiculosDataFim('')
    setOrdenarVeiculosPor('total_vendas')
    setOrdemVeiculos('DESC')
    setFiltroProdutosDataInicio('')
    setFiltroProdutosDataFim('')
    setFiltroProdutosCategoria('')
    setFiltroServicosDataInicio('')
    setFiltroServicosDataFim('')
    setFiltroServicosCategoria('')
    setFiltroCategoriasDataInicio('')
    setFiltroCategoriasDataFim('')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Relatórios</h1>
              <p className="text-sm text-gray-600 mt-1.5">Gere relatórios personalizados do sistema</p>
            </div>

            {/* Seleção de Tipo de Relatório */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Relatório
              </label>
              <select
                value={tipoRelatorio}
                onChange={(e) => handleTipoRelatorioChange(e.target.value)}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm bg-white"
              >
                <option value="">Selecione o tipo de relatório</option>
                <option value="ordem-servico">Ordem de Serviço</option>
                <option value="clientes">Clientes</option>
                <option value="veiculos">Veículos</option>
                <option value="produtos">Produtos</option>
                <option value="servicos">Serviços</option>
                <option value="categorias">Categorias</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </div>

            {/* Filtros Dinâmicos */}
            {tipoRelatorio === 'ordem-servico' && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Filtros</h3>
                <FiltrosOrdemServico
                  filtroDataInicio={filtroDataInicio}
                  setFiltroDataInicio={setFiltroDataInicio}
                  filtroDataFim={filtroDataFim}
                  setFiltroDataFim={setFiltroDataFim}
                  filtroResponsavel={filtroResponsavel}
                  setFiltroResponsavel={setFiltroResponsavel}
                  filtroCliente={filtroCliente}
                  setFiltroCliente={setFiltroCliente}
                  filtroVeiculo={filtroVeiculo}
                  setFiltroVeiculo={setFiltroVeiculo}
                  usuarios={usuarios}
                  clientes={clientes}
                  veiculos={veiculos}
                />
              </div>
            )}

            {/* Filtros para Financeiro */}
            {tipoRelatorio === 'financeiro' && (
              <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Filtros</h3>
                
                {/* Subtipo Financeiro */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tipo de Relatório Financeiro
                  </label>
                  <select
                    value={subtipoFinanceiro}
                    onChange={(e) => {
                      setSubtipoFinanceiro(e.target.value)
                      setDados([])
                      setFiltroFinanceiroDataInicio('')
                      setFiltroFinanceiroDataFim('')
                      setFiltroFinanceiroCliente('')
                    }}
                    className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm bg-white"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="ordem-servico">Ordem de Serviço</option>
                    <option value="caixa">Caixa</option>
                  </select>
                </div>

                {/* Filtros para Ordem de Serviço (Financeiro) */}
                {subtipoFinanceiro === 'ordem-servico' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Data Início
                      </label>
                      <input
                        type="date"
                        value={filtroFinanceiroDataInicio}
                        onChange={(e) => setFiltroFinanceiroDataInicio(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Data Fim
                      </label>
                      <input
                        type="date"
                        value={filtroFinanceiroDataFim}
                        onChange={(e) => setFiltroFinanceiroDataFim(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Cliente
                      </label>
                      <select
                        value={filtroFinanceiroCliente}
                        onChange={(e) => setFiltroFinanceiroCliente(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm bg-white"
                      >
                        <option value="">Todos</option>
                        {clientes.map(cliente => (
                          <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Filtros para Caixa */}
                {subtipoFinanceiro === 'caixa' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Data Início
                      </label>
                      <input
                        type="date"
                        value={filtroFinanceiroDataInicio}
                        onChange={(e) => setFiltroFinanceiroDataInicio(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Data Fim
                      </label>
                      <input
                        type="date"
                        value={filtroFinanceiroDataFim}
                        onChange={(e) => setFiltroFinanceiroDataFim(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filtros para Clientes */}
            {tipoRelatorio === 'clientes' && (
              <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Início</label>
                    <input
                      type="date"
                      value={filtroClientesDataInicio}
                      onChange={(e) => setFiltroClientesDataInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Fim</label>
                    <input
                      type="date"
                      value={filtroClientesDataFim}
                      onChange={(e) => setFiltroClientesDataFim(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ordenar Por</label>
                    <select
                      value={ordenarClientesPor}
                      onChange={(e) => setOrdenarClientesPor(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm bg-white"
                    >
                      <option value="total_vendas">Total de Vendas</option>
                      <option value="faturamento">Faturamento</option>
                      <option value="lucro">Lucro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ordem</label>
                    <select
                      value={ordemClientes}
                      onChange={(e) => setOrdemClientes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm bg-white"
                    >
                      <option value="DESC">Decrescente</option>
                      <option value="ASC">Crescente</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros para Veículos */}
            {tipoRelatorio === 'veiculos' && (
              <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Início</label>
                    <input
                      type="date"
                      value={filtroVeiculosDataInicio}
                      onChange={(e) => setFiltroVeiculosDataInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Fim</label>
                    <input
                      type="date"
                      value={filtroVeiculosDataFim}
                      onChange={(e) => setFiltroVeiculosDataFim(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ordenar Por</label>
                    <select
                      value={ordenarVeiculosPor}
                      onChange={(e) => setOrdenarVeiculosPor(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm bg-white"
                    >
                      <option value="total_vendas">Total de Vendas</option>
                      <option value="faturamento">Faturamento</option>
                      <option value="lucro">Lucro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ordem</label>
                    <select
                      value={ordemVeiculos}
                      onChange={(e) => setOrdemVeiculos(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm bg-white"
                    >
                      <option value="DESC">Decrescente</option>
                      <option value="ASC">Crescente</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros para Produtos */}
            {tipoRelatorio === 'produtos' && (
              <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Início</label>
                    <input
                      type="date"
                      value={filtroProdutosDataInicio}
                      onChange={(e) => setFiltroProdutosDataInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Fim</label>
                    <input
                      type="date"
                      value={filtroProdutosDataFim}
                      onChange={(e) => setFiltroProdutosDataFim(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                    <select
                      value={filtroProdutosCategoria}
                      onChange={(e) => setFiltroProdutosCategoria(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm bg-white"
                    >
                      <option value="">Todas</option>
                      {categorias.map(categoria => (
                        <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros para Serviços */}
            {tipoRelatorio === 'servicos' && (
              <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Início</label>
                    <input
                      type="date"
                      value={filtroServicosDataInicio}
                      onChange={(e) => setFiltroServicosDataInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Fim</label>
                    <input
                      type="date"
                      value={filtroServicosDataFim}
                      onChange={(e) => setFiltroServicosDataFim(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                    <select
                      value={filtroServicosCategoria}
                      onChange={(e) => setFiltroServicosCategoria(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm bg-white"
                    >
                      <option value="">Todas</option>
                      {categorias.map(categoria => (
                        <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros para Categorias */}
            {tipoRelatorio === 'categorias' && (
              <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Início</label>
                    <input
                      type="date"
                      value={filtroCategoriasDataInicio}
                      onChange={(e) => setFiltroCategoriasDataInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Fim</label>
                    <input
                      type="date"
                      value={filtroCategoriasDataFim}
                      onChange={(e) => setFiltroCategoriasDataFim(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            {tipoRelatorio && (
              <div className="flex items-center gap-3">
                <GerarRelatorioButton
                  onClick={handleGerarRelatorio}
                  loading={loading}
                  disabled={!tipoRelatorio}
                />
                
                {dados.length > 0 && (
                  <>
                    <ExportarPDFButton onClick={handleExportarPDF} />
                    <ExportarExcelButton onClick={handleExportarExcel} />
                  </>
                )}
              </div>
            )}

            {/* Tabela de Resultados */}
            {dados.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                  Resultados ({dados.length} registro{dados.length !== 1 ? 's' : ''})
                </h3>
                {tipoRelatorio === 'ordem-servico' && (
                  <TabelaRelatorioOrdens
                    dados={dados}
                    onDetalhes={handleDetalhes}
                    onImprimir={handleImprimir}
                  />
                )}
                {tipoRelatorio === 'financeiro' && subtipoFinanceiro === 'ordem-servico' && (
                  <TabelaRelatorioFinanceiroOrdens
                    dados={dados}
                    onDetalhes={handleDetalhes}
                    onImprimir={handleImprimir}
                  />
                )}
                {tipoRelatorio === 'financeiro' && subtipoFinanceiro === 'caixa' && (
                  <TabelaRelatorioFinanceiroCaixa
                    dados={dados}
                  />
                )}
                {tipoRelatorio === 'clientes' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total de Vendas</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faturamento</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dados.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.cliente_nome}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total_vendas}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {Number(item.faturamento || 0).toFixed(2).replace('.', ',')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {Number(item.lucro || 0).toFixed(2).replace('.', ',')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {tipoRelatorio === 'veiculos' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veículo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total de Vendas</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faturamento</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dados.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.veiculo_descricao}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total_vendas}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {Number(item.faturamento || 0).toFixed(2).replace('.', ',')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {Number(item.lucro || 0).toFixed(2).replace('.', ',')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {tipoRelatorio === 'produtos' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade Vendida</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faturamento</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dados.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.produto_nome}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.categoria_nome}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(item.quantidade_vendida || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {Number(item.faturamento || 0).toFixed(2).replace('.', ',')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {Number(item.custo_total || 0).toFixed(2).replace('.', ',')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {Number(item.lucro || 0).toFixed(2).replace('.', ',')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {tipoRelatorio === 'servicos' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serviço</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade Vendida</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faturamento</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dados.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.servico_nome}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.categoria_nome}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantidade_vendida}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {Number(item.faturamento || 0).toFixed(2).replace('.', ',')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {tipoRelatorio === 'categorias' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Produtos</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Serviços</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faturamento</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dados.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.categoria_nome}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total_produtos || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total_servicos || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {Number(item.faturamento || 0).toFixed(2).replace('.', ',')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {Number(item.custo_total || 0).toFixed(2).replace('.', ',')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {Number(item.lucro || 0).toFixed(2).replace('.', ',')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Relatorios
