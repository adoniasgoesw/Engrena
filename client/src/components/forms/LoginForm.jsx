import React, { useState } from 'react'
import { formatCPF } from '../../utils/format.js'
import authService from '../../services/auth.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import AcessButton from '../buttons/AcessButton'

const LoginForm = ({ onSwitchToRegister }) => {
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    cpf: '',
    password: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    
    // Aplicar formatação automática para CPF
    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    }
    
    setFormData({
      ...formData,
      [name]: formattedValue
    })
  }

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await authService.login(formData.cpf, formData.password)
      console.log('Login bem-sucedido:', response)
      
      // Salvar dados do usuário no contexto
      login(response.user)
      
      // Redirecionar para a página home
      window.location.href = '/home'
      
    } catch (err) {
      console.error('Erro no login:', err)
      setError(err.message || 'Erro ao fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div className="text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Welcome Back!</h2>
          <p className="text-sm sm:text-base text-gray-600">Sign in to your account</p>
        </div>
        
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
              CPF
            </label>
            <input
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-300 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all duration-200 placeholder-gray-400 shadow-sm text-base"
              placeholder="Enter your CPF"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-300 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all duration-200 placeholder-gray-400 shadow-sm text-base"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-gray-800 focus:ring-gray-600 border-gray-400 rounded"
              />
              <label className="ml-2 block text-xs sm:text-sm text-gray-700">
                Remember me
              </label>
            </div>
            
            <div className="text-xs sm:text-sm">
              <a href="#" className="font-semibold text-gray-800 hover:text-gray-600 transition-colors">
                Forgot password?
              </a>
            </div>
          </div>
          
              <AcessButton 
                onClick={handleSubmit}
                disabled={isLoading}
                isLoading={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </AcessButton>
        </form>
      </div>
      
      <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-200">
        <p className="text-xs sm:text-sm text-gray-600 text-center">
          Don't have an account?{' '}
            <a 
              href="#"
              onClick={(e) => {
                e.preventDefault()
                onSwitchToRegister()
              }}
              className="font-semibold text-gray-800 hover:text-gray-600 transition-colors cursor-pointer"
            >
              Sign up
            </a>
        </p>
      </div>
    </div>
  )
}

export default LoginForm
