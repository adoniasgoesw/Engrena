import { useState, useEffect } from 'react'

// Cache simples usando localStorage com expiração
const CACHE_PREFIX = 'engrena_cache_'
const CACHE_EXPIRATION = 5 * 60 * 1000 // 5 minutos

const getCacheKey = (key) => `${CACHE_PREFIX}${key}`

export const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(getCacheKey(key))
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    
    // Verificar se o cache expirou
    if (now - timestamp > CACHE_EXPIRATION) {
      localStorage.removeItem(getCacheKey(key))
      return null
    }
    
    return data
  } catch (error) {
    console.error('Erro ao ler cache:', error)
    return null
  }
}

export const setCachedData = (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(getCacheKey(key), JSON.stringify(cacheData))
  } catch (error) {
    console.error('Erro ao salvar cache:', error)
  }
}

export const clearCache = (key) => {
  try {
    localStorage.removeItem(getCacheKey(key))
  } catch (error) {
    console.error('Erro ao limpar cache:', error)
  }
}

// Hook para usar cache em listagens
export const useCache = (cacheKey, fetchFunction, dependencies = []) => {
  const [data, setData] = useState(() => {
    // Carregar do cache imediatamente
    return getCachedData(cacheKey) || []
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Carregar dados do cache primeiro
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      setData(cachedData)
    }

    // Buscar dados atualizados em background (sem mostrar loading)
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const result = await fetchFunction()
        if (result) {
          setData(result)
          setCachedData(cacheKey, result)
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error)
        // Se houver erro e não tiver cache, manter array vazio
        if (!cachedData) {
          setData([])
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, dependencies)

  const refresh = async () => {
    try {
      setIsLoading(true)
      const result = await fetchFunction()
      if (result) {
        setData(result)
        setCachedData(cacheKey, result)
      }
    } catch (error) {
      console.error('Erro ao atualizar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const clear = () => {
    clearCache(cacheKey)
    setData([])
  }

  return { data, isLoading, refresh, clear }
}

export default useCache















