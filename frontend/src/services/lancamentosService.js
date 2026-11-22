import { api } from './api.js'

export function listar(filtros = {}) {
  return api.get('/lancamentos', filtros)
}

export function detalhar(id) {
  return api.get(`/lancamentos/${id}`)
}

export function criar(dados) {
  return api.post('/lancamentos', dados)
}

export function atualizar(id, dados) {
  return api.put(`/lancamentos/${id}`, dados)
}

export function excluir(id, escopo = 'parcela') {
  return api.delete(`/lancamentos/${id}?escopo=${encodeURIComponent(escopo)}`)
}
