import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatarMesReferencia, formatarMoeda } from '../../services/formatadores.js'

/**
 * Grafico de linha do saldo projetado.
 * Usa Recharts e recebe os meses ja calculados pelo servidor.
 */
export default function GraficoProjecao({ dados, vazio = 'Sem historico suficiente para projetar.' }) {
  if (!dados || dados.length === 0) {
    return <p className="grafico__vazio">{vazio}</p>
  }

  const serie = dados.map((item) => ({
    mes: formatarMesReferencia(item.mesReferencia),
    saldo: Number(item.saldoProjetado) || 0,
  }))

  return (
    <div className="grafico" role="img" aria-label="Grafico de saldo projetado por mes">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={serie} margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
          <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#475467' }} />
          <YAxis
            tickFormatter={(valor) => formatarMoeda(valor)}
            tick={{ fontSize: 12, fill: '#475467' }}
            width={90}
          />
          <Tooltip formatter={(valor) => formatarMoeda(valor)} labelStyle={{ color: '#101828' }} />
          <ReferenceLine y={0} stroke="#98a2b3" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="saldo"
            name="Saldo projetado"
            stroke="#1d4ed8"
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
