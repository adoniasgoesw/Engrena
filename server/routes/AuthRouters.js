import express from 'express';
import { registerUser } from '../controllers/register.js';
import { loginUser } from '../controllers/login.js';
import { 
  createCategoria, 
  getCategorias, 
  updateCategoria, 
  deleteCategoria 
} from '../controllers/categoria.js';
import {
  createProduto,
  getProdutos,
  getProdutoById,
  updateProduto,
  deleteProduto,
  toggleStatusProduto
} from '../controllers/produto.js';
import { createServico, getServicos, updateServico, deleteServico, toggleStatusServico } from '../controllers/servico.js';
import { createOrdem, getOrdens, updateOrdemStatus, getOrdemItens, addOrdemItem, deleteOrdemItem, deleteOrdem, getOrdemDetalhes } from '../controllers/ordem.js';
import { gerarPDFOrdem } from '../controllers/ordemPDF.js';
import { gerarPDFPagamento } from '../controllers/ordemPDFPagamento.js';
import { gerarPDFPagamentoPago } from '../controllers/ordemPDFPagamentoPago.js';
import { gerarExcelOrdem } from '../controllers/ordemExcel.js';
import { gerarPDFDoExcel } from '../controllers/ordemExcelPDF.js';
import { enviarPDFPorEmail } from '../controllers/ordemEmail.js';
import { createSolicitacao, getSolicitacoes, updateSolicitacao, deleteSolicitacao } from '../controllers/solicitacao.js';
import { createChecklistItem, getChecklist, updateChecklistItem, deleteChecklistItem } from '../controllers/checklist.js';
import { createNotificacao, getNotificacoes, marcarComoLida, marcarTodasComoLidas, deleteNotificacao } from '../controllers/notificacao.js';
import { createPagamentoOrdem, getPagamentosOrdem, getParcelasPagamento, updateParcelaPagamento, gerarRecibo } from '../controllers/pagamento.js';
import { createCaixa, getCaixas, getCaixaAberto, getCaixaDetalhes, fecharCaixa, updateCaixa, getReceitaTotalCaixaAberto, getReceitaMensal, getFaturamentoMensal, getFaturamentoAnual, getContagemOrdensMensal, getContagemOrdensAnual, getTopItensVendidos, getTopClientesFrequentes } from '../controllers/caixa.js';
import { createMovimentacao, getMovimentacoes, getMovimentacoesCaixaAberto } from '../controllers/movimentacao.js';
import { getRelatorio } from '../controllers/relatorio.js';
import { createDespesa, getDespesas, getDespesaById, updateDespesa, deleteDespesa, getReceitaMensalDespesas, getDespesasMensal } from '../controllers/despesa.js';
import { createDespesaFixa, getDespesasFixas, getDespesaFixaById, updateDespesaFixa, deleteDespesaFixa } from '../controllers/despesaFixa.js';
import { createGastoMes, getGastosMes, getGastoMesById, updateGastoMes, deleteGastoMes } from '../controllers/despesaMes.js';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../controllers/usuario.js';
import {
  createCliente,
  getClientes,
  updateCliente,
  deleteCliente
} from '../controllers/cliente.js';
import {
  getVeiculos,
  createVeiculo,
  updateVeiculo,
  deleteVeiculo
} from '../controllers/veiculo.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Rotas de autenticação
router.post('/register', registerUser);
router.post('/login', loginUser);

// Rotas de categorias
router.post('/categorias', (req, res, next) => {
  upload.single('imagem')(req, res, (err) => {
    if (err) {
      console.error('Erro no multer:', err);
      return res.status(400).json({ 
        error: err.message || 'Erro no upload da imagem' 
      });
    }
    if (req.fileValidationError) {
      return res.status(400).json({ error: req.fileValidationError });
    }
    next();
  });
}, createCategoria);

router.get('/categorias', getCategorias);
router.put('/categorias/:id', updateCategoria);
router.delete('/categorias/:id', deleteCategoria);

// Rotas de clientes
router.post('/clientes', createCliente);
router.get('/clientes', getClientes);
router.put('/clientes/:id', updateCliente);
router.delete('/clientes/:id', deleteCliente);

// Rotas de veículos
router.post('/veiculos', createVeiculo);
router.get('/veiculos', getVeiculos);
router.put('/veiculos/:id', updateVeiculo);
router.delete('/veiculos/:id', deleteVeiculo);

// Rotas de produtos
router.post('/produtos', (req, res, next) => {
  upload.single('imagem')(req, res, (err) => {
    if (err) {
      console.error('Erro no multer:', err);
      return res.status(400).json({ 
        error: err.message || 'Erro no upload da imagem' 
      });
    }
    if (req.fileValidationError) {
      return res.status(400).json({ error: req.fileValidationError });
    }
    next();
  });
}, createProduto);

router.get('/produtos', getProdutos);
router.get('/produtos/:id', getProdutoById);
router.put('/produtos/:id', (req, res, next) => {
  upload.single('imagem')(req, res, (err) => {
    if (err) {
      console.error('Erro no multer:', err);
      return res.status(400).json({ 
        error: err.message || 'Erro no upload da imagem' 
      });
    }
    if (req.fileValidationError) {
      return res.status(400).json({ error: req.fileValidationError });
    }
    next();
  });
}, updateProduto);
router.delete('/produtos/:id', deleteProduto);
router.patch('/produtos/:id/status', toggleStatusProduto);

// Rotas de serviços
router.post('/servicos', (req, res, next) => {
  upload.single('imagem')(req, res, (err) => {
    if (err) {
      console.error('Erro no multer:', err);
      return res.status(400).json({ 
        error: err.message || 'Erro no upload da imagem' 
      });
    }
    if (req.fileValidationError) {
      return res.status(400).json({ error: req.fileValidationError });
    }
    next();
  });
}, createServico);

