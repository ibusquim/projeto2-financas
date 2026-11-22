import { useState } from 'react'

import {
  descreverTendencia,
  formatarMoeda,
  formatarPercentual,
  mesCorrenteISO,
} from '../../services/formatadores.js'
import * as relatoriosService from '../../services/relatoriosService.js'
import useConsulta from '../../services/useConsulta.js'
import SeletorPeriodo from '../relatorios/SeletorPeriodo.jsx'
import Alerta from '../ui/Alerta.jsx'
import CartaoResumo from '../ui/CartaoResumo.jsx'
import EstadoCarregando from '../ui/EstadoCarregando.jsx'
import EstadoVazio from '../ui/EstadoVazio.jsx'
import GraficoBarras from '../ui/GraficoBarras.jsx'

export default function RelatorioCategoriasPage() {
  const [periodo, setPeriodo] = useState(mesCorrenteISO())

  const consulta = useConsulta(
    () => relatoriosService.porCategoria(periodo),
    [periodo.inicio, periodo.fim],
  )

  const dados = consulta.dados
  const saidas = dados?.saidasPorCategoria ?? []
  const entradas = dados?.entradasPorCategoria ?? []

  return (
    <section className="pagina">
      <header className="pagina__cabecalho">
        <h1 className="pagina__titulo">Relatorio por categoria</h1>
        <p className="pagina__descricao">
          Totais, percentuais e comparacao com o periodo anterior calculados no servidor.
        </p>
      </header>

      <SeletorPeriodo
        inicio={periodo.inicio}
        fim={periodo.fim}
        aoAplicar={(novo) => setPeriodo(novo)}
      />

      {consulta.erro ? <Alerta tipo="erro">{consulta.erro.message}</Alerta> : null}
      {consulta.carregando ? <EstadoCarregando mensagem="Calculando relatorio..." /> : null}

      {dados && !consulta.carregando ? (
        <>
          <div className="resumos">
            <CartaoResumo
              titulo="Total de saidas"
              valor={formatarMoeda(dados.totalSaidas)}
              detalhe={dados.periodo ? `Periodo: ${dados.periodo.rotulo}` : undefined}
              tipo="saida"
            />
            <CartaoResumo
              titulo="Total de entradas"
              valor={formatarMoeda(dados.totalEntradas)}
              tipo="entrada"
            />
            <CartaoResumo
              titulo="Periodo anterior"
              valor={dados.periodoAnterior?.rotulo ?? '—'}
              detalhe={
                dados.periodoAnterior
                  ? `${dados.periodoAnterior.inicio} a ${dados.periodoAnterior.fim}`
                  : undefined
              }
              tipo="neutro"
            />
          </div>

          <div className="cartao">
            <h2 className="secao__titulo">Saidas por categoria</h2>

            {saidas.length === 0 ? (
              <EstadoVazio
                titulo="Nenhuma saida no periodo"
                descricao="Escolha outro periodo ou registre lancamentos de saida."
              />
            ) : (
              <>
                <div className="tabela-envolucro">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th scope="col">Categoria</th>
                        <th scope="col" className="tabela__numero">
                          Total
                        </th>
                        <th scope="col" className="tabela__numero">
                          %
                        </th>
                        <th scope="col" className="tabela__numero">
                          Periodo anterior
                        </th>
                        <th scope="col">Tendencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saidas.map((item) => (
                        <tr key={item.categoriaId}>
                          <td>{item.nome}</td>
                          <td className="tabela__numero">{formatarMoeda(item.total)}</td>
                          <td className="tabela__numero">{formatarPercentual(item.percentual)}</td>
                          <td className="tabela__numero">
                            {formatarMoeda(item.totalPeriodoAnterior)}
                          </td>
                          <td>
                            <span className={`tendencia tendencia--${item.tendencia}`}>
                              {descreverTendencia(item.tendencia, item.variacaoPercentual)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 className="secao__subtitulo">Grafico de saidas</h3>
                <GraficoBarras
                  dados={saidas.map((item) => ({
                    chave: item.categoriaId,
                    rotulo: item.nome,
                    valor: item.total,
                    tipo: 'saida',
                  }))}
                  formatarValor={formatarMoeda}
                />
              </>
            )}
          </div>

          <div className="cartao">
            <h2 className="secao__titulo">Entradas por categoria</h2>
            {entradas.length === 0 ? (
              <p className="texto-suave">Nenhuma entrada no periodo.</p>
            ) : (
              <div className="tabela-envolucro">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th scope="col">Categoria</th>
                      <th scope="col" className="tabela__numero">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entradas.map((item) => (
                      <tr key={item.categoriaId}>
                        <td>{item.nome}</td>
                        <td className="tabela__numero valor-positivo">
                          {formatarMoeda(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}
