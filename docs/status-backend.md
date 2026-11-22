# Estado do back-end — auditoria atualizada

**Data:** 2026-11-22
**Verificado por:** agente Zoo Code, executando os comandos no repositório e no PostgreSQL real
**Responsável:** Igor

---

## 1. Veredito

**O back-end está implementado, executando e testado.** Servidor Express no ar, banco criado, migrations aplicadas, seed carregado e **112 testes automatizados passando, com 0 falhas e 0 skips**, incluindo testes de integração contra o PostgreSQL real.

A implementação avançou sob autorização explícita de Igor (PostgreSQL 17/15 e bibliotecas da proposta técnica), com comunicação ao professor ainda pendente — ver seção 6.

---

## 2. Evidências executadas

```
npm run db:criar    -> [db:criar] banco "projeto2_financas" criado com sucesso.
npm run db:migrar   -> [db:migrar] 001_schema.sql aplicada.
npm run db:seed     -> 2 usuários, 12 lançamentos cada, parcelamento 3x de 1000.00
npm test            -> tests 112 | pass 112 | fail 0 | skipped 0
```

Fluxo HTTP real contra o servidor rodando (`http://localhost:3000/api`):

| Chamada | Resultado observado |
|---|---|
| `GET /health` | `200 {"status":"ok",...}` |
| `GET /lancamentos` sem token | `401 {"erro":"Autenticacao necessaria."}` |
| `POST /auth/login` (usuário do seed) | `200`, token emitido |
| `GET /auth/me` | `200`, sem `senha_hash`, `id` numérico |
| `GET /categorias` | `200`, 9 categorias padrão |
| `GET /fontes-destinos` | `200`, Conta corrente e Cartao Visa Demo |
| `GET /lancamentos` | `200`, itens 4, entradas 4500.00, saídas 1680.00, saldo 2820.00 |
| `POST /lancamentos` 100.00 em 3x | `201`, parcelas `["33.34","33.33","33.33"]` |
| `POST /lancamentos` valor 0.00 | `400 {"campos":{"valor":"O valor deve ser maior que zero."}}` |
| `GET /relatorios/categorias` | `200`, Lazer 1080.00 (63.03%), Alimentacao 633.34 (36.97%) |
| `GET /relatorios/fontes-destinos` | `200`, saldo Conta corrente 3900.00 |
| `GET /relatorios/faturas?meses=3` | `200`, limite 5000.00, usado 3180.00, disponível 1820.00, 3 faturas com itens |
| `DELETE /lancamentos/:id?escopo=grupo` | `204`, grupo removido; parcela conferida depois responde `404` |

---

## 3. Requisitos do enunciado

| Requisito | Situação | Evidência |
|---|---|---|
| RF1 Cadastro com validação no servidor | **concluído** | CPF com dígitos verificadores, e-mail normalizado, senha 8+ com letra e número, `400` por campo |
| Unicidade de e-mail e CPF no banco | **concluído** | `UNIQUE` + tradução de constraint para `409` no campo correto |
| RF2 Login, JWT e expiração | **concluído** | `bcryptjs` com salt, `jsonwebtoken`, `401` genérico, rate limit no login |
| RF3 Isolamento entre usuários | **concluído** | testes com dois usuários: listar, ler, editar, excluir e usar categoria alheia |
| RF4 CRUD de categorias | **concluído** | listar/criar/editar/excluir, `409` em duplicidade e em uso |
| RF5 CRUD de fontes/destinos | **concluído** | cartão exige fechamento, vencimento e limite; `409` em uso |
| RF6 CRUD de lançamentos, filtros, paginação, totais | **concluído** | período padrão no mês corrente, totais calculados no banco |
| RF6 Parcelamento com centavos exatos | **concluído** | `33.34 + 33.33 + 33.33`, transação única, grupo gravado |
| RF7 Relatório por categoria | **concluído** | `GROUP BY`, percentual, comparação com período anterior, tendência |
| RF8 Relatório por fonte/destino | **concluído** | entradas por fonte, saídas por destino, saldo por conta |
| RF9 Previsão de faturas | **concluído** | fechamento, vencimento, parcelas futuras, limite utilizado e disponível |
| Seed com 2 usuários e 3 meses | **concluído** | `npm run db:seed` |
| Hash + salt, consultas parametrizadas, pool | **concluído** | `bcryptjs`, todas as queries com `$n`, `Pool` com limite de 10 |
| CORS restrito e rate limit | **concluído** | origem do Vite + limite por IP no login |
| `.env` fora do Git | **concluído** | `git check-ignore` confirma; `.env.example` versionado |
| Padrão único de erro | **concluído** | `{ erro, campos? }`, `500` sem vazar detalhe |
| Estrutura sem `controllers` | **concluído** | `src/` tem apenas `server.js`, `routes`, `models`, `middlewares`, `config` |

---

## 4. Correções feitas durante a validação

1. **JSON malformado virava `500`** com mensagem do parser. Agora o middleware traduz `entity.parse.failed` para `400` e `entity.too.large` para `413`. Bug real, encontrado por teste de fumaça.
2. **`id` retornava como string** (`"1"`), porque o driver `pg` devolve `BIGINT` como texto. Configurado parser de OID 20 para `Number`, mantendo `NUMERIC` como string de propósito. Coberto por asserção nos testes.

---

## 5. Situação do GitHub

| Número | Tipo | Título | Estado |
|---|---|---|---|
| #1 | Issue | Preparar repositório, documentação e proteção de segredos | fechada |
| #2 | Issue | Registrar aprovação do banco e das bibliotecas | **aberta, `blocked`** |
| #4 | Issue | Frontend: proposta técnica (Rafael) | aberta |
| #6 | Issue | Regras puras de relatórios, consulta, erros e ambiente | fechada |
| #8 | Issue | Auditoria do estado do back-end | fechada |
| #10 | Issue | Implementar API HTTP completa | fechada pelo PR #11 |
| #3, #7, #9 | PRs | Preparação, regras puras e auditoria | mergeados |
| #5 | PR | Frontend: proposta técnica (Rafael) | draft, dele |
| #11 | PR | API HTTP completa | mergeado |

---

## 6. Pendências reais

1. **Aprovação do professor** (Issue #2). A implementação foi autorizada pelo Igor em 2026-11-22 assumindo PostgreSQL e as bibliotecas da proposta, com comunicação posterior. A mensagem pronta está na seção 10 de [`plans/proposta-tecnica.md`](../plans/proposta-tecnica.md). Falta apenas registrar a resposta na seção 1.2 do plano mestre.
2. **Ambiente local:** o PostgreSQL acessível está na porta **5433** (o cluster da 5432 recusou a senha informada). A configuração está no `backend/.env`, que não é versionado.
3. **Desafio opcional de saúde financeira:** não implementado, conforme a regra de só começar depois de todos os requisitos obrigatórios estarem concluídos e validados.

---

## 7. Fronteira com o front-end

**Agora é a vez do Rafael.** Do lado do back-end, está entregue:

- servidor Express com `/api/health` respondendo;
- banco criado, migrations e seed aplicados;
- cadastro, login e JWT funcionando;
- CRUDs de categorias, fontes/destinos e lançamentos;
- relatórios por categoria e por fonte/destino;
- previsão de faturas;
- isolamento entre dois usuários comprovado por teste automatizado;
- contrato completo em [`docs/api-contract.md`](api-contract.md).

O que resta para o back-end é apenas a formalidade da aprovação do professor.
