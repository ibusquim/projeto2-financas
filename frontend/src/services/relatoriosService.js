import { api } from './api.js'

export function porCategoria({ inicio, fim } = {}) {
  return api.get('/relatorios/categorias', { inicio, fim })
}

export function porFonteDestino({ inicio, fim } = {}) {
  return api.get('/relatorios/fontes-destinos', { inicio, fim })
}
