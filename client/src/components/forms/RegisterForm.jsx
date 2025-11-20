import React, { useState } from 'react'
import authService from '../../services/auth.js'
import { formatCPF, formatCNPJ, formatWhatsApp } from '../../utils/format.js'
import AcessButton from '../buttons/AcessButton'
import NextButton from '../buttons/NextButton'
import BackButton from '../buttons/BackButton'

const RegisterForm = ({ onSwitchToLogin }) => {
  const [step, setStep] = useState(1)
  
  const [formData, setFormData] = useState({
    // Step 1
    fullName: '',
    email: '',
    whatsapp: '',
    
    // Step 2
    businessName: '',
    cnpj: '',
    address: '',
    
    // Step 3
    cpf: '',
    password: '',
    confirmPassword: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    
    // Aplicar formatação automática
    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (name === 'whatsapp') {
      formattedValue = formatWhatsApp(value);
    }
    
    setFormData({
      ...formData,
      [name]: formattedValue
    })
  }

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Validação de confirmação de senha
      if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem')
        setIsLoading(false)
        return
      }

      // Preparar dados para envio
      const registerData = {
        // Estabelecimento (Step 2)
        businessName: formData.businessName,
        cnpj: formData.cnpj,
        address: formData.address,
        
        // Usuário (Steps 1 e 3)
        fullName: formData.fullName,
        email: formData.email,
        whatsapp: formData.whatsapp,
        cpf: formData.cpf,
        password: formData.password
      }

      const response = await authService.register(registerData)
      console.log('Registro bem-sucedido:', response)
      
      // Aqui você pode redirecionar ou mostrar sucesso
      alert('Conta criada com sucesso!')
      
      // Voltar para login após sucesso
      onSwitchToLogin()
      
        } catch (err) {
          console.error('Erro no registro:', err)
          setError(err.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div className="text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
          <p className="text-sm sm:text-base text-gray-600">Step {step} of 3</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Step 1 */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-300 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all duration-200 placeholder-gray-400 shadow-sm text-base"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-300 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all duration-200 placeholder-gray-400 shadow-sm text-base"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  WhatsApp
                </label>
                <input
                  type="text"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-300 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all duration-200 placeholder-gray-400 shadow-sm text-base"
                  placeholder="Enter your WhatsApp number"
                  required
                />
              </div>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-300 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all duration-200 placeholder-gray-400 shadow-sm text-base"
                  placeholder="Enter business name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  CNPJ <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleChange}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-300 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all duration-200 placeholder-gray-400 shadow-sm text-base"
                  placeholder="Enter CNPJ (optional)"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-300 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all duration-200 placeholder-gray-400 shadow-sm text-base"
                  placeholder="Enter your address"
                  required
                />
              </div>
            </>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <>
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
              
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-300 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent transition-all duration-200 placeholder-gray-400 shadow-sm text-base"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {step > 1 && (
              <BackButton onClick={handleBack}>
                Back
              </BackButton>
            )}
            
            {step < 3 ? (
              <NextButton onClick={handleNext}>
                Next
              </NextButton>
            ) : (
              <AcessButton 
                onClick={handleSubmit}
                disabled={isLoading}
                isLoading={isLoading}
              >
                {isLoading ? 'Creating...' : 'Sign Up'}
              </AcessButton>
            )}
          </div>
        </form>
      </div>
      
      <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-200">
        <p className="text-xs sm:text-sm text-gray-600 text-center">
          Already have an account?{' '}
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault()
              onSwitchToLogin()
            }}
            className="font-semibold text-gray-800 hover:text-gray-600 transition-colors"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}

export default RegisterForm

