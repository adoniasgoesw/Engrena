import React, { useState, useEffect, useCallback, useRef } from 'react';
import CloseButton from '../buttons/Close';
import CancelButton from '../buttons/Cancel';
import SaveButton from '../buttons/Save';
import { Tag } from 'lucide-react';

const Base = ({ 
  isOpen, 
  onClose, 
  onSave,
  children, 
  title = "Modal", 
  icon: Icon, 
  headerContent = null,
  saveText = "Salvar",
  cancelText = "Cancelar",
  isLoading = false,
  printButton = null,
  showBorder = false,
  closeButtonVariant = "default",
  className = "",
  sideMode = false, // Novo prop para modo lateral simples
  sidePosition = "left", // "left" ou "right"
  hideButtons = false // Novo prop para ocultar botões Cancelar e Salvar
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef(null);

  const handleClose = useCallback(() => {
    console.log('Base handleClose called');
    
    // Disparar evento para permitir interceptação
    const cancelEvent = new CustomEvent('modalCancel', { 
      detail: { canClose: true },
      cancelable: true 
    });
    
    // Verificar se algum listener cancelou o evento
    const wasCancelled = !window.dispatchEvent(cancelEvent);
    
    // Se o evento foi cancelado, não fechar o modal
    if (wasCancelled || cancelEvent.defaultPrevented) {
      console.log('Modal close was cancelled by event listener');
      return;
    }
    
    console.log('Closing modal with animation');
    setIsAnimating(false);
    setTimeout(() => {
      console.log('Calling onClose after animation');
      onClose();
    }, 400); // Tempo da animação
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  // Listener único para evento de sucesso do formulário
  useEffect(() => {
    const handleModalSaveSuccess = (event) => {
      console.log('🎉 Evento modalSaveSuccess recebido:', event.detail);
      console.log('🔍 onSave disponível:', !!onSave);
      if (onSave) {
        console.log('✅ Chamando onSave com dados:', event.detail);
        onSave(event.detail);
      }
      
      // Fechar o modal após o sucesso
      console.log('🔒 Fechando modal após sucesso...');
      handleClose();
    };

    const handleCloseModal = () => {
      console.log('🔒 Evento closeModal recebido, fechando modal...');
      handleClose();
    };

    if (isOpen) {
      window.addEventListener('modalSaveSuccess', handleModalSaveSuccess);
      window.addEventListener('closeModal', handleCloseModal);
    }

    return () => {
      window.removeEventListener('modalSaveSuccess', handleModalSaveSuccess);
      window.removeEventListener('closeModal', handleCloseModal);
    };
  }, [isOpen, onSave, handleClose]);

  console.log('Base render - isOpen:', isOpen, 'isAnimating:', isAnimating);
  
  if (!isOpen && !isAnimating) return null;

  return (
    <>
      {/* Overlay para fechar ao clicar fora */}
      <div
        className="fixed inset-0 z-[999999] bg-black/40"
        onClick={handleClose}
      />

      {/* Modal base com animação de gaveta */}
      <div
        className={`fixed ${sideMode ? (sidePosition === 'left' ? 'left-0' : 'right-0') : 'right-0'} top-0 h-full z-[1000000] transition-transform duration-[400ms] ease-in-out ${sideMode ? 'w-[35%]' : 'w-full sm:w-1/2 lg:w-[40%] xl:w-[35%] max-w-2xl'} ${
          sideMode 
            ? (sidePosition === 'left' 
              ? (isAnimating ? 'transform translate-x-0' : 'transform translate-x-full')
              : (isAnimating ? 'transform translate-x-0' : 'transform translate-x-full'))
            : (isAnimating ? 'transform translate-x-0' : 'transform translate-x-full')
        }`}
      >
        <div ref={modalRef} className={`h-full bg-white shadow-2xl flex flex-col relative z-[60] ${showBorder ? 'border border-gray-200' : ''} ${className}`}>
          {/* Borda esquerda mais grossa - apenas quando showBorder for true */}
          {showBorder && (
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gray-800"></div>
          )}
          
          {/* Modo lateral simples - apenas botão close */}
          {sideMode && (
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleClose}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Header do modal - não renderizar no modo lateral */}
          {!sideMode && headerContent && headerContent.props.children && (
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex-1 min-w-0 pr-3">{headerContent}</div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {printButton}
                <CloseButton onClick={handleClose} variant={closeButtonVariant} />
              </div>
            </div>
          )}
          
          {!sideMode && !headerContent && (title || Icon) && (
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                  <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{title}</h2>
              </div>
              <CloseButton onClick={handleClose} variant={closeButtonVariant} />
            </div>
          )}

          {/* Conteúdo do modal */}
          <div className={`flex-1 overflow-y-auto ${sideMode ? '' : 'scrollbar-hide'}`}>
            {children}
          </div>

          {/* Footer com botões - modo lateral */}
          {sideMode && !hideButtons && (
            <div className="border-t border-gray-200 p-4 sm:p-6 flex-shrink-0">
              <div className="flex justify-end gap-3">
                <CancelButton 
                  onClick={handleClose} 
                  disabled={isLoading}
                  className="px-6 py-2 text-sm w-24"
                >
                  {cancelText}
                </CancelButton>
                <SaveButton 
                  onClick={async () => {
                    console.log('🔘 Botão Salvar clicado no modal');
                    
                    // Se há uma função onSave personalizada, usar ela
                    if (onSave) {
                      console.log('📝 Usando função onSave personalizada...');
                      try {
                        await onSave();
                      } catch (error) {
                        console.error('❌ Erro na função onSave:', error);
                      }
                      return;
                    }
                    
                    // Fallback: tentar encontrar formulário HTML
                    const form = modalRef.current?.querySelector('form.modal-form') || modalRef.current?.querySelector('form') || document.querySelector('form.modal-form');
                    console.log('📋 Formulário encontrado:', form);
                    if (form && typeof form.requestSubmit === 'function') {
                      console.log('📝 Submetendo formulário HTML...');
                      form.requestSubmit();
                    } else {
                      console.log('❌ Formulário não encontrado ou sem requestSubmit');
                    }
                  }} 
                  disabled={isLoading}
                  className="px-6 py-2 text-sm w-24"
                >
                  {isLoading ? 'Salvando...' : saveText}
                </SaveButton>
              </div>
            </div>
          )}

          {/* Footer com botões - não renderizar no modo lateral */}
          {!sideMode && !hideButtons && (
            <div className="border-t border-gray-200 p-4 sm:p-6 flex-shrink-0">
              <div className="flex justify-end gap-3">
                <CancelButton 
                  onClick={handleClose} 
                  disabled={isLoading}
                  className="px-6 py-2 text-sm w-24"
                >
                  {cancelText}
                </CancelButton>
                <SaveButton 
                  onClick={async () => {
                    console.log('🔘 Botão Salvar clicado no modal');
                    
                    // Se há uma função onSave personalizada, usar ela
                    if (onSave) {
                      console.log('📝 Usando função onSave personalizada...');
                      try {
                        await onSave();
                      } catch (error) {
                        console.error('❌ Erro na função onSave:', error);
                      }
                      return;
                    }
                    
                    // Fallback: tentar encontrar formulário HTML
                    const form = modalRef.current?.querySelector('form.modal-form') || modalRef.current?.querySelector('form') || document.querySelector('form.modal-form');
                    console.log('📋 Formulário encontrado:', form);
                    if (form && typeof form.requestSubmit === 'function') {
                      console.log('📝 Submetendo formulário HTML...');
                      form.requestSubmit();
                    } else {
                      console.log('❌ Formulário não encontrado ou sem requestSubmit');
                    }
                  }} 
                  disabled={isLoading}
                  className="px-6 py-2 text-sm w-24"
                >
                  {isLoading ? 'Salvando...' : saveText}
                </SaveButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Base;
