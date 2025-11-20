import React, { useState } from 'react';
import Base from '../components/cards/Base';
import FormLogin from '../components/forms/FormLogin';
import FormRegister from '../components/forms/FormRegister';

const Access = () => {
  const [activeTab, setActiveTab] = useState('login');

  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#207880] via-[#1A99BA] to-[#C2EDD2] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <Base>
        {/* Tab Container */}
        <div className="flex bg-gray-50 mx-6 sm:mx-8 rounded-xl p-1 mb-6 mt-6 sm:mt-8">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-3 px-4 sm:px-5 border-none bg-transparent text-gray-600 font-medium text-sm rounded-lg cursor-pointer transition-all duration-300 ${
              activeTab === 'login' 
                ? 'bg-white text-[#207880] shadow-sm' 
                : 'hover:text-[#207880]'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 py-3 px-4 sm:px-5 border-none bg-transparent text-gray-600 font-medium text-sm rounded-lg cursor-pointer transition-all duration-300 ${
              activeTab === 'register' 
                ? 'bg-white text-[#207880] shadow-sm' 
                : 'hover:text-[#207880]'
            }`}
          >
            Registrar
          </button>
        </div>

        {/* Form Container */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex-1">
          <FormLogin 
            isActive={activeTab === 'login'} 
            onSwitchTab={switchTab}
          />
          <FormRegister 
            isActive={activeTab === 'register'} 
            onSwitchTab={switchTab}
          />
        </div>
      </Base>
    </div>
  );
};

export default Access;

