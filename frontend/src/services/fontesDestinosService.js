import { api } from './api.js'

export function listar(tipo) {
  return api.get('/fontes-destinos', tipo ? { tipo } : {})
}

export function criar(dados) {
  return api.post('/fontes-destinos', dados)
}

export function atualizar(id, dados) {
  return api.put(`/fontes-destinos/${id}`, dados)
}

export function excluir(id) {
  return api.delete(`/fontes-destinos/${id}`)
}
