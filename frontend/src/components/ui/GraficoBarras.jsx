import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const CORES = {
  saida: '#b42318',
  entrada: '#067647',
  primaria: '#1d4ed8',
  neutro: '#475467',
}

/**
 * Grafico de barras horizontais com Recharts.
 * Recebe `dados` como [{ chave, rotulo, valor, tipo }] e apenas monta a serie.
 * Os valores continuam vindo calculados do servidor; aqui so ha formatacao.
 */
export default function GraficoBarras({ dados, formatarValor, vazio = 'Sem dados no periodo.' }) {
  if (!dados || dados.length === 0) {
    return <p className="grafico__vazio">{vazio}</p>
  }

  const serie = dados.map((item) => ({
    chave: item.chave ?? item.rotulo,
    rotulo: item.rotulo,
    tipo: item.tipo ?? 'primaria',
    numero: Number(item.valor) || 0,
  }))

  const altura = Math.max(180, serie.length * 38 + 40)

  return (
    <div className="grafico" role="img" aria-label="Grafico de barras por categoria">
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={serie} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e7ec" />
          <XAxis
            type="number"
            tickFormatter={(valor) => (formatarValor ? formatarValor(valor) : String(valor))}
            tick={{ fontSize: 12, fill: '#475467' }}
          />
          <YAxis
            type="category"
            dataKey="rotulo"
            width={140}
            tick={{ fontSize: 12, fill: '#344054' }}
          />
          <Tooltip
            formatter={(valor) => (formatarValor ? formatarValor(valor) : String(valor))}
            labelStyle={{ color: '#101828' }}
          />
          <Bar dataKey="numero" name="Total" radius={[0, 6, 6, 0]} isAnimationActive={false}>
            {serie.map((item) => (
              <Cell key={item.chave} fill={CORES[item.tipo] ?? CORES.primaria} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
