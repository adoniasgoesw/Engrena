import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ 
  isVisible, 
  onClose, 
  onSearch, 
  onToggle,
  placeholder = "Pesquisar...",
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    // Aguardar a animação terminar antes de fechar
    setTimeout(() => {
      setSearchTerm('');
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleToggle = () => {
    if (isVisible) {
      handleClose();
    } else {
      onToggle();
    }
  };

  // Focar no input quando a barra aparecer
  useEffect(() => {
    if (isVisible && !isClosing) {
      const input = document.getElementById('search-input');
      if (input) {
        input.focus();
      }
    }
  }, [isVisible, isClosing]);

  return (
    <div className={`relative ${className}`}>
      {/* Container da barra com animação de largura */}
      <div className={`
        overflow-hidden transition-all duration-500 ease-out outline-none focus:outline-none
        ${isVisible && !isClosing 
          ? 'w-full bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-xl shadow-gray-200/50 focus-within:border-gray-200/50 focus-within:outline-none focus-within:ring-0' 
          : 'w-10 sm:w-12'
        }
      `}>
        <div className="flex items-center h-10 sm:h-12">
          {/* Botão da lupa (sempre visível) */}
          <button
            onClick={handleToggle}
            className={`
              p-2 sm:p-3 text-gray-600 hover:text-gray-800 transition-all duration-300 flex-shrink-0 h-10 sm:h-12 flex items-center justify-center group outline-none focus:outline-none
              ${isVisible 
                ? 'hover:bg-gray-50/80' 
                : 'hover:bg-gray-100/80 rounded-2xl hover:scale-105 active:scale-95'
              }
            `}
            title={isVisible ? "Fechar pesquisa" : "Pesquisar"}
          >
            <Search className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${isVisible ? 'text-gray-500' : 'text-gray-600 group-hover:text-blue-600'}`} />
          </button>

          {/* Input de pesquisa (só aparece quando expandido) */}
          {isVisible && (
            <div className="flex-1 relative animate-in fade-in-0 slide-in-from-left-3 duration-300">
              <input
                id="search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  // Buscar em tempo real enquanto digita
                  if (onSearch) {
                    onSearch(e.target.value.trim())
                  }
                }}
                placeholder={placeholder}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-8 sm:pr-12 text-sm sm:text-base border-0 focus:ring-0 focus:outline-none focus:border-0 focus:shadow-none bg-transparent h-10 sm:h-12 placeholder:text-gray-400 text-gray-700"
                style={{ boxShadow: 'none' }}
              />
              <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Botão fechar (só aparece quando expandido) */}
          {isVisible && (
            <button
              type="button"
              onClick={handleClose}
              className="p-2 sm:p-3 text-gray-400 hover:text-red-500 hover:bg-red-50/80 transition-all duration-300 flex-shrink-0 animate-in fade-in-0 slide-in-from-right-3 h-10 sm:h-12 flex items-center justify-center rounded-r-2xl group outline-none focus:outline-none"
              title="Fechar pesquisa"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-200" />
            </button>
          )}
        </div>

        {/* Form para submit (invisível) */}
        {isVisible && (
          <form onSubmit={handleSubmit} className="hidden">
            <input type="submit" />
          </form>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
