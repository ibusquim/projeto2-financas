import { formatarMesReferencia, formatarMoeda, formatarPercentual } from '../../services/formatadores.js'
import * as saudeService from '../../services/saudeFinanceiraService.js'
import useConsulta from '../../services/useConsulta.js'
import Alerta from '../ui/Alerta.jsx'
import CartaoResumo from '../ui/CartaoResumo.jsx'
import EstadoCarregando from '../ui/EstadoCarregando.jsx'
import EstadoVazio from '../ui/EstadoVazio.jsx'
import GraficoProjecao from '../ui/GraficoProjecao.jsx'

import './saude-financeira.css'

const ROTULO_CLASSIFICACAO = {
  otima: 'Otima',
  boa: 'Boa',
  baixa: 'Baixa',
  critica: 'Critica',
  saudavel: 'Saudavel',
  atencao: 'Atencao',
  critico: 'Critico',
  'sem-dados': 'Sem dados',
}

function formatarValorIndicador(indicador) {
  if (indicador.valor === null || indicador.valor === undefined) return 'Sem dados'
  if (indicador.unidade === '%') return formatarPercentual(indicador.valor)
  if (indicador.unidade === 'BRL') return formatarMoeda(indicador.valor)
  return String(indicador.valor)
}

function rotuloClassificacao(classificacao) {
  return ROTULO_CLASSIFICACAO[classificacao] ?? classificacao
}

export default function SaudeFinanceiraPage() {
  const consulta = useConsulta(() => saudeService.obter(), [])
  const dados = consulta.dados

  const projecao = dados?.projecao ?? []
  const dicas = dados?.dicas ?? []
  const foraDaCurva = dados?.categoriasForaDaCurva ?? []
  const indicadores = dados?.indicadores ?? []

  return (
    <section className="pagina">
      <header className="pagina__cabecalho">
        <h1 className="pagina__titulo">Saude financeira</h1>
        <p className="pagina__descricao">
          Indicadores, projecao e dicas calculados no servidor a partir dos seus ultimos meses de
          lancamentos.
        </p>
      </header>

      {consulta.erro ? <Alerta tipo="erro">{consulta.erro.message}</Alerta> : null}
      {consulta.carregando ? <EstadoCarregando mensagem="Analisando seus dados..." /> : null}

      {dados && !consulta.carregando ? (
        <>
          <div className="saude-aviso" role="note">
            {dados.aviso}
          </div>

          <div className="resumos">
            <CartaoResumo
              titulo="Renda media mensal"
              valor={formatarMoeda(dados.rendaMediaMensal)}
              detalhe={`Base: ${dados.periodosAnalisados} meses`}
              tipo="entrada"
            />
            <CartaoResumo
              titulo="Despesa media mensal"
              valor={formatarMoeda(dados.despesaMediaMensal)}
              tipo="saida"
            />
            <CartaoResumo
              titulo="Limite de cartoes em uso"
              valor={formatarMoeda(dados.limiteCartoesUtilizado)}
              detalhe="Parcelas ainda nao vencidas"
              tipo="neutro"
            />
          </div>

          <div className="cartao">
            <h2 className="secao__titulo">Indicadores</h2>

            {indicadores.length === 0 ? (
              <EstadoVazio
                titulo="Sem dados suficientes"
                descricao="Registre lancamentos para o servidor calcular seus indicadores."
              />
            ) : (
              <div className="saude-grade">
                {indicadores.map((indicador) => (
                  <article className="saude-indicador" key={indicador.chave}>
                    <header className="saude-indicador__cabecalho">
                      <h3 className="saude-indicador__titulo">{indicador.titulo}</h3>
                      <span className={`saude-badge saude-badge--${indicador.classificacao}`}>
                        {rotuloClassificacao(indicador.classificacao)}
                      </span>
                    </header>
                    <strong className="saude-indicador__valor">
                      {formatarValorIndicador(indicador)}
                    </strong>
                    <p className="saude-indicador__explicacao">{indicador.explicacao}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="cartao">
            <h2 className="secao__titulo">Projecao de saldo</h2>
            <p className="texto-suave">
              Media de entradas e saidas dos ultimos meses, somada as parcelas de cartao ja
              conhecidas.
            </p>

            <GraficoProjecao dados={projecao} />

            {projecao.length === 0 ? (
              <EstadoVazio
                titulo="Sem historico para projetar"
                descricao="A projecao aparece depois que houver lancamentos em pelo menos um mes."
              />
            ) : (
              <div className="tabela-envolucro">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th scope="col">Mes</th>
                      <th scope="col" className="tabela__numero">
                        Entradas
                      </th>
                      <th scope="col" className="tabela__numero">
                        Saidas
                      </th>
                      <th scope="col" className="tabela__numero">
                        Parcelas
                      </th>
                      <th scope="col" className="tabela__numero">
                        Saldo projetado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projecao.map((mes) => {
                      const negativo = Number(mes.saldoProjetado) < 0
                      return (
                        <tr key={mes.mesReferencia}>
                          <td>{formatarMesReferencia(mes.mesReferencia)}</td>
                          <td className="tabela__numero valor-positivo">
                            {formatarMoeda(mes.entradas)}
                          </td>
                          <td className="tabela__numero">{formatarMoeda(mes.saidas)}</td>
                          <td className="tabela__numero">{formatarMoeda(mes.parcelas)}</td>
                          <td
                            className={`tabela__numero ${negativo ? 'valor-negativo' : 'valor-positivo'}`}
                          >
                            {formatarMoeda(mes.saldoProjetado)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="cartao">
            <h2 className="secao__titulo">Categorias fora da curva</h2>
            <p className="texto-suave">
              Gasto do mes corrente comparado a media dos meses anteriores.
            </p>

            {foraDaCurva.length === 0 ? (
              <p className="texto-suave">Nenhuma categoria acima da media no momento.</p>
            ) : (
              <div className="tabela-envolucro">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th scope="col">Categoria</th>
                      <th scope="col" className="tabela__numero">
                        Gasto no mes
                      </th>
                      <th scope="col" className="tabela__numero">
                        Media anterior
                      </th>
                      <th scope="col" className="tabela__numero">
                        Variacao
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {foraDaCurva.map((item) => (
                      <tr key={item.categoriaId}>
                        <td>{item.nome}</td>
                        <td className="tabela__numero">{formatarMoeda(item.total)}</td>
                        <td className="tabela__numero">{formatarMoeda(item.media)}</td>
                        <td className="tabela__numero">
                          {item.variacaoPercentual === null
                            ? 'Sem historico'
                            : formatarPercentual(item.variacaoPercentual)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="cartao">
            <h2 className="secao__titulo">Dicas</h2>
            {dicas.length === 0 ? (
              <p className="texto-suave">Sem dicas no momento.</p>
            ) : (
              <ul className="saude-dicas">
                {dicas.map((dica, indice) => (
                  <li key={`dica-${indice}`}>{dica}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}
