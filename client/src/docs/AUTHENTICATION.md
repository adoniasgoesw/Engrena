# Sistema de Autenticação Persistente

## Visão Geral

Este sistema implementa autenticação persistente usando React Context API e localStorage, permitindo que usuários permaneçam logados mesmo após fechar e reabrir o navegador.

## Funcionalidades

### ✅ Login Persistente
- Dados do usuário são salvos no localStorage do navegador
- Login é mantido entre sessões do navegador
- Verificação automática ao carregar a aplicação

### ✅ Proteção de Rotas
- Rotas protegidas redirecionam para login se usuário não estiver autenticado
- Usuários logados são automaticamente redirecionados para home ao acessar páginas de login

### ✅ Gerenciamento de Estado Global
- Context API para gerenciar estado de autenticação
- Hook personalizado para facilitar uso da autenticação

## Arquivos Principais

### `contexts/AuthContext.jsx`
- Context principal para gerenciar estado de autenticação
- Funções: `login()`, `logout()`, `isAuthenticated()`
- Verificação automática do localStorage ao inicializar

### `hooks/useAuth.js`
- Hook personalizado que re-exporta o useAuth do contexto
- Interface limpa para usar autenticação em componentes

### `components/ProtectedRoute.jsx`
- Componente para proteger rotas que requerem autenticação
- Redireciona para login se usuário não estiver logado
- Mostra loading durante verificação

### `components/RedirectIfLogged.jsx`
- Componente para redirecionar usuários logados
- Usado nas páginas de login/registro
- Evita que usuários logados vejam páginas de login

## Como Usar

### 1. Em Componentes
```jsx
import { useAuth } from '../hooks/useAuth';

const MeuComponente = () => {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  // Verificar se está logado
  if (isAuthenticated()) {
    return <div>Bem-vindo, {user.nome}!</div>;
  }
  
  return <div>Faça login para continuar</div>;
};
```

### 2. Proteger Rotas
```jsx
import ProtectedRoute from '../components/ProtectedRoute';

// No router
{
  path: "/dashboard",
  element: (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  ),
}
```

### 3. Redirecionar Usuários Logados
```jsx
import RedirectIfLogged from '../components/RedirectIfLogged';

// No router
{
  path: "/login",
  element: (
    <RedirectIfLogged>
      <LoginPage />
    </RedirectIfLogged>
  ),
}
```

## Fluxo de Autenticação

1. **Usuário acessa a aplicação**
   - Sistema verifica localStorage
   - Se há dados válidos, usuário fica logado automaticamente
   - Se não há dados, redireciona para login

2. **Usuário faz login**
   - Dados são validados no servidor
   - Se válidos, dados são salvos no localStorage
   - Usuário é redirecionado para home

3. **Usuário navega pela aplicação**
   - Todas as rotas protegidas verificam autenticação
   - Se não estiver logado, redireciona para login

4. **Usuário faz logout**
   - Dados são removidos do localStorage
   - Usuário é redirecionado para login

## Dados Armazenados

O localStorage armazena:
```json
{
  "user": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@email.com",
    "cpf": "123.456.789-00",
    "estabelecimento_id": 1,
    "estabelecimento_nome": "Oficina do João",
    // ... outros dados do usuário
  }
}
```

## Segurança

- Senhas nunca são armazenadas no localStorage
- Dados sensíveis são removidos antes de salvar
- Verificação de autenticação em todas as rotas protegidas
- Limpeza automática de dados corrompidos

## Tratamento de Erros

- Erros de localStorage são capturados e tratados
- Dados corrompidos são automaticamente removidos
- Fallback para estado não autenticado em caso de erro





