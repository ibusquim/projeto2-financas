# Projeto 2 Full Stack — Controle Financeiro Pessoal

Aplicação web de controle financeiro pessoal com front-end SPA em React e back-end próprio em Node.js + Express, persistência real em banco de dados e autenticação por JWT.

**Disciplina:** Programação Web Full Stack — Engenharia de Software
**Integrantes:** Igor (back-end) e Rafael (front-end)

---

## 1. O que a aplicação faz

O usuário se cadastra, entra no sistema e registra movimentações financeiras. Cada lançamento é uma **entrada** ou **saída**, tem uma **categoria** e está associado a uma **fonte/destino** (renda, conta ou cartão de crédito). O sistema oferece:

- CRUD de categorias e de fontes/destinos, isolados por usuário.
- CRUD de lançamentos com filtros por período, tipo, categoria e fonte/destino, paginação e totais.
- Compra parcelada em cartão de crédito, com divisão exata dos centavos.
- Relatório por categoria, com percentual e comparação com o período anterior.
- Relatório por fonte/destino, com saldo por conta.
- Previsão de faturas de cartão, considerando fechamento, vencimento, parcelas futuras e limite utilizado.

---

## 2. Arquitetura

```text
Navegador
   |
   | React SPA / HTTP + JSON
   v
Frontend (Vite + React)
   |
   | Authorization: Bearer <JWT>
   v
Backend (Node.js + Express, API REST)
   |
   | consultas parametrizadas / pool
   v
Banco de dados persistente
```

O front-end nunca acessa o banco. Toda validação, autorização, isolamento por usuário e cálculo de relatórios e faturas acontece no back-end. O `usuario_id` vem sempre do JWT, nunca do corpo ou da URL da requisição.

---

## 3. Estrutura de pastas

```text
projeto2-fullstack/
├── README.md
├── .gitignore
├── docs/
│   └── api-contract.md          # contrato da API para o front-end
├── plans/
│   └── proposta-tecnica.md      # opções técnicas e solicitação ao professor
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── database/
│   │   ├── migrations/          # DDL versionado
│   │   └── seed/                # dados de demonstração
│   ├── tests/                   # testes automatizados (node:test)
│   └── src/
│       ├── server.js
│       ├── routes/              # rotas + controladores
│       ├── models/              # único ponto de acesso ao banco
│       ├── middlewares/         # autenticação, validação, erros
│       └── config/              # variáveis de ambiente e pool
└── frontend/                    # responsabilidade do Rafael
```

Não existe `backend/src/controllers`: os controladores ficam nos arquivos de rotas, conforme a estrutura exigida pelo enunciado.

---

## 4. Tecnologias

| Camada | Tecnologia | Situação |
|---|---|---|
| Back-end | Node.js 20+ / Express | Aguardando aprovação do professor |
| Banco | PostgreSQL, driver `pg`, SQL puro com pool | Aguardando aprovação do professor |
| Autenticação | JWT (`jsonwebtoken`) + hash de senha (`bcryptjs`) | Aguardando aprovação do professor |
| Segurança HTTP | `cors`, `express-rate-limit`, `dotenv` | Aguardando aprovação do professor |
| Testes back-end | `node:test` nativo + `supertest` | `node:test` já em uso |
| Front-end | React + Vite + `react-router-dom` + `recharts` | Responsabilidade do Rafael |

As decisões e a justificativa de cada escolha estão em `plans/proposta-tecnica.md`. **Nenhuma dependência é instalada antes da aprovação do professor.**

---

## 5. Pré-requisitos

- Node.js 20 ou superior (o projeto foi validado com Node 24).
- npm 10 ou superior.
- PostgreSQL instalado localmente (serviço detectado na máquina de desenvolvimento).

---

## 6. How to run — back-end (após aprovação das dependências)

```bash
cd backend
npm install
cp .env.example .env        # preencher as variáveis, nunca versionar o .env
npm run criar-banco         # cria banco e aplica as migrations
npm run seed                # carrega dados de demonstração
npm run dev                 # sobe a API em http://localhost:3000
```

## 7. Como executar os testes

```bash
cd backend
npm test
```

Os testes usam o executor nativo `node:test`, sem dependências externas. Hoje já cobrem as regras puras de negócio:

- validação de CPF, e-mail, senha, valor, data e cartão;
- divisão de valores em parcelas, com centavos exatos;
- cálculo de fechamento, vencimento e mês de referência de cada fatura.

---

## 8. Dados de demonstração

O seed cria dois usuários e pelo menos três meses de lançamentos, incluindo uma compra parcelada em cartão de crédito. As credenciais de demonstração serão documentadas aqui quando o seed for implementado (sem credenciais reais de terceiros).

---

## 9. Contrato da API

O contrato completo, pronto para consumo pelo front-end, está em [`docs/api-contract.md`](docs/api-contract.md). Ele descreve método, URL, autenticação, parâmetros, corpo, resposta, códigos de erro e regras de autorização de cada endpoint.

---

## 10. Status atual

| Item | Situação |
|---|---|
| Repositório protegido (documentos internos fora do Git) | Concluído |
| Labels e primeiras Issues | Concluído |
| Documentação e contrato da API | Concluído |
| Regras puras de negócio + testes automatizados | Concluído |
| Aprovação de banco e bibliotecas | **Aguardando o professor** |
| Modelagem e criação do banco | Bloqueado pela aprovação |
| Cadastro, login, JWT e rate limit | Bloqueado pela aprovação |
| CRUDs, relatórios e faturas via HTTP | Bloqueado pela aprovação |

---

## 11. Regras de segurança aplicadas no back-end

- Senha nunca armazenada em texto puro: apenas hash com salt.
- `senha_hash` nunca retornado em nenhuma resposta.
- JWT com expiração; token ausente, inválido ou expirado resulta em `401`.
- Toda consulta protegida filtra por `usuario_id` obtido do token.
- Registro de outro usuário responde `404`, sem revelar existência.
- Consultas SQL sempre parametrizadas.
- Unicidade de e-mail e de CPF garantida por restrição do banco.
- CORS restrito à origem do front-end.
- Rate limiting na rota de login.
- Valores monetários sem `float`: `NUMERIC` no banco e aritmética em centavos inteiros no servidor.
