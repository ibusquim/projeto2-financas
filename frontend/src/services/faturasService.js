import { api } from './api.js'

export function listar({ meses = 3, cartaoId } = {}) {
  return api.get('/relatorios/faturas', { meses, cartaoId })
}
