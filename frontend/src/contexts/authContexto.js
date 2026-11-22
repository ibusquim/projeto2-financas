import { createContext } from 'react'

/** Contexto puro, separado do provider para permitir hot reload limpo. */
export const AuthContext = createContext(null)
