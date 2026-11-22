import { useState } from 'react'

import { formatarMoeda, mesCorrenteISO } from '../../services/formatadores.js'
import * as relatoriosService from '../../services/relatoriosService.js'
import useConsulta from '../../services/useConsulta.js'
import SeletorPeriodo from '../relatorios/SeletorPeriodo.jsx'
import Alerta from '../ui/Alerta.jsx'
import CartaoResumo from '../ui/CartaoResumo.jsx'
import EstadoCarregando from '../ui/EstadoCarregando.jsx'
import EstadoVazio from '../ui/EstadoVazio.jsx'
import GraficoBarras from '../ui/GraficoBarras.jsx'

export default function RelatorioFontesDestinosPage() {
  const [periodo, setPeriodo] = useState(mesCorrenteISO())

  const consulta = useConsulta(
    () => relatoriosService.porFonteDestino(periodo),
    [periodo.inicio, periodo.fim],
  )

  const dados = consulta.dados
  const entradasPorFonte = dados?.entradasPorFonte ?? []
  const saidasPorDestino = dados?.saidasPorDestino ?? []
  const saldoPorConta = dados?.saldoPorConta ?? []
  const semDados =
    entradasPorFonte.length === 0 && saidasPorDestino.length === 0 && saldoPorConta.length === 0

  return (
    <section className="pagina">
      <header className="pagina__cabecalho">
        <h1 className="pagina__titulo">Relatorio por fonte e destino</h1>
        <p className="pagina__descricao">
          Entradas agrupadas por fonte, saidas por destino e saldo das contas.
        </p>
      </header>

      <SeletorPeriodo
        inicio={periodo.inicio}
        fim={periodo.fim}
        aoAplicar={(novo) => setPeriodo(novo)}
      />

      {consulta.erro ? <Alerta tipo="erro">{consulta.erro.message}</Alerta> : null}
      {consulta.carregando ? <EstadoCarregando mensagem="Calculando relatorio..." /> : null}

      {dados && !consulta.carregando && semDados ? (
        <div className="cartao">
          <EstadoVazio
            titulo="Nenhuma movimentacao no periodo"
            descricao="Ajuste o periodo para visualizar as movimentacoes por fonte e destino."
          />
        </div>
      ) : null}

      {dados && !consulta.carregando && !semDados ? (
        <>
          <div className="resumos">
            <CartaoResumo
              titulo="Fontes com entrada"
              valor={String(entradasPorFonte.length)}
              detalhe={formatarMoeda(
                entradasPorFonte.reduce((soma, item) => soma + Number(item.total), 0),
              )}
              tipo="entrada"
            />
            <CartaoResumo
              titulo="Destinos com saida"
              valor={String(saidasPorDestino.length)}
              detalhe={formatarMoeda(
                saidasPorDestino.reduce((soma, item) => soma + Number(item.total), 0),
              )}
              tipo="saida"
            />
            <CartaoResumo
              titulo="Contas monitoradas"
              valor={String(saldoPorConta.length)}
              tipo="neutro"
            />
          </div>

          <div className="grade-duas-colunas">
            <div className="cartao">
              <h2 className="secao__titulo">Entradas por fonte</h2>
              {entradasPorFonte.length === 0 ? (
                <p className="texto-suave">Nenhuma entrada no periodo.</p>
              ) : (
                <>
                  <GraficoBarras
                    dados={entradasPorFonte.map((item) => ({
                      chave: item.fonteDestinoId,
                      rotulo: item.nome,
                      valor: item.total,
                      tipo: 'entrada',
                    }))}
                    formatarValor={formatarMoeda}
                  />
                  <ul className="lista-simples">
                    {entradasPorFonte.map((item) => (
                      <li key={item.fonteDestinoId}>
                        <span>{item.nome}</span>
                        <strong className="valor-positivo">{formatarMoeda(item.total)}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="cartao">
              <h2 className="secao__titulo">Saidas por destino</h2>
              {saidasPorDestino.length === 0 ? (
                <p className="texto-suave">Nenhuma saida no periodo.</p>
              ) : (
                <>
                  <GraficoBarras
                    dados={saidasPorDestino.map((item) => ({
                      chave: item.fonteDestinoId,
                      rotulo: item.nome,
                      valor: item.total,
                      tipo: 'saida',
                    }))}
                    formatarValor={formatarMoeda}
                  />
                  <ul className="lista-simples">
                    {saidasPorDestino.map((item) => (
                      <li key={item.fonteDestinoId}>
                        <span>{item.nome}</span>
                        <strong className="valor-negativo">{formatarMoeda(item.total)}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="cartao">
            <h2 className="secao__titulo">Saldo por conta</h2>
            {saldoPorConta.length === 0 ? (
              <p className="texto-suave">Nenhuma conta com movimentacao no periodo.</p>
            ) : (
              <div className="tabela-envolucro">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th scope="col">Conta</th>
                      <th scope="col" className="tabela__numero">
                        Entradas
                      </th>
                      <th scope="col" className="tabela__numero">
                        Saidas
                      </th>
                      <th scope="col" className="tabela__numero">
                        Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {saldoPorConta.map((item) => (
                      <tr key={item.fonteDestinoId}>
                        <td>{item.nome}</td>
                        <td className="tabela__numero valor-positivo">
                          {formatarMoeda(item.entradas)}
                        </td>
                        <td className="tabela__numero valor-negativo">
                          {formatarMoeda(item.saidas)}
                        </td>
                        <td className="tabela__numero">{formatarMoeda(item.saldo)}</td>
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
