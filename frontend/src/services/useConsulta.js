import { useCallback, useEffect, useState } from 'react'

/**
 * Executa uma consulta assincrona e expoe dados, carregando, erro e recarregar.
 * Evita repetir o mesmo ciclo de useEffect em todas as telas.
 */
export default function useConsulta(carregar, dependencias = []) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)

    Promise.resolve()
      .then(carregar)
      .then((resultado) => {
        if (!ativo) return
        setDados(resultado)
        setCarregando(false)
      })
      .catch((falha) => {
        if (!ativo) return
        setErro(falha)
        setCarregando(false)
      })

    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, versao])

  const recarregar = useCallback(() => setVersao((atual) => atual + 1), [])

  return { dados, carregando, erro, recarregar }
}
