import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserFromLocalStorage = useCallback(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage', error);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserFromLocalStorage();
  }, [loadUserFromLocalStorage]);

  // Função para salvar dados do usuário após login bem-sucedido
  const login = (userData) => {
    try {
      // Salvar objeto user completo
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Salvar IDs separadamente para fácil acesso
      if (userData.id) {
        localStorage.setItem('user_id', userData.id.toString());
      }
      
      if (userData.estabelecimento?.id) {
        localStorage.setItem('estabelecimento_id', userData.estabelecimento.id.toString());
      } else if (userData.estabelecimento_id) {
        localStorage.setItem('estabelecimento_id', userData.estabelecimento_id.toString());
      }
      
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Erro ao salvar dados do usuário:', error);
      return { success: false, error: 'Erro ao salvar dados do usuário' };
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('user_id');
    localStorage.removeItem('estabelecimento_id');
    setUser(null);
  };

  const isAuthenticated = () => {
    return user !== null;
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};