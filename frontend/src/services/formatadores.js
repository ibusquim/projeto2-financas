const FORMATADOR_MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** Formata string decimal ou numero como moeda brasileira. */
export function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  const numero = typeof valor === 'number' ? valor : Number(valor)
  if (!Number.isFinite(numero)) return '—'
  return FORMATADOR_MOEDA.format(numero)
}

/** Converte "2026-11-22" em "22/11/2026" sem passar por fuso horario. */
export function formatarData(iso) {
  if (!iso || typeof iso !== 'string') return '—'
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}

/** Converte "2026-11" em "11/2026". */
export function formatarMesReferencia(mesIso) {
  if (!mesIso || typeof mesIso !== 'string') return '—'
  const [ano, mes] = mesIso.split('-')
  if (!ano || !mes) return mesIso
  return `${mes}/${ano}`
}

/** Formata percentual numerico com duas casas. */
export function formatarPercentual(valor) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return '—'
  return `${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

export function hojeISO() {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

export function primeiroDiaDoMesISO(ano, mes) {
  const base = new Date(ano, mes - 1, 1)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-01`
}

export function ultimoDiaDoMesISO(ano, mes) {
  const base = new Date(ano, mes, 0)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
}

/** Periodo padrao do plano: mes corrente. */
export function mesCorrenteISO() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = agora.getMonth() + 1
  return { inicio: primeiroDiaDoMesISO(ano, mes), fim: ultimoDiaDoMesISO(ano, mes) }
}

export function adicionarMeses({ inicio }, quantidade) {
  const [ano, mes] = inicio.split('-').map(Number)
  const base = new Date(ano, mes - 1 + quantidade, 1)
  const novoAno = base.getFullYear()
  const novoMes = base.getMonth() + 1
  return {
    inicio: primeiroDiaDoMesISO(novoAno, novoMes),
    fim: ultimoDiaDoMesISO(novoAno, novoMes),
  }
}

export function apenasDigitos(texto) {
  return String(texto ?? '').replace(/\D/g, '')
}

/** Validacao complementar de CPF; a validacao oficial continua no servidor. */
export function cpfValido(texto) {
  const cpf = apenasDigitos(texto)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  const calcularDigito = (ate) => {
    let soma = 0
    for (let i = 0; i < ate; i += 1) soma += Number(cpf[i]) * (ate + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  return calcularDigito(9) === Number(cpf[9]) && calcularDigito(10) === Number(cpf[10])
}

/**
 * Converte texto digitado em valor decimal com ponto ("1.234,56" -> "1234.56").
 * Retorna null quando o formato nao tem no maximo duas casas decimais.
 */
export function converterValorParaDecimal(texto) {
  if (typeof texto !== 'string') return null
  let limpo = texto.trim().replace(/\s/g, '')
  if (!limpo) return null

  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  } else if ((limpo.match(/\./g) ?? []).length > 1) {
    limpo = limpo.replace(/\./g, '')
  }

  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null
  return limpo
}

/** Texto amigavel da tendencia calculada pelo servidor. */
export function descreverTendencia(tendencia, variacaoPercentual) {
  if (tendencia === 'aumento') return `Aumento de ${formatarPercentual(Math.abs(variacaoPercentual))}`
  if (tendencia === 'reducao') return `Reducao de ${formatarPercentual(Math.abs(variacaoPercentual))}`
  return 'Sem variacao'
}
