import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  formatarData,
  formatarMoeda,
  mesCorrenteISO,
} from '../../services/formatadores.js'
import * as lancamentosService from '../../services/lancamentosService.js'
import useConsulta from '../../services/useConsulta.js'
import Alerta from '../ui/Alerta.jsx'
import CartaoResumo from '../ui/CartaoResumo.jsx'
import EstadoCarregando from '../ui/EstadoCarregando.jsx'
import EstadoVazio from '../ui/EstadoVazio.jsx'

export default function DashboardPage() {
  const [periodo] = useState(mesCorrenteISO())

  const consulta = useConsulta(
    () => lancamentosService.listar({ ...periodo, pagina: 1, porPagina: 5 }),
    [periodo.inicio, periodo.fim],
  )

  const itens = consulta.dados?.itens ?? []
  const totais = consulta.dados?.totais ?? { entradas: '0.00', saidas: '0.00', saldo: '0.00' }

  return (
    <section className="pagina">
      <header className="pagina__cabecalho">
        <h1 className="pagina__titulo">Painel</h1>
        <p className="pagina__descricao">
          Resumo do mes corrente. Os valores sao calculados pelo servidor sobre todos os
          lancamentos do periodo.
        </p>
      </header>

      {consulta.erro ? <Alerta tipo="erro">{consulta.erro.message}</Alerta> : null}

      <div className="resumos">
        <CartaoResumo
          titulo="Entradas do mes"
          valor={formatarMoeda(totais.entradas)}
          tipo="entrada"
        />
        <CartaoResumo titulo="Saidas do mes" valor={formatarMoeda(totais.saidas)} tipo="saida" />
        <CartaoResumo titulo="Saldo do mes" valor={formatarMoeda(totais.saldo)} tipo="saldo" />
      </div>

      <div className="cartao">
        <div className="secao__cabecalho">
          <h2 className="secao__titulo">Ultimos lancamentos</h2>
          <Link className="secao__link" to="/lancamentos">
            Ver todos
          </Link>
        </div>

        {consulta.carregando ? <EstadoCarregando mensagem="Carregando resumo..." /> : null}

        {!consulta.carregando && !consulta.erro && itens.length === 0 ? (
          <EstadoVazio
            titulo="Mes sem lancamentos"
            descricao="Registre sua primeira movimentacao para acompanhar entradas, saidas e saldo."
          >
            <Link className="botao botao--primario" to="/lancamentos">
              Ir para lancamentos
            </Link>
          </EstadoVazio>
        ) : null}

        {!consulta.carregando && itens.length > 0 ? (
          <div className="tabela-envolucro">
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Descricao</th>
                  <th scope="col">Categoria</th>
                  <th scope="col" className="tabela__numero">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id}>
                    <td>{formatarData(item.data)}</td>
                    <td>{item.descricao}</td>
                    <td>{item.categoria?.nome ?? '—'}</td>
                    <td
                      className={`tabela__numero ${
                        item.tipo === 'entrada' ? 'valor-positivo' : 'valor-negativo'
                      }`}
                    >
                      {item.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="acoes-rapidas">
        <Link className="botao botao--secundario" to="/lancamentos">
          Novo lancamento
        </Link>
        <Link className="botao botao--secundario" to="/relatorios/categorias">
          Ver relatorio por categoria
        </Link>
        <Link className="botao botao--secundario" to="/faturas">
          Ver faturas
        </Link>
      </div>

      {!consulta.carregando && !consulta.erro && itens.length > 0 ? (
        <p className="texto-suave pagina__rodape">
          Periodo: {formatarData(periodo.inicio)} a {formatarData(periodo.fim)}
        </p>
      ) : null}
    </section>
  )
}
