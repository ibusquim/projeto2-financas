# Estado atual do back-end — auditoria

**Data da verificação:** 2026-11-22
**Verificado por:** agente Zoo Code, direto no repositório e no GitHub
**Commit da `main` analisada:** `c27ad40`
**Responsável pelo back-end:** Igor

> Documento de acompanhamento, não de comemoração. Cada linha abaixo foi checada no repositório (`git ls-files`, `dir`) ou na API do GitHub (`gh`), não por suposição.

---

## 1. Veredito

**O back-end NÃO está pronto.** Não existe servidor HTTP, não existe banco criado, não existe autenticação e não existe nenhum endpoint respondendo. O que está pronto é a base de regras de negócio, a documentação e o contrato da API, com 84 testes automatizados passando.

Estimativa honesta de conclusão da responsabilidade de Igor: **cerca de 30%**, considerando que as fases 1 a 6, 8, 9 e 10 do plano mestre ainda não começaram.

Comprovação objetiva da ausência do servidor:

```
dir /b backend\src        -> config, middlewares, models      (sem server.js)
dir /b backend\src\routes -> vazio / inexistente
dir /b backend\database   -> vazio / inexistente
type backend\package.json -> nenhuma dependencia declarada
findstr /s /i "express" backend\src\*.js -> nenhum uso
```

---

## 2. O que EXISTE e foi verificado

| Item | Arquivo | Evidência |
|---|---|---|
| Proteção dos documentos internos | [`.gitignore`](../.gitignore) | `git check-ignore -v` aponta linhas 160 e 161; `git ls-files` não lista os dois arquivos |
| README do projeto | [`README.md`](../README.md) | versionado na `main` |
| Contrato da API v1.0 | [`docs/api-contract.md`](api-contract.md) | todos os endpoints, erros e regras de fatura documentados |
| Modelagem proposta | [`docs/modelagem-dados.md`](modelagem-dados.md) | 4 entidades, restrições, índices e DDL de referência não aplicado |
| Proposta técnica ao professor | [`plans/proposta-tecnica.md`](../plans/proposta-tecnica.md) | comparação de bancos, bibliotecas e mensagem pronta |
| Validação de CPF, e-mail, senha, valor, data, cartão | [`validadores.js`](../backend/src/middlewares/validadores.js) | 21 testes |
| Datas UTC, mês curto, período anterior | [`regras-datas.js`](../backend/src/models/regras-datas.js) | 9 testes |
| Divisão de parcelas em centavos | [`regras-parcelamento.js`](../backend/src/models/regras-parcelamento.js) | 11 testes |
| Fechamento, vencimento e faturas | [`regras-faturas.js`](../backend/src/models/regras-faturas.js) | 14 testes |
| Relatórios agregados | [`regras-relatorios.js`](../backend/src/models/regras-relatorios.js) | 9 testes |
| Filtros, paginação e serialização | [`regras-consulta.js`](../backend/src/models/regras-consulta.js) | 11 testes |
| Padrão único de erro | [`erros.js`](../backend/src/middlewares/erros.js) | dentro de `erros-e-ambiente.test.js` |
| Leitura de variáveis de ambiente | [`ambiente.js`](../backend/src/config/ambiente.js) | dentro de `erros-e-ambiente.test.js` |
| Suíte automatizada | `backend/tests/` | `npm test` → 84 testes, 84 passando, 0 falhando |

---

## 3. O que NÃO existe (e por quê)

