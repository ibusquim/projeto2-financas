# Contrato da API — Controle Financeiro Pessoal

**Versão do contrato:** 1.0 (publicado antes da implementação, para o front-end trabalhar sem adivinhação)
**Base URL local:** `http://localhost:3000/api`
**Formato:** JSON em requisição e resposta (`Content-Type: application/json`, `charset=utf-8`)

> Responsável pelo contrato e pela implementação: Igor (back-end).
> Consumidor: Rafael (front-end).
> Qualquer alteração neste documento será sinalizada na Issue correspondente antes de entrar em produção.

---

## 1. Autenticação

Todas as rotas de `/api`, **exceto** `POST /api/auth/cadastro` e `POST /api/auth/login`, exigem o cabeçalho:

```http
Authorization: Bearer <token>
```

Regras:

- Token ausente, malformado, inválido ou expirado: `401` com `{ "erro": "Autenticação necessária." }` ou `{ "erro": "Sessão expirada." }`.
- O front-end deve, ao receber `401`, limpar o token e redirecionar para o login.
- O identificador do usuário é sempre extraído do token. **Nenhuma rota aceita `usuarioId` no corpo ou na URL.**
- Registros que pertencem a outro usuário respondem `404`, e não `403`, para não revelar a existência do registro.

---

## 2. Enums e formatos globais

| Campo | Valores |
|---|---|
| `tipo` de categoria | `entrada`, `saida` |
| `tipo` de lançamento | `entrada`, `saida` |
| `tipo` de fonte/destino | `renda`, `conta`, `cartao_credito` |
| Datas | string `AAAA-MM-DD` (ex.: `2026-11-22`) |
| Mês de referência | string `AAAA-MM` (ex.: `2026-11`) |
| Dinheiro na requisição | `valor` em reais, aceito como string decimal (`"100.00"`) ou number (`100.00`) |
| Dinheiro na resposta | `valor` como **string** com duas casas (`"33.34"`) e `valorCentavos` como inteiro (`3334`) |

**Por que `valor` sai como string:** para o front-end nunca fazer aritmética com ponto flutuante. Para exibir, basta `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` sobre `Number(valor)`. Para qualquer soma, use `valorCentavos`.

---

## 3. Formato único de erro

Toda resposta de erro tem esta forma:

```json
{
  "erro": "Dados inválidos.",
  "campos": {
    "email": "Informe um e-mail válido.",
    "valor": "O valor deve ser maior que zero."
  }
}
```

- `erro` é a mensagem geral, para exibir no topo do formulário ou em um toast.
- `campos` é opcional e mapeia o nome do campo para a mensagem, para exibir junto ao input.
- Em `500`, a resposta nunca contém detalhes internos, SQL ou stack trace.

### Códigos usados

| Código | Significado |
|---|---|
| `200` | Consulta ou atualização bem-sucedida |
| `201` | Recurso criado |
| `204` | Exclusão bem-sucedida, sem corpo |
| `400` | Dados inválidos, período inválido, parâmetro fora da regra |
| `401` | Token ausente, inválido ou expirado; credenciais inválidas |
| `404` | Recurso inexistente ou pertencente a outro usuário |
| `409` | Conflito: e-mail ou CPF duplicado, nome duplicado, exclusão bloqueada |
| `429` | Muitas tentativas de login (rate limit) |
| `500` | Erro inesperado do servidor |

---

## 4. Autenticação

### 4.1 `POST /api/auth/cadastro`

Cria usuário, cria as categorias padrão e pelo menos uma fonte/destino padrão, tudo em uma única operação consistente.

Requisição:

```json
{
  "nome": "Igor Busquim",
  "email": "Igor@Exemplo.com",
  "cpf": "529.982.247-25",
  "senha": "senha1234",
  "confirmacaoSenha": "senha1234"
}
```

Regras de validação no servidor:

- `nome` obrigatório, 3 a 120 caracteres.
- `email` obrigatório, formato válido, normalizado com `trim().toLowerCase()`.
- `cpf` obrigatório, dígitos verificadores válidos, armazenado somente com dígitos.
- `senha` mínimo 8 caracteres, com pelo menos uma letra e um número.
- `confirmacaoSenha` deve ser igual a `senha`.

Resposta `201`:

