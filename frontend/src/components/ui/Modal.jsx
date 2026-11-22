import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ titulo, aoFechar, children, largura = 'normal' }) {
  const botaoFechar = useRef(null)

  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    botaoFechar.current?.focus()
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = anterior
    }
  }, [aoFechar])

  return createPortal(
    <div
      className="modal-fundo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar()
      }}
    >
      <div
        className={`modal modal--${largura}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
      >
        <div className="modal__cabecalho">
          <h2 className="modal__titulo" id="modal-titulo">
            {titulo}
          </h2>
          <button
            type="button"
            className="modal__fechar"
            onClick={aoFechar}
            aria-label="Fechar"
            ref={botaoFechar}
          >
            &times;
          </button>
        </div>
        <div className="modal__corpo">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
