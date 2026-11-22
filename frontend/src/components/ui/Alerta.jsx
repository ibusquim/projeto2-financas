export default function Alerta({ tipo = 'erro', children }) {
  if (!children) return null
  const papel = tipo === 'erro' ? 'alert' : 'status'
  return (
    <div className={`alerta alerta--${tipo}`} role={papel}>
      {children}
    </div>
  )
}
