import React, { useState } from 'react'
import LoginForm from '../forms/LoginForm'
import RegisterForm from '../forms/RegisterForm'

const FormCard = ({ isVisible, onClose }) => {
  const [isLogin, setIsLogin] = useState(true)
  const getPositionClasses = () => {
    // Telas médias (768-1023px): items-end justify-center
    // Telas grandes (>=1024px): items-center justify-end
    if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      return 'md:flex md:items-end md:justify-center'
    } else if (window.innerWidth >= 1024) {
      return 'md:flex items-center justify-end'
    }
    return ''
  }

  const positionClasses = getPositionClasses()

  return (
    <>
      {/* Overlay escuro com opacidade leve */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-1000 ease-in-out z-40 ${isVisible ? 'opacity-40' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Card */}
      <div className={`fixed bottom-0 left-0 right-0 lg:top-1/2 lg:bottom-auto lg:left-0 lg:right-0 lg:-translate-y-1/2 ${positionClasses} transition-all duration-1000 ease-in-out z-50 ${isVisible ? 'opacity-100 translate-y-0 lg:translate-x-0' : 'opacity-0 translate-y-full lg:translate-x-full'}`}>
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-t-3xl md:rounded-tl-3xl md:rounded-tr-3xl lg:rounded-tl-3xl lg:rounded-bl-3xl lg:rounded-tr-none shadow-2xl p-6 sm:p-8 w-full md:w-[95%] lg:w-[30%] border border-gray-200 overflow-y-auto h-[70dvh] md:h-[50dvh] lg:h-[95vh]" 
          style={{ 
            height: window.innerWidth < 420 && window.innerHeight < 900 ? '70dvh' : 
                   window.innerWidth >= 1024 ? '95vh' :
                   window.innerHeight < 600 ? '85dvh' : 
                   window.innerHeight < 800 ? '65dvh' : 
                   '50dvh',
            maxHeight: window.innerWidth < 420 && window.innerHeight < 900 ? '70dvh' : 
                      window.innerWidth >= 1024 ? '95vh' :
                      window.innerHeight < 600 ? '85dvh' : 
                      window.innerHeight < 800 ? '65dvh' : 
                      '50dvh'
          }}>
          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </>
  )
}

export default FormCard
