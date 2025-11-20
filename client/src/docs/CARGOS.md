Cargos e Permissões (RBAC)
==========================

Hierarquia (do maior para o menor)
----------------------------------
1. Administrador
2. Gerente
3. Atendente
4. Caixa
5. Mecânico
6. Assistente Mecânico
7. Entregador

Matriz de Permissões (resumo)
-----------------------------

Legenda: ✅ permitido | ❌ negado | ⚠️ restrito/limitado

| Módulo / Ação                    | Admin | Gerente | Atendente | Caixa | Mecânico | Assist. Mecânico | Entregador |
|----------------------------------|:-----:|:-------:|:---------:|:-----:|:-------:|:----------------:|:----------:|
| Dashboard (visualização)         |  ✅   |   ✅    |    ✅     |  ✅   |   ✅    |        ✅        |     ✅     |
| Clientes (CRUD)                  |  ✅   |   ✅    |    ✅     |  ⚠️   |   ❌    |        ✅        |     ❌     |
| Usuários (CRUD)                  |  ✅   |   ✅    |    ❌     |  ❌   |   ❌    |        ✅        |     ❌     |
| Veículos (CRUD)                  |  ✅   |   ✅    |    ✅     |  ⚠️   |   ❌    |        ✅        |     ❌     |
| Categorias (CRUD)                |  ✅   |   ✅    |    ✅     |  ⚠️   |   ❌    |        ✅        |     ❌     |
| Produtos e Serviços (CRUD)       |  ✅   |   ✅    |    ✅     |  ⚠️   |   ❌    |        ✅        |     ❌     |
| Ordens de Serviço - Acesso       |  ✅   |   ✅    |    ✅     |  ✅   |   ✅    |        ✅        |     ⚠️     |
| O.S. - Mudar Status              |  ✅   |   ✅    |    ✅     |  ✅   |   ✅    |        ✅        |     ⚠️     |
| O.S. - Adicionar Itens           |  ✅   |   ✅    |    ✅     |  ⚠️   |   ✅    |        ✅        |     ❌     |
| O.S. - Edição Completa           |  ✅   |   ✅    |    ⚠️     |  ❌   |   ✅    |        ⚠️        |     ❌     |
| Relatórios (gerar)               |  ✅   |   ✅    |    ✅     |  ⚠️   |   ❌    |        ✅        |     ❌     |
| Financeiro (receitas/despesas)   |  ✅   |   ✅    |    ❌     |  ✅   |   ❌    |        ❌        |     ❌     |
| Estoque (cadastro/precificação)  |  ✅   |   ✅    |    ✅     |  ✅   |   ❌    |        ✅        |     ❌     |
| Ajustes (configurações)          |  ✅   |   ✅    |    ❌     |  ❌   |   ❌    |        ❌        |     ❌     |

Notas
-----
- Mecânico: "total liberdade" dentro da O.S. (mudar status, adicionar itens, editar dados da O.S.).
- Assistente Mecânico: pode operar a gestão (clientes, usuários, veículos, categorias, itens), abrir O.S. e gerar relatórios, mas sem acesso ao financeiro; acesso ao estoque permitido.
- Atendente: acompanha e altera status das O.S., sem acesso ao financeiro; pode operar cadastros básicos conforme regras do negócio.
- Caixa: foca em cobranças/financeiro e acompanhamento de O.S. para faturamento.
- Entregador: acesso de leitura ao necessário para entrega; movimentações de O.S. podem ser restritas.

Diretrizes Técnicas
-------------------
- Implementar RBAC no backend com middleware de autorização por rota.
- No frontend, ocultar navegação e ações não permitidas pelo cargo.
- Logar alterações críticas (status de O.S., exclusões, financeiros).


