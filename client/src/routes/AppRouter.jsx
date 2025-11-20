import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Acess from '../pages/Acess';
import Home from '../pages/Home';
import Categorias from '../pages/Categorias';
import Cliente from '../pages/Cliente';
import Veiculos from '../pages/Veiculos';
import ProdutosServicos from '../pages/ProdutosServicos';
import OrdemServicos from '../pages/OrdemServicos';
import Usuarios from '../pages/Usuarios';
import Relatorios from '../pages/Relatorios';
import ProtectedRoute from '../components/ProtectedRoute';
import RedirectIfLogged from '../components/RedirectIfLogged';

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RedirectIfLogged>
        <Acess />
      </RedirectIfLogged>
    ),
  },
  {
    path: "/login",
    element: (
      <RedirectIfLogged>
        <Acess />
      </RedirectIfLogged>
    ),
  },
  {
    path: "/register",
    element: (
      <RedirectIfLogged>
        <Acess />
      </RedirectIfLogged>
    ),
  },
  {
    path: "/home",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: "/categorias",
    element: (
      <ProtectedRoute>
        <Categorias />
      </ProtectedRoute>
    ),
  },
  {
    path: "/cliente",
    element: (
      <ProtectedRoute>
        <Cliente />
      </ProtectedRoute>
    ),
  },
  {
    path: "/veiculos",
    element: (
      <ProtectedRoute>
        <Veiculos />
      </ProtectedRoute>
    ),
  },
  {
    path: "/produtos-servicos",
    element: (
      <ProtectedRoute>
        <ProdutosServicos />
      </ProtectedRoute>
    ),
  },
  {
    path: "/ordem-servicos",
    element: (
      <ProtectedRoute>
        <OrdemServicos />
      </ProtectedRoute>
    ),
  },
  {
    path: "/usuarios",
    element: (
      <ProtectedRoute>
        <Usuarios />
      </ProtectedRoute>
    ),
  },
  {
    path: "/relatorios",
    element: (
      <ProtectedRoute>
        <Relatorios />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Página não encontrada</h2>
          <p className="text-gray-500 mb-6">A página que você está procurando não existe.</p>
          <a 
            href="/home" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    ),
  },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
