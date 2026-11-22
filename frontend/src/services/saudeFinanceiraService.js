import { api } from './api.js'

export function obter() {
  return api.get('/saude-financeira')
}
