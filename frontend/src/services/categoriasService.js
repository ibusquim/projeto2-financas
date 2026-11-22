import { api } from './api.js'

export function listar(tipo) {
  return api.get('/categorias', tipo ? { tipo } : {})
}

export function criar(dados) {
  return api.post('/categorias', dados)
}

export function atualizar(id, dados) {
  return api.put(`/categorias/${id}`, dados)
}

export function excluir(id) {
  return api.delete(`/categorias/${id}`)
}
