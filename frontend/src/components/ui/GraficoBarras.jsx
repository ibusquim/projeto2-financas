/**
 * Grafico de barras horizontais em CSS puro.
 * Nenhuma biblioteca de graficos foi aprovada, entao os valores e percentuais
 * continuam vindo do servidor e apenas a largura e calculada para exibicao.
 */
export default function GraficoBarras({ dados, formatarValor, vazio = 'Sem dados no periodo.' }) {
  if (!dados || dados.length === 0) {
    return <p className="grafico__vazio">{vazio}</p>
  }

  const maior = Math.max(...dados.map((item) => Number(item.valor) || 0), 0)

  return (
    <div className="grafico" role="img" aria-label="Grafico de barras por categoria">
      {dados.map((item) => {
        const valor = Number(item.valor) || 0
        const largura = maior > 0 ? Math.max((valor / maior) * 100, valor > 0 ? 2 : 0) : 0
        return (
          <div className="grafico__linha" key={item.chave ?? item.rotulo}>
            <span className="grafico__rotulo" title={item.rotulo}>
              {item.rotulo}
            </span>
            <span className="grafico__trilho">
              <span
                className={`grafico__barra grafico__barra--${item.tipo ?? 'primaria'}`}
                style={{ width: `${largura}%` }}
              />
            </span>
            <span className="grafico__valor">{formatarValor ? formatarValor(item.valor) : item.valor}</span>
          </div>
        )
      })}
    </div>
  )
}
