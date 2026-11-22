export default function CampoTexto({ id, rotulo, erro, ajuda, className = '', ...props }) {
  const idErro = `${id}-erro`
  const classes = ['campo__entrada', erro ? 'campo__entrada--erro' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="campo">
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <input
        {...props}
        id={id}
        className={classes}
        aria-invalid={erro ? 'true' : undefined}
        aria-describedby={erro ? idErro : undefined}
      />
      {ajuda && !erro ? <span className="campo__ajuda">{ajuda}</span> : null}
      {erro ? (
        <span className="campo__erro" id={idErro}>
          {erro}
        </span>
      ) : null}
    </div>
  )
}