```json
{
  "usuario": { "id": 1, "nome": "Igor Busquim", "email": "igor@exemplo.com", "cpf": "52998224725" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Erros:

| Situação | Código | Corpo |
|---|---|---|
| Campo inválido | `400` | `{ "erro": "Dados inválidos.", "campos": { "cpf": "CPF inválido." } }` |
| E-mail já cadastrado | `409` | `{ "erro": "Dados inválidos.", "campos": { "email": "Este e-mail já está cadastrado." } }` |
| CPF já cadastrado | `409` | `{ "erro": "Dados inválidos.", "campos": { "cpf": "Este CPF já está cadastrado." } }` |

`senha_hash` nunca aparece em nenhuma resposta.

### 4.2 `POST /api/auth/login`

```json
{ "email": "igor@exemplo.com", "senha": "senha1234" }
```

Resposta `200`:

```json
{
  "usuario": { "id": 1, "nome": "Igor Busquim", "email": "igor@exemplo.com" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- Credenciais inválidas: `401` com `{ "erro": "E-mail ou senha inválidos." }` — sempre a mesma mensagem, sem indicar qual campo errou.
- Mais de 10 tentativas em 15 minutos por IP: `429` com `{ "erro": "Muitas tentativas. Tente novamente mais tarde." }`.

### 4.3 `GET /api/auth/me`

Retorna o usuário do token. Usado para restaurar a sessão após recarregar a página.

```json
{ "id": 1, "nome": "Igor Busquim", "email": "igor@exemplo.com", "cpf": "52998224725", "criadoEm": "2026-11-22T04:00:00.000Z" }
```

### 4.4 Logout

Não existe endpoint. O front-end descarta o token do `localStorage` e volta ao login.

---

## 5. Categorias

### 5.1 `GET /api/categorias`

Query opcional: `?tipo=entrada` ou `?tipo=saida`.

```json
[
  { "id": 1, "nome": "Salário", "tipo": "entrada" },
  { "id": 2, "nome": "Alimentação", "tipo": "saida" }
]
```

### 5.2 `POST /api/categorias`

```json
{ "nome": "Transporte", "tipo": "saida" }
```

- `201` com a categoria criada.
- `400` se `nome` vazio, maior que 60 caracteres ou `tipo` fora de `entrada`/`saida`.
- `409` se já existir categoria com o mesmo nome para o mesmo tipo do usuário:
  `{ "erro": "Dados inválidos.", "campos": { "nome": "Já existe uma categoria com este nome para este tipo." } }`

### 5.3 `PUT /api/categorias/:id`

Mesmo corpo do `POST`. Retorna `200` com a categoria atualizada. `404` para categoria inexistente ou de outro usuário. `409` em caso de nome duplicado.

### 5.4 `DELETE /api/categorias/:id`

- `204` sem corpo em caso de sucesso.
- `404` para categoria inexistente ou de outro usuário.
- `409` se houver lançamentos associados:
  `{ "erro": "Não é possível excluir: existem lançamentos usando esta categoria." }`

---

## 6. Fontes e destinos

### 6.1 `GET /api/fontes-destinos`

Query opcional: `?tipo=renda`, `?tipo=conta`, `?tipo=cartao_credito`.

```json
[
  { "id": 1, "nome": "Salário CLT", "tipo": "renda" },
  { "id": 2, "nome": "Conta corrente", "tipo": "conta" },
  {
    "id": 3,
    "nome": "Nubank",
    "tipo": "cartao_credito",
    "diaFechamento": 3,
    "diaVencimento": 10,
    "limite": "5000.00",
    "limiteCentavos": 500000
  }
]
```

### 6.2 `POST /api/fontes-destinos`

```json
{ "nome": "Cartão Visa", "tipo": "cartao_credito", "diaFechamento": 25, "diaVencimento": 5, "limite": "3000.00" }
```

Regras:

- `nome` obrigatório, único por usuário (`409` em duplicidade).
- `tipo` obrigatoriamente `renda`, `conta` ou `cartao_credito`.
- Para `cartao_credito`, `diaFechamento` e `diaVencimento` são obrigatórios, inteiros de 1 a 31, e `limite` deve ser maior que zero. Falta ou valor inválido: `400` com a mensagem no campo correspondente.
- Para `renda` e `conta`, os campos de cartão devem ser omitidos ou nulos.

Retorna `201` com o recurso criado.

### 6.3 `PUT /api/fontes-destinos/:id`

Mesmo corpo do `POST`, com as mesmas validações. `404` se não pertencer ao usuário.

### 6.4 `DELETE /api/fontes-destinos/:id`

- `204` em caso de sucesso.
- `409` se houver lançamentos associados.

---

## 7. Lançamentos

### 7.1 `GET /api/lancamentos`

Query:

| Parâmetro | Tipo | Regra |
|---|---|---|
| `inicio` | data `AAAA-MM-DD` | Padrão: primeiro dia do mês corrente |
| `fim` | data `AAAA-MM-DD` | Padrão: último dia do mês corrente |
| `tipo` | `entrada`/`saida` | Opcional |
| `categoriaId` | inteiro | Opcional |
| `fonteDestinoId` | inteiro | Opcional |
| `pagina` | inteiro ≥ 1 | Padrão `1` |
| `porPagina` | inteiro 1–100 | Padrão `20` |

Resposta `200`:

```json
{
  "itens": [
    {
      "id": 12,
      "tipo": "saida",
      "descricao": "Notebook",
      "valor": "33.34",
      "valorCentavos": 3334,
      "data": "2026-11-22",
      "categoria": { "id": 4, "nome": "Lazer" },
      "fonteDestino": { "id": 3, "nome": "Nubank", "tipo": "cartao_credito" },
      "parcelaAtual": 1,
      "totalParcelas": 3,
      "grupoParcelamento": "9f2c1d8e-3b4a-4c5d-8e7f-1a2b3c4d5e6f"
    }
  ],
  "paginacao": { "pagina": 1, "porPagina": 20, "totalItens": 37, "totalPaginas": 2 },
  "totais": { "entradas": "4500.00", "saidas": "1200.00", "saldo": "3300.00" }
}
```

Os totais são calculados no servidor, sobre **todo o período filtrado**, não apenas sobre a página atual.

`400` se `inicio` > `fim` ou data inválida.

### 7.2 `POST /api/lancamentos`

Lançamento simples:

```json
{
  "tipo": "saida",
  "descricao": "Supermercado",
  "valor": "154.90",
  "data": "2026-11-22",
  "categoriaId": 2,
  "fonteDestinoId": 2
}
```

Compra parcelada (somente quando `fonteDestinoId` é um cartão de crédito):

```json
{
  "tipo": "saida",
  "descricao": "Notebook",
  "valor": "100.00",
  "data": "2026-11-22",
  "categoriaId": 4,
  "fonteDestinoId": 3,
  "parcelas": 3
}
```

Regras:

- `tipo` obrigatoriamente `entrada` ou `saida`.
- `descricao` obrigatória, até 200 caracteres.
- `valor` maior que zero, com no máximo 2 casas decimais.
- `data` válida no formato `AAAA-MM-DD`.
- `categoriaId` deve existir e pertencer ao usuário: senão `404`.
- `fonteDestinoId` deve existir e pertencer ao usuário: senão `404`.
- O tipo da categoria deve ser igual ao tipo do lançamento: senão `400` com mensagem no campo `categoriaId`.
- `parcelas` opcional, inteiro de 1 a 48. Só é aceito quando a fonte/destino é `cartao_credito`; caso contrário `400`.
- Todas as parcelas são gravadas em uma única transação.

Resposta `201` para lançamento simples:

```json
{ "id": 41, "tipo": "saida", "descricao": "Supermercado", "valor": "154.90", "valorCentavos": 15490, "data": "2026-11-22", "categoriaId": 2, "fonteDestinoId": 2, "parcelaAtual": 1, "totalParcelas": 1, "grupoParcelamento": null }
```

Resposta `201` para compra parcelada (lista de parcelas criadas):

```json
{
  "grupoParcelamento": "9f2c1d8e-3b4a-4c5d-8e7f-1a2b3c4d5e6f",
  "totalParcelas": 3,
  "valorTotal": "100.00",
  "parcelas": [
    { "id": 42, "parcelaAtual": 1, "totalParcelas": 3, "valor": "33.34", "valorCentavos": 3334, "data": "2026-11-22" },
    { "id": 43, "parcelaAtual": 2, "totalParcelas": 3, "valor": "33.33", "valorCentavos": 3333, "data": "2026-12-22" },
    { "id": 44, "parcelaAtual": 3, "totalParcelas": 3, "valor": "33.33", "valorCentavos": 3333, "data": "2027-01-22" }
  ]
}
```

Regra de divisão: o valor é dividido em centavos; a diferença de arredondamento vai **toda para a primeira parcela**, e a soma das parcelas é sempre exatamente igual ao valor original.

### 7.3 `GET /api/lancamentos/:id`

Retorna o lançamento detalhado, no mesmo formato do item de listagem. `404` se não pertencer ao usuário.

### 7.4 `PUT /api/lancamentos/:id`

Mesmo corpo e validações do `POST` simples. Não é permitido transformar um lançamento existente em compra parcelada nem alterar `grupoParcelamento`; para isso, exclua e recrie.

- `200` com o lançamento atualizado.
- `404` se não pertencer ao usuário.
- `400` em validação.

### 7.5 `DELETE /api/lancamentos/:id`

Query:

| Parâmetro | Valores | Efeito |
|---|---|---|
| `escopo` | `parcela` (padrão) | Exclui somente a parcela indicada |
| `escopo` | `grupo` | Exclui todas as parcelas do mesmo `grupoParcelamento` |

- `204` em caso de sucesso.
- `404` se não pertencer ao usuário.
- `400` se `escopo` tiver valor inválido.

---

## 8. Relatórios

### 8.1 `GET /api/relatorios/categorias`

Query: `inicio`, `fim` (padrão: mês corrente).

```json
{
  "periodo": { "inicio": "2026-11-01", "fim": "2026-11-30", "rotulo": "11/2026" },
  "periodoAnterior": { "inicio": "2026-10-01", "fim": "2026-10-31", "rotulo": "10/2026" },
  "totalSaidas": "1200.00",
  "totalEntradas": "4500.00",
  "saidasPorCategoria": [
    { "categoriaId": 2, "nome": "Alimentação", "total": "700.00", "percentual": 58.33, "totalPeriodoAnterior": "600.00", "variacaoPercentual": 16.67, "tendencia": "aumento" }
  ],
  "entradasPorCategoria": [
    { "categoriaId": 1, "nome": "Salário", "total": "4500.00" }
  ]
}
```

- `saidasPorCategoria` ordenado do maior para o menor total.
- `tendencia`: `aumento`, `reducao` ou `estavel`.
- O período anterior tem o mesmo número de dias do período consultado.
- Todos os percentuais e variações são calculados no servidor.

### 8.2 `GET /api/relatorios/fontes-destinos`

Query: `inicio`, `fim`.

```json
{
  "periodo": { "inicio": "2026-11-01", "fim": "2026-11-30" },
  "entradasPorFonte": [ { "fonteDestinoId": 1, "nome": "Salário CLT", "total": "4500.00" } ],
  "saidasPorDestino": [ { "fonteDestinoId": 3, "nome": "Nubank", "total": "800.00" } ],
  "saldoPorConta": [ { "fonteDestinoId": 2, "nome": "Conta corrente", "entradas": "4500.00", "saidas": "400.00", "saldo": "4100.00" } ]
}
```

### 8.3 `GET /api/relatorios/faturas`

Query: `meses` (inteiro ≥ 3, padrão `3`), `cartaoId` opcional (filtra um único cartão).

```json
{
  "cartoes": [
    {
      "cartaoId": 3,
      "nome": "Nubank",
      "diaFechamento": 3,
      "diaVencimento": 10,
      "limite": "5000.00",
      "limiteUtilizado": "1600.00",
      "limiteDisponivel": "3400.00",
      "faturas": [
        {
          "mesReferencia": "2026-11",
          "fechamento": "2026-11-03",
          "vencimento": "2026-11-10",
          "total": "33.34",
          "status": "aberta",
          "itens": [
            {
              "lancamentoId": 42,
              "descricao": "Notebook",
              "rotuloParcela": "Notebook — 1/3",
              "parcelaAtual": 1,
              "totalParcelas": 3,
              "valor": "33.34"
            }
          ]
        }
      ]
    }
  ]
}
```

Regras de cálculo, documentadas e testadas:

1. Compra feita **antes** do dia de fechamento entra na fatura que fecha no mesmo mês.
2. Compra feita **no dia do fechamento ou depois** entra na fatura que fecha no mês seguinte.
3. A parcela `k` cai `k - 1` meses depois da fatura da primeira parcela.
4. Se `diaVencimento` for maior que `diaFechamento`, o vencimento é no mesmo mês do fechamento; caso contrário, no mês seguinte.
5. Dias inexistentes no mês (dia 31 em fevereiro) são ajustados para o último dia do mês.
6. O mês de referência da fatura é o mês do **vencimento**.
7. `limiteUtilizado` é a soma de todas as parcelas ainda não vencidas; `limiteDisponivel` é `limite - limiteUtilizado`.

Exemplos de referência verificados nos testes automatizados:

| Cartão | Compra | Parcela | Fechamento | Vencimento | Fatura |
|---|---|---|---:|---|---|
| Nubank (fecha 3, vence 10) | 02/11/2026 | 1/1 | 03/11/2026 | 10/11/2026 | 11/2026 |
| Nubank (fecha 3, vence 10) | 03/11/2026 | 1/1 | 03/12/2026 | 10/12/2026 | 12/2026 |
| Visa (fecha 25, vence 5) | 28/12/2026 | 1/1 | 25/01/2027 | 05/02/2027 | 02/2027 |
| Visa (fecha 25, vence 5) | 20/12/2026 | 3/3 | 25/02/2027 | 05/03/2027 | 03/2027 |

---

## 9. Desafio opcional — saúde financeira

`GET /api/saude-financeira` (somente após todos os requisitos obrigatórios estarem concluídos e testados).

```json
{
  "indicadores": [
    { "chave": "taxaPoupanca", "titulo": "Taxa de poupança", "valor": 26.6, "unidade": "%", "classificacao": "boa", "explicacao": "..." }
  ],
  "projecao": [ { "mesReferencia": "2026-12", "saldoProjetado": "3400.00" } ],
  "dicas": [ "..." ],
  "aviso": "As informações são educativas e não constituem recomendação financeira profissional."
}
```

Todos os números são calculados no back-end. Nenhuma chave de serviço externo é exposta ao navegador.

---

## 10. Resumo dos endpoints

| Método | Rota | Autenticação | Sucesso |
|---|---|---|---|
| POST | `/api/auth/cadastro` | Não | `201` |
| POST | `/api/auth/login` | Não | `200` |
| GET | `/api/auth/me` | Sim | `200` |
| GET | `/api/categorias` | Sim | `200` |
| POST | `/api/categorias` | Sim | `201` |
| PUT | `/api/categorias/:id` | Sim | `200` |
| DELETE | `/api/categorias/:id` | Sim | `204` |
| GET | `/api/fontes-destinos` | Sim | `200` |
| POST | `/api/fontes-destinos` | Sim | `201` |
| PUT | `/api/fontes-destinos/:id` | Sim | `200` |
| DELETE | `/api/fontes-destinos/:id` | Sim | `204` |
| GET | `/api/lancamentos` | Sim | `200` |
| POST | `/api/lancamentos` | Sim | `201` |
| GET | `/api/lancamentos/:id` | Sim | `200` |
| PUT | `/api/lancamentos/:id` | Sim | `200` |
| DELETE | `/api/lancamentos/:id` | Sim | `204` |
| GET | `/api/relatorios/categorias` | Sim | `200` |
| GET | `/api/relatorios/fontes-destinos` | Sim | `200` |
| GET | `/api/relatorios/faturas` | Sim | `200` |
| GET | `/api/saude-financeira` | Sim | `200` |
| GET | `/api/health` | Não | `200` |

---

## 11. Observações para o front-end

1. Não calcule relatórios nem faturas no cliente: consuma os totais e percentuais da API.
2. Use `valorCentavos` para qualquer soma e `valor` (string) para exibir.
3. Trate `401` globalmente no cliente HTTP: limpar token, redirecionar para login.
4. Exiba `campos` junto ao input correspondente e `erro` como mensagem geral.
5. Toda tela que consome API precisa de estado de carregamento, lista vazia e erro.
6. Ao receber `404` em edição ou exclusão, trate como "registro não encontrado" e recarregue a lista.
