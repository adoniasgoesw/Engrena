import api from './api.js'

export const authService = {
  // Login
  async login(cpf, password) {
    return await api.post('/api/auth/login', { cpf, password })
  },

  // Register
  async register(userData) {
    return await api.post('/api/auth/register', userData)
  },

  // Test DB connection
  async testDB() {
    return await api.get('/api/test-db')
  }
}

export default authService

