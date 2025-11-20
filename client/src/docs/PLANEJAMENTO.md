Planejamento do Sistema Engrena
================================

Este documento consolida visão, módulos, papéis e permissões, fluxos principais e métricas do dashboard.

Visão Geral
-----------
- Gestão de oficina: clientes, veículos, categorias, produtos/serviços, ordens de serviço, usuários, estoque, financeiro, relatórios e ajustes.
- Acesso baseado em cargos (RBAC) com hierarquia definida.

Módulos
-------
- Dashboard: KPIs (ordens por status, receita, clientes ativos), lista de O.S. com abas, gráficos (serviços, produtos, clientes, receita por mês).
- Clientes: CRUD completo.
- Usuários: CRUD completo com cargos e status.
- Veículos: CRUD, vinculado a clientes.
- Categorias: CRUD para classificar itens.
- Produtos e Serviços (itens): CRUD; serviços têm tempo estimado, produtos têm estoque e custo.
- Ordens de Serviço: abertura, acompanhamento por status, atribuição de responsável, inclusão de itens (produtos/serviços) e previsão de saída.
- Relatórios: vendas, usuários, clientes, receita, O.S. por período.
- Financeiro: receitas/despesas, faturas, visão de lucro (apenas cargos superiores).
- Estoque: cadastro e precificação, controle de níveis.
- Ajustes: configurações gerais.

Status das Ordens (padrão)
--------------------------
- Pendente, Em Andamento, Aprovada, Cancelada, Recusada, Aguardando Peças, Serviço Parado, Em Supervisão, Serviços Finalizados, Finalizado.

Fluxos Principais
-----------------
1) Criação de O.S.
- Status inicial: Pendente
- Após aceitação (mecânico/atendente): Em Andamento
- Pode evoluir conforme orçamento/peças/supervisão até Serviços Finalizados/Finalizado.

2) Atribuição de Responsável
- Dropdown na O.S. para escolher usuário responsável; salva imediatamente.

3) Itens em O.S.
- Listagem “carrinho”: quantidade, preço unitário, total e subtotal; origem de itens do catálogo de produtos/serviços.

4) Dashboard
- KPIs: contagem de O.S. Pendente e Em Andamento; Clientes Ativos; gráficos complementares.

Segurança e Acesso (resumo)
---------------------------
- RBAC por cargo; ver `CARGOS.md` para a matriz completa.
- Endpoints críticos exigem `estabelecimento_id` e validações de posse.

Roadmap (próximos)
------------------
- Relatórios detalhados por período com exportação.
- Movimentações de estoque a partir das O.S.
- Baixas financeiras integradas à conclusão de O.S.
- Logs/Auditoria por ação.


