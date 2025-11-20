import React, { createContext, useContext, useState } from 'react'
import Base from '../components/modals/Base'

const ModalContext = createContext()

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within ModalProvider')
  }
  return context
}

export const ModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [modalContent, setModalContent] = useState(null)
  const [modalOptions, setModalOptions] = useState({})

  const openModal = (content, options = {}) => {
    setModalContent(content)
    setModalOptions(options)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    // Limpar conteúdo após animação
    setTimeout(() => {
      setModalContent(null)
      setModalOptions({})
    }, 400)
  }

  return (
    <ModalContext.Provider value={{ openModal, closeModal, isOpen }}>
      {children}
      <Base 
        isOpen={isOpen} 
        onClose={closeModal}
        sideMode={true}
        sidePosition="right"
        hideButtons={modalOptions.hideButtons || false}
        {...modalOptions}
      >
        {modalContent}
      </Base>
    </ModalContext.Provider>
  )
}

