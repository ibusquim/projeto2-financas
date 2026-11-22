# Projeto 2 Full Stack — Controle Financeiro Pessoal

Aplicação web de controle financeiro pessoal com front-end SPA em React e back-end próprio em **Node.js + Express + PostgreSQL**, autenticação **JWT** e persistência real.

**Disciplina:** Programação Web Full Stack — Engenharia de Software
**Integrantes:** Igor (back-end) e Rafael (front-end)

---

## 1. O que a aplicação faz

O usuário se cadastra, entra no sistema e registra movimentações. Cada lançamento é uma **entrada** ou **saída**, tem uma **categoria** e está associado a uma **fonte/destino** (renda, conta ou cartão de crédito).

- CRUD de categorias e de fontes/destinos, isolados por usuário.
- CRUD de lançamentos com filtros por período, tipo, categoria e fonte/destino, paginação e totais.
- Compra parcelada em cartão, com divisão exata dos centavos.
- Relatório por categoria com percentual e comparação ao período anterior.
- Relatório por fonte/destino com saldo por conta.
- Previsão de faturas de cartão com fechamento, vencimento, parcelas futuras e limite utilizado.

---

## 2. Status atual

| Item | Situação |
|---|---|
| Estrutura do back-end (sem `controllers`) | Concluída |
| Banco modelado, migrations e seed | Escritos, execução depende do PostgreSQL |
| Express, CORS, erros centralizados, rate limit | Concluídos |
| Cadastro, login, JWT e middleware de autenticação | Concluídos |
| Isolamento por usuário em todas as rotas | Implementado |
| CRUDs de categorias, fontes/destinos e lançamentos | Concluídos |
| Parcelamento transacional com centavos exatos | Concluído |
| Relatórios e previsão de faturas | Concluídos |
| Testes automatizados | **114 passando, 0 falhando** |
| Testes de integração com banco real | Concluídos, incluindo isolamento entre dois usuários |
| Front-end | Concluído: autenticação, CRUDs, dashboard, relatórios e faturas |

---

## 3. Tecnologias

**Back-end:** Node.js 20+, Express 5, PostgreSQL (driver `pg` com pool), `bcryptjs` (hash + salt), `jsonwebtoken`, `express-rate-limit`, `cors`, `dotenv`. Testes com `node:test` + `supertest`.

**Front-end:** React 19 + Vite 8 + `react-router-dom`. Gráficos implementados em CSS, alimentados pelos dados agregados do servidor, sem dependência adicional.

---

## 4. Estrutura do repositório

```text
projeto2-fullstack/
├── README.md
├── docs/
│   ├── api-contract.md        # contrato completo para o front-end
│   ├── modelagem-dados.md     # modelo, restrições e justificativas
│   └── status-backend.md       # auditoria do que está pronto
├── plans/
│   └── proposta-tecnica.md
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── database/
│   │   ├── criar-banco.js      # cria o banco se não existir
│   │   ├── migrar.js           # runner de migrations em SQL puro
│   │   ├── migrations/001_schema.sql
│   │   └── seed/seed.js        # 2 usuários e 3 meses de lançamentos
│   ├── tests/
│   └── src/
│       ├── server.js
│       ├── config/             # ambiente e pool de conexão
│       ├── middlewares/        # JWT, rate limit, validadores, erros
│       ├── models/             # único ponto de acesso ao banco
│       └── routes/             # rotas + controladores
└── frontend/
    ├── .env.example             # VITE_API_URL
    └── src/
        ├── components/          # páginas, layout e componentes de UI
        ├── contexts/            # AuthProvider e useAuth
        └── services/            # cliente HTTP e serviços por recurso
```

Não existe `backend/src/controllers`: os controladores ficam nos arquivos de rotas, conforme o enunciado.

---

## 5. Pré-requisitos

- Node.js 20+ (validado com Node 24)
- PostgreSQL 15 ou 17 rodando localmente
- npm 10+

---

> Guia completo, partindo de um ambiente limpo, com verificação da persistência no banco: [`docs/como-executar.md`](docs/como-executar.md).

## 6. Como executar o back-end

```bash
cd backend
npm install

# copie o arquivo de exemplo e preencha com os valores locais
cp .env.example .env
# edite DB_PASSWORD e gere um JWT_SECRET forte:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# cria o banco, aplica as migrations e carrega os dados de demonstração
npm run db:preparar

# sobe a API em http://localhost:3000/api
npm run dev
```

Health check: `GET http://localhost:3000/api/health`

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `PORT` | Porta da API (padrão `3000`) |
| `CORS_ORIGIN` | Origens autorizadas do front-end, separadas por vírgula (padrão `http://localhost:5173,http://127.0.0.1:5173`) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexão PostgreSQL |
| `JWT_SECRET` | Segredo do JWT, mínimo de 32 caracteres |
| `JWT_EXPIRACAO` | Validade do token (padrão `2h`) |
| `LOGIN_MAX_TENTATIVAS`, `LOGIN_JANELA_MINUTOS` | Rate limit do login |

O arquivo `.env` **nunca** é versionado. O `.env.example` não contém segredos reais.

---

## 7. Como executar os testes

```bash
cd backend
npm test
```

- Testes puros de regra de negócio e de fumaça HTTP rodam sempre.
- Testes de integração com banco rodam quando o PostgreSQL estiver acessível; caso contrário são marcados como `skipped`, para não confundir falta de ambiente com bug.

---

## 7.1 Como executar o front-end

```bash
cd frontend
npm install

# opcional: ajuste a URL da API
cp .env.example .env

npm run dev     # http://localhost:5173
npm run build   # build de produção em dist/
npm run lint    # oxlint
```

