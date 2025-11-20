import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RedirectIfLogged = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#207880] via-[#1A99BA] to-[#C2EDD2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se estiver autenticado, redirecionar para home
  if (isAuthenticated()) {
    return <Navigate to="/home" replace />;
  }

  // Se não estiver autenticado, renderizar o componente filho (página de login)
  return children;
};

export default RedirectIfLogged;