router.get('/servicos', getServicos);
router.put('/servicos/:id', (req, res, next) => {
  upload.single('imagem')(req, res, (err) => {
    if (err) {
      console.error('Erro no multer:', err);
      return res.status(400).json({ 
        error: err.message || 'Erro no upload da imagem' 
      });
    }
    if (req.fileValidationError) {
      return res.status(400).json({ error: req.fileValidationError });
    }
    next();
  });
}, updateServico);
router.delete('/servicos/:id', deleteServico);
router.patch('/servicos/:id/status', toggleStatusServico);

// Rotas de ordens de serviço
router.get('/ordens', getOrdens);
router.post('/ordens', createOrdem);
router.patch('/ordens/:id/status', updateOrdemStatus);
router.put('/ordens/:id/status', updateOrdemStatus);
router.put('/ordens/:id', updateOrdemStatus);
router.get('/ordens/:id/itens', getOrdemItens);
router.get('/ordens/:id/detalhes', getOrdemDetalhes);
router.get('/ordens/:id/pdf', gerarPDFOrdem);
router.get('/ordens/:id/pdf-pagamento', gerarPDFPagamento);
router.get('/ordens/:id/pdf-pagamento-pago', gerarPDFPagamentoPago);
router.get('/ordens/:id/excel', gerarExcelOrdem);
router.get('/ordens/:id/excel-pdf', gerarPDFDoExcel);
router.post('/ordens/:id/email', enviarPDFPorEmail);
router.post('/ordens/:id/itens', addOrdemItem);
router.delete('/ordens/:id/itens/:itemId', deleteOrdemItem);
router.delete('/ordens/:id', deleteOrdem);

// Rotas de solicitações
router.get('/ordens/:id/solicitacoes', getSolicitacoes);
router.post('/ordens/:id/solicitacoes', createSolicitacao);
router.put('/ordens/:id/solicitacoes/:solicitacaoId', updateSolicitacao);
router.delete('/ordens/:id/solicitacoes/:solicitacaoId', deleteSolicitacao);

// Rotas de checklist
router.get('/ordens/:id/checklist', getChecklist);
router.post('/ordens/:id/checklist', createChecklistItem);
router.put('/ordens/:id/checklist/:itemId', updateChecklistItem);
router.delete('/ordens/:id/checklist/:itemId', deleteChecklistItem);

// Rotas de pagamentos
router.get('/ordens/:id/pagamentos', getPagamentosOrdem);
router.post('/ordens/:id/pagamentos', createPagamentoOrdem);
router.get('/parcelas-pagamento', getParcelasPagamento);
router.put('/parcelas-pagamento/:id', updateParcelaPagamento);
router.get('/pagamento/:id/recibo', gerarRecibo);

// Rotas de notificações
router.get('/notificacoes', getNotificacoes);
router.post('/notificacoes', createNotificacao);
router.patch('/notificacoes/:id/lida', marcarComoLida);
router.post('/notificacoes/marcar-todas-lidas', marcarTodasComoLidas);
router.delete('/notificacoes/:id', deleteNotificacao);

// Rotas de usuários
router.get('/usuarios', getUsuarios);
router.post('/usuarios', createUsuario);
router.put('/usuarios/:id', updateUsuario);
router.delete('/usuarios/:id', deleteUsuario);

// Rotas de caixa
router.post('/caixas', createCaixa);
router.get('/caixas/:id/detalhes', getCaixaDetalhes);
router.get('/caixas', getCaixas);
router.get('/caixas/aberto', getCaixaAberto);
router.get('/caixas/receita-total', getReceitaTotalCaixaAberto);
router.get('/caixas/receita-mensal', getReceitaMensal);
router.get('/caixas/faturamento', getFaturamentoMensal);
router.get('/caixas/faturamento-anual', getFaturamentoAnual);
router.get('/caixas/contagem-ordens-mensal', getContagemOrdensMensal);
router.get('/caixas/contagem-ordens-anual', getContagemOrdensAnual);
router.get('/caixas/top-itens-vendidos', getTopItensVendidos);
router.get('/caixas/top-clientes-frequentes', getTopClientesFrequentes);
router.put('/caixas/:id/fechar', fecharCaixa);
router.put('/caixas/:id', updateCaixa);

// Rotas de movimentações
router.post('/movimentacoes', createMovimentacao);
router.get('/movimentacoes', getMovimentacoes);
router.get('/movimentacoes/caixa-aberto', getMovimentacoesCaixaAberto);

// Rotas de relatórios
router.get('/relatorios', getRelatorio);

// Rotas de despesas
router.post('/despesas', createDespesa);
router.get('/despesas', getDespesas);
router.get('/despesas/receita-mensal', getReceitaMensalDespesas);
router.get('/despesas/despesas-mensal', getDespesasMensal);
router.get('/despesas/:id', getDespesaById);
router.put('/despesas/:id', updateDespesa);
router.delete('/despesas/:id', deleteDespesa);

// Rotas de despesas fixas
router.post('/despesas-fixas', createDespesaFixa);
router.get('/despesas-fixas', getDespesasFixas);
router.get('/despesas-fixas/:id', getDespesaFixaById);
router.put('/despesas-fixas/:id', updateDespesaFixa);
router.delete('/despesas-fixas/:id', deleteDespesaFixa);

// Rotas de gastos do mês
router.post('/gastos-mes', createGastoMes);
router.get('/gastos-mes', getGastosMes);
router.get('/gastos-mes/:id', getGastoMesById);
router.put('/gastos-mes/:id', updateGastoMes);
router.delete('/gastos-mes/:id', deleteGastoMes);


export default router;