| Pendência | Bloqueio | Fase do plano |
|---|---|---|
| `backend/src/server.js` e Express | aprovação de bibliotecas (Issue #2) | Fase 2 |
| `backend/src/routes/` e todos os endpoints | depende de Express + banco | Fases 2 a 10 |
| `backend/database/migrations` e banco criado | aprovação do banco + credenciais do PostgreSQL | Fase 1 |
| Pool de conexão e models de acesso a dados | idem | Fase 1 |
| Cadastro, login, hash de senha e JWT | aprovação de `bcryptjs` e `jsonwebtoken` | Fase 3 |
| Middleware de autenticação e isolamento por usuário | idem | Fases 3 e 4 |
| Rate limiting no login e CORS restrito | aprovação de `express-rate-limit` e `cors` | Fase 2 |
| CRUD de categorias e fontes/destinos via HTTP | depende das anteriores | Fase 5 |
| CRUD de lançamentos com parcelamento transacional | depende das anteriores | Fase 6 |
| Rotas de relatório e de faturas | depende das anteriores | Fases 8, 9 e 10 |
| Seed com 2 usuários e 3 meses | depende do banco | Fase 1 |
| Testes de integração com `supertest` e dois usuários | depende do servidor | Fases 4 e 11 |

---

## 4. Checklist do enunciado (RF1 a RF9)

| Requisito | Regra de negócio | Rota HTTP | Situação |
|---|---|---|---|
| RF1 — Cadastro com validação no servidor | parcial (CPF, e-mail, senha validados) | não | **incompleto** |
| RF2 — Login, logout e JWT | não | não | **não iniciado** |
| RF3 — Isolamento entre usuários | parcial (serialização sem `senha_hash`) | não | **não iniciado** |
| RF4 — CRUD de categorias | não | não | **não iniciado** |
| RF5 — CRUD de fontes/destinos | validação de cartão pronta | não | **incompleto** |
| RF6 — CRUD de lançamentos, filtros, paginação, totais | filtros, paginação e totais prontos | não | **incompleto** |
| RF6 — Parcelamento com centavos exatos | **pronto e testado** | não | **incompleto** (falta persistência transacional) |
| RF7 — Relatório por categoria | **pronto e testado** | não | **incompleto** |
| RF8 — Relatório por fonte/destino | **pronto e testado** | não | **incompleto** |
| RF9 — Previsão de faturas | **pronto e testado** | não | **incompleto** |
| Unicidade de e-mail e CPF no banco | não (só validação de formato) | — | **não iniciado** |
| Hash + salt de senha | não | — | **não iniciado** |
| Consultas parametrizadas e pool | não | — | **não iniciado** |
| CORS restrito e rate limit | não | — | **não iniciado** |
| `.env` fora do Git, `.env.example` versionado | **pronto** | — | **concluído** |
| Padrão único de erro | **pronto** | — | **concluído** |
| Seed com 2 usuários e 3 meses | não | — | **não iniciado** |
| Estrutura sem `controllers` | **pronto** | — | **concluído** |

---

## 5. Situação do GitHub (verificada)

| Número | Tipo | Título | Estado |
|---|---|---|---|
| #1 | Issue | Preparar repositório, documentação e proteção de segredos | **fechada** |
| #2 | Issue | Registrar aprovação do banco e das bibliotecas | **aberta, `blocked`** |
| #4 | Issue | Frontend: proposta técnica e alinhamento do contrato | aberta (Rafael) |
| #6 | Issue | Regras puras de relatórios, consulta, erros e ambiente | **fechada** |
| #3 | PR | Preparação do repositório e contrato da API | **mergeado** em `a171eae` |
| #5 | PR | Frontend: proposta técnica (draft) | aberta (Rafael) |
| #7 | PR | Regras de relatórios, consulta, erros e ambiente | **mergeado** em `c27ad40` |

Nenhuma issue de back-end está aberta além da #2, que é exatamente o bloqueio de aprovação.

---

## 6. O que desbloqueia o restante

Sem estes dois itens, qualquer avanço no back-end viola a regra 6 do `AGENTS.md`:

1. **Aprovação escrita do professor** para banco e bibliotecas. Mensagem pronta na seção 10 de [`plans/proposta-tecnica.md`](../plans/proposta-tecnica.md). Ao receber, preencho a seção 1.2 do plano mestre e destravo tudo.
2. **Credenciais locais do PostgreSQL**: versão (15 ou 17), porta, usuário e senha. Os dois serviços existem na máquina, mas `psql` não está no PATH e não tenho a senha.

---

## 7. Fronteira com o front-end (quando é só o Rafael)

Hoje **não é apenas a vez do Rafael**. O front-end dele avança em paralelo sem depender de mim, porque o contrato já está publicado, mas o back-end continua com trabalho meu pendente e bloqueado.

É só o Rafael quando, e apenas quando, estes itens estiverem concluídos do meu lado:

- servidor Express no ar com `/api/health` respondendo;
- banco criado, migrations aplicadas e seed carregado;
- cadastro e login funcionando com JWT real;
- CRUDs de categorias, fontes/destinos e lançamentos respondendo pelo contrato;
- rotas de relatórios e de faturas respondendo com dados reais;
- isolamento entre dois usuários comprovado por teste.

Enquanto qualquer um desses estiver pendente, ainda existe trabalho de back-end.

Itens que são exclusivamente do Rafael, sem dependência de código meu: páginas, componentes, `AuthContext`, `react-router-dom`, cliente HTTP, gráficos, formatação de moeda e datas, estados de carregamento, vazio e erro.
