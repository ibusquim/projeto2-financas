export default function Botao({
  variante = 'primario',
  carregando = false,
  className = '',
  children,
  ...props
}) {
  const classes = ['botao', `botao--${variante}`, className].filter(Boolean).join(' ')

  return (
    <button {...props} className={classes} disabled={carregando || props.disabled}>
      {carregando ? <span className="botao__giro" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  )
}
