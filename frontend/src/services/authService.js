import { api } from './api.js'

export function cadastrar(dados) {
  return api.publico.post('/auth/cadastro', dados)
}

export function login(dados) {
  return api.publico.post('/auth/login', dados)
}

export function me() {
  return api.get('/auth/me')
}
