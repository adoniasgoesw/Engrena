import React, { useState } from 'react'
import { motion } from 'framer-motion'
import carImage from '../../assets/car1.png'
import FormCard from '../cards/FormCard'
import ConfirmButton from '../buttons/ConfirmButton'

export default function HeroSection() {
  const [moved, setMoved] = useState(false)

  const handleClick = () => {
    // Sempre ativa o estado para mostrar o card
    setMoved(true)
  }

  const handleCloseCard = () => {
    setMoved(false)
  }

  return (
    <section
      className="relative flex flex-col justify-between bg-[#1a1a1a] text-white p-6 overflow-hidden"
      style={{ 
        fontFamily: 'Poppins, sans-serif',
        height: '100dvh'
      }}
    >
      {/* Car Image */}
      <motion.div
        className="relative z-10 flex justify-start md:justify-center items-center w-full h-1/2 pt-8"
        animate={{
          x: moved && window.innerWidth >= 1024 ? -500 : 0,
          y: moved && window.innerWidth >= 768 && window.innerWidth < 1024 ? -300 : 0,
          scale: moved && window.innerWidth >= 768 ? 0.95 : 1,
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      >
        <img
            src={carImage}
            alt="Carro premium"
            className="max-w-[500px] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[600px] object-contain -ml-60 md:ml-0 drop-shadow-2xl brightness-90 contrast-110 saturate-75 opacity-50"
          />
      </motion.div>

       {/* Texto principal */}
       <motion.div
         className="relative z-10 text-center max-w-md mx-auto mt-4 md:mt-0"
         animate={{
           x: moved && window.innerWidth >= 1024 ? -500 : 0,
           y: moved && window.innerWidth >= 768 && window.innerWidth < 1024 ? -500 : 0,
           opacity: moved ? (window.innerWidth >= 768 ? 0.95 : 1) : 1,
         }}
         transition={{ duration: 1.2, ease: 'easeInOut' }}
       >
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-left md:text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Smart Service<br className="md:hidden" /> Orders.
        </h1>
        <p className="text-gray-300 text-base md:text-lg text-left md:text-center leading-relaxed">
          Create, track, and manage every repair in one place.
        </p>
      </motion.div>

      {/* Botão */}
          <motion.div
            className="relative z-10 flex justify-center pb-8 mt-4 md:mt-0"
            animate={{
              x: moved && window.innerWidth >= 1024 ? -500 : 0,
              y: moved && window.innerWidth >= 768 && window.innerWidth < 1024 ? -600 : 0,
              opacity: moved ? (window.innerWidth >= 768 ? 0.9 : 1) : 1,
            }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          >
            <div className="w-full max-w-md">
              <ConfirmButton onClick={handleClick} />
            </div>
          </motion.div>
      
      {/* Form Card */}
      <FormCard isVisible={moved} onClose={handleCloseCard} />
    </section>
  )
}