O front-end espera a API em `http://localhost:3000/api` e depende de o back-end liberar a origem usada no navegador. O padrão de `CORS_ORIGIN` já cobre `http://localhost:5173` e `http://127.0.0.1:5173`, porque o navegador envia no `Origin` exatamente o endereço aberto na barra.

Telas disponíveis: login, cadastro, painel, lançamentos com filtros e parcelamento, categorias, fontes/destinos, relatório por categoria, relatório por fonte/destino e faturas. Rotas internas redirecionam para o login quando não há sessão válida; qualquer `401` limpa o token e volta ao login.

---

## 8. Dados de demonstração

`npm run db:seed` cria (e recria, de forma idempotente) dois usuários:

| E-mail | Senha |
|---|---|
| `igor.demo@exemplo.com` | `senha1234` |
| `rafael.demo@exemplo.com` | `senha1234` |

Cada um recebe as categorias padrão, uma `Conta corrente`, um cartão `Cartao Visa Demo` (fecha dia 25, vence dia 5, limite R$ 5.000,00), três meses de lançamentos e uma compra parcelada de R$ 3.000,00 em 3x.

---

## 9. Endpoints

Todas as rotas exigem `Authorization: Bearer <token>`, exceto cadastro, login e health.

| Método | Rota | Função |
|---|---|---|
| GET | `/api/health` | Health check público |
| POST | `/api/auth/cadastro` | Cadastro + dados padrão |
| POST | `/api/auth/login` | Login e emissão de JWT |
| GET | `/api/auth/me` | Usuário do token |
| GET / POST | `/api/categorias` | Listar / criar |
| PUT / DELETE | `/api/categorias/:id` | Editar / excluir |
| GET / POST | `/api/fontes-destinos` | Listar / criar |
| PUT / DELETE | `/api/fontes-destinos/:id` | Editar / excluir |
| GET | `/api/lancamentos` | Listar com filtros, paginação e totais |
| POST | `/api/lancamentos` | Criar simples ou parcelado |
| GET / PUT / DELETE | `/api/lancamentos/:id` | Detalhar / editar / excluir |
| GET | `/api/relatorios/categorias` | Relatório por categoria |
| GET | `/api/relatorios/fontes-destinos` | Relatório por fonte/destino |
| GET | `/api/relatorios/faturas?meses=3` | Previsão de faturas |

Contrato detalhado, com corpos, exemplos e códigos de erro: [`docs/api-contract.md`](docs/api-contract.md).

### Exemplo de uso

```bash
# cadastro
curl -X POST http://localhost:3000/api/auth/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome":"Igor","email":"igor@exemplo.com","cpf":"529.982.247-25","senha":"senha1234","confirmacaoSenha":"senha1234"}'

# login (guarde o token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"igor@exemplo.com","senha":"senha1234"}'

# compra parcelada de R$ 100,00 em 3x
curl -X POST http://localhost:3000/api/lancamentos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"tipo":"saida","descricao":"Notebook","valor":"100.00","data":"2026-11-22","categoriaId":4,"fonteDestinoId":3,"parcelas":3}'
```

Resposta da compra parcelada:

```json
{
  "grupoParcelamento": "9f2c1d8e-3b4a-4c5d-8e7f-1a2b3c4d5e6f",
  "totalParcelas": 3,
  "valorTotal": "100.00",
  "parcelas": [
    { "id": 42, "parcelaAtual": 1, "valor": "33.34", "valorCentavos": 3334, "data": "2026-11-22" },
    { "id": 43, "parcelaAtual": 2, "valor": "33.33", "valorCentavos": 3333, "data": "2026-12-22" },
    { "id": 44, "parcelaAtual": 3, "valor": "33.33", "valorCentavos": 3333, "data": "2027-01-22" }
  ]
}
```

---

## 10. Regras de negócio implementadas

**Parcelamento:** valor dividido em centavos inteiros, com a diferença de arredondamento toda na primeira parcela; soma sempre igual ao valor original; só permitido quando a fonte/destino é cartão de crédito; 1 a 48 parcelas; todas gravadas em uma transação.

**Faturas:** compra antes do fechamento entra na fatura que fecha no mesmo mês; compra no dia do fechamento ou depois entra na seguinte; a parcela `k` cai `k - 1` meses após a primeira; vencimento no mesmo mês quando o dia é maior que o fechamento, senão no mês seguinte; dias inexistentes ajustados ao último dia do mês; o mês de referência é sempre o mês do vencimento.

**Isolamento:** todo `SELECT`, `UPDATE` e `DELETE` filtra por `usuario_id` extraído do JWT; registro de outro usuário responde `404`.

**Dinheiro:** `NUMERIC(14,2)` no banco, aritmética em centavos inteiros no servidor; a API devolve `valor` como string decimal e `valorCentavos` como inteiro.

---

## 11. Segurança aplicada

- Senha com hash + salt (`bcryptjs`, 10 rodadas); nunca em texto puro.
- `senha_hash` jamais retornado (garantido por `serializarUsuario` e coberto por teste).
- Unicidade de e-mail e CPF garantida por `UNIQUE` no banco, com `409` identificando o campo.
- CPF validado por dígitos verificadores, não apenas tamanho.
- Consultas sempre parametrizadas.
- CORS restrito à origem configurada.
- Rate limiting na rota de login.
- Erro inesperado responde `500` genérico; detalhes só no log do servidor.
- `.env` fora do Git; `.env.example` versionado.

---

## 12. Limitações conhecidas

- PostgreSQL local, sem deploy em nuvem.
- Sem endpoint de logout: o front-end descarta o token.
- Testes de integração exigem banco acessível; caso contrário são marcados como skip.
- Gráficos dos relatórios são barras em CSS, sem biblioteca externa.
- Testes automatizados de componentes do front-end não foram incluídos: a camada de serviços foi validada contra a API real durante o teste de integração.
