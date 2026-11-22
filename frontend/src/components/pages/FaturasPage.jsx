import { useState } from 'react'

import * as faturasService from '../../services/faturasService.js'
import {
  formatarData,
  formatarMesReferencia,
  formatarMoeda,
} from '../../services/formatadores.js'
import useConsulta from '../../services/useConsulta.js'
import Alerta from '../ui/Alerta.jsx'
import CartaoResumo from '../ui/CartaoResumo.jsx'
import EstadoCarregando from '../ui/EstadoCarregando.jsx'
import EstadoVazio from '../ui/EstadoVazio.jsx'

export default function FaturasPage() {
  const [meses, setMeses] = useState(3)

  const consulta = useConsulta(() => faturasService.listar({ meses }), [meses])
  const cartoes = consulta.dados?.cartoes ?? []

  return (
    <section className="pagina">
      <header className="pagina__cabecalho pagina__cabecalho--linha">
        <div>
          <h1 className="pagina__titulo">Faturas</h1>
          <p className="pagina__descricao">
            Fatura atual e previsao das proximas faturas. Todos os totais e limites sao
            calculados pelo servidor.
          </p>
        </div>

        <label className="campo campo--inline">
          <span className="campo__rotulo">Faturas futuras</span>
          <select
            className="campo__entrada"
            value={meses}
            onChange={(evento) => setMeses(Number(evento.target.value))}
          >
            <option value={3}>Proximas 3</option>
            <option value={6}>Proximas 6</option>
            <option value={12}>Proximas 12</option>
          </select>
        </label>
      </header>

      {consulta.erro ? <Alerta tipo="erro">{consulta.erro.message}</Alerta> : null}
      {consulta.carregando ? <EstadoCarregando mensagem="Calculando faturas..." /> : null}

      {!consulta.carregando && !consulta.erro && cartoes.length === 0 ? (
        <div className="cartao">
          <EstadoVazio
            titulo="Nenhum cartao de credito cadastrado"
            descricao="Cadastre um cartao em Fontes e destinos para acompanhar as faturas."
          />
        </div>
      ) : null}

      {!consulta.carregando && cartoes.length > 0 ? (
        <div className="pilha">
          {cartoes.map((cartao) => {
            const faturas = cartao.faturas ?? []
            const faturaAtual = faturas[0]

            return (
              <article className="cartao cartao--cartao" key={cartao.cartaoId}>
                <div className="secao__cabecalho">
                  <div>
                    <h2 className="secao__titulo">{cartao.nome}</h2>
                    <p className="texto-suave">
                      Fecha dia {cartao.diaFechamento} | vence dia {cartao.diaVencimento}
                    </p>
                  </div>
                  {faturaAtual ? (
                    <span className="etiqueta etiqueta--aberta">
                      Fatura atual: {formatarMesReferencia(faturaAtual.mesReferencia)}
                    </span>
                  ) : null}
                </div>

                <div className="resumos resumos--compactos">
                  <CartaoResumo titulo="Limite" valor={formatarMoeda(cartao.limite)} />
                  <CartaoResumo
                    titulo="Utilizado"
                    valor={formatarMoeda(cartao.limiteUtilizado)}
                    tipo="saida"
                  />
                  <CartaoResumo
                    titulo="Disponivel"
                    valor={formatarMoeda(cartao.limiteDisponivel)}
                    tipo="entrada"
                  />
                </div>

                {faturas.length === 0 ? (
                  <EstadoVazio
                    titulo="Cartao sem faturas"
                    descricao="Nenhuma compra parcelada ou a vista foi registrada neste cartao."
                  />
                ) : (
                  <div className="pilha">
                    {faturas.map((fatura) => (
                      <div className="fatura" key={fatura.mesReferencia}>
                        <div className="fatura__cabecalho">
                          <div>
                            <strong className="fatura__mes">
                              {formatarMesReferencia(fatura.mesReferencia)}
                            </strong>
                            <span className="texto-suave">
                              Fecha {formatarData(fatura.fechamento)} | vence{' '}
                              {formatarData(fatura.vencimento)}
                            </span>
                          </div>
                          <div className="fatura__total">
                            <span className={`etiqueta etiqueta--${fatura.status}`}>
                              {fatura.status}
                            </span>
                            <strong>{formatarMoeda(fatura.total)}</strong>
                          </div>
                        </div>

                        {(fatura.itens ?? []).length > 0 ? (
                          <ul className="lista-simples lista-simples--fatura">
                            {fatura.itens.map((item) => (
                              <li key={item.lancamentoId}>
                                <span>
                                  {item.rotuloParcela ?? item.descricao}
                                  {item.rotuloParcela
                                    ? ` (${item.parcelaAtual}/${item.totalParcelas})`
                                    : ''}
                                </span>
                                <strong>{formatarMoeda(item.valor)}</strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="texto-suave">Sem itens nesta fatura.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
