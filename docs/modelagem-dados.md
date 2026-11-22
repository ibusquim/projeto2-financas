# Modelagem de dados — proposta

**Status:** proposta técnica. O banco e o driver ainda **não foram aprovados** pelo professor (Issue #2). Nenhuma migration foi aplicada e nenhum script foi executado. Este documento existe para revisão da modelagem e para acelerar a Fase 1 no momento da aprovação.

**Decisão pendente de aprovação:** PostgreSQL 16, driver `pg` com Pool, SQL puro, sem ORM.

---

## 1. Entidades

```text
usuarios 1 --- N categorias
usuarios 1 --- N fontes_destinos
usuarios 1 --- N lancamentos
categorias 1 --- N lancamentos
fontes_destinos 1 --- N lancamentos
lancamentos N --- 1 grupo_parcelamento (agrupamento lógico, não é tabela)
```

### `usuarios`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `BIGSERIAL` | PK |
| `nome` | `VARCHAR(120)` | `NOT NULL` |
| `email` | `VARCHAR(254)` | `NOT NULL`, `UNIQUE`, normalizado `trim().toLowerCase()` |
| `cpf` | `CHAR(11)` | `NOT NULL`, `UNIQUE`, somente dígitos |
| `senha_hash` | `VARCHAR(255)` | `NOT NULL`, hash + salt |
| `criado_em` | `TIMESTAMPTZ` | default `now()` |

### `categorias`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `BIGSERIAL` | PK |
| `usuario_id` | `BIGINT` | FK → `usuarios`, `NOT NULL` |
| `nome` | `VARCHAR(60)` | `NOT NULL` |
| `tipo` | `VARCHAR(7)` | `NOT NULL`, `CHECK` em (`entrada`, `saida`) |

`UNIQUE (usuario_id, tipo, nome)` — o mesmo nome pode existir em entrada e em saída, mas não repetido dentro do mesmo tipo.

### `fontes_destinos`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `BIGSERIAL` | PK |
| `usuario_id` | `BIGINT` | FK → `usuarios`, `NOT NULL` |
| `nome` | `VARCHAR(60)` | `NOT NULL`, `UNIQUE` por usuário |
| `tipo` | `VARCHAR(14)` | `CHECK` em (`renda`, `conta`, `cartao_credito`) |
| `dia_fechamento` | `SMALLINT` | 1 a 31, obrigatório apenas para cartão |
| `dia_vencimento` | `SMALLINT` | 1 a 31, obrigatório apenas para cartão |
| `limite` | `NUMERIC(14,2)` | maior que zero, obrigatório apenas para cartão |

### `lancamentos`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `BIGSERIAL` | PK |
| `usuario_id` | `BIGINT` | FK → `usuarios`, `NOT NULL` |
| `tipo` | `VARCHAR(7)` | `CHECK` em (`entrada`, `saida`) |
| `descricao` | `VARCHAR(200)` | `NOT NULL` |
| `valor` | `NUMERIC(14,2)` | `CHECK valor > 0` |
| `data` | `DATE` | `NOT NULL` |
| `categoria_id` | `BIGINT` | FK → `categorias`, `ON DELETE RESTRICT` |
| `fonte_destino_id` | `BIGINT` | FK → `fontes_destinos`, `ON DELETE RESTRICT` |
| `parcela_atual` | `SMALLINT` | 1 a `total_parcelas` |
| `total_parcelas` | `SMALLINT` | 1 a 48 |
| `grupo_parcelamento` | `UUID` | `NULL` quando `total_parcelas = 1`; obrigatório quando parcelado |
| `criado_em` | `TIMESTAMPTZ` | default `now()` |

---

## 2. Decisões de modelagem e justificativa

1. **Dinheiro em `NUMERIC(14,2)`** e aritmética em centavos inteiros no servidor. `NUMERIC` guarda o valor exato e a divisão de parcelas é feita em inteiros, então R$ 100,00 em 3x nunca perde centavo.
2. **`ON DELETE RESTRICT` nas FKs de lançamento**: tentar apagar categoria ou fonte/destino em uso gera violação de integridade, que a API traduz em `409` com mensagem explicativa, atendendo ao requisito de não excluir item associado.
3. **Unicidade no banco, não só na aplicação**: `usuarios_email_unico` e `usuarios_cpf_unico` garantem que remover a checagem prévia do código não abre brecha para duplicata — exatamente o critério do enunciado.
4. **`CHECK` de campos do cartão**: um cartão precisa de fechamento, vencimento e limite; renda e conta não podem ter esses campos preenchidos.
5. **`CHECK` de parcelamento**: `total_parcelas` entre 1 e 48, `parcela_atual` coerente e `grupo_parcelamento` presente apenas quando há mais de uma parcela.
6. **Índices** em `(usuario_id, data)`, `(usuario_id, categoria_id)` e `(usuario_id, fonte_destino_id)` para a listagem filtrada e os relatórios, e índice parcial em `grupo_parcelamento` para exclusão de grupo.
7. **Categoria compatível com o tipo do lançamento** não pode ser garantida por `CHECK` simples, porque compara duas tabelas. A validação fica no back-end, dentro de transação, e é coberta por teste. Alternativa: `TRIGGER`, que será considerada se o professor exigir garantia no banco.
8. **`usuario_id` duplicado em `lancamentos`**: mantido por desempenho e por segurança, já que toda consulta filtra por ele. A consistência com `categoria.usuario_id` e `fonte_destino.usuario_id` é validada no back-end.

---

## 3. DDL proposto (PostgreSQL) — não aplicado

Guardado aqui para revisão. Na aprovação vira `backend/database/migrations/001_schema.sql`.

```sql
CREATE TABLE usuarios (
  id           BIGSERIAL PRIMARY KEY,
  nome         VARCHAR(120) NOT NULL,
  email        VARCHAR(254) NOT NULL,
  cpf          CHAR(11)     NOT NULL,
  senha_hash   VARCHAR(255) NOT NULL,
  criado_em    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_email_unico  UNIQUE (email),
  CONSTRAINT usuarios_cpf_unico    UNIQUE (cpf),
  CONSTRAINT usuarios_email_formato CHECK (email = lower(email) AND email LIKE '%_@_%._%'),
  CONSTRAINT usuarios_cpf_formato   CHECK (cpf ~ '^[0-9]{11}$')
);

CREATE TABLE categorias (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT      NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  nome        VARCHAR(60) NOT NULL,
  tipo        VARCHAR(7)  NOT NULL,
  CONSTRAINT categorias_tipo_check  CHECK (tipo IN ('entrada', 'saida')),
  CONSTRAINT categorias_nome_unico  UNIQUE (usuario_id, tipo, nome)
);

CREATE TABLE fontes_destinos (
  id              BIGSERIAL PRIMARY KEY,
  usuario_id      BIGINT      NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  nome            VARCHAR(60) NOT NULL,
  tipo            VARCHAR(14) NOT NULL,
  dia_fechamento  SMALLINT,
  dia_vencimento  SMALLINT,
  limite          NUMERIC(14,2),
  CONSTRAINT fontes_tipo_check CHECK (tipo IN ('renda', 'conta', 'cartao_credito')),
  CONSTRAINT fontes_nome_unico UNIQUE (usuario_id, nome),
  CONSTRAINT fontes_cartao_campos CHECK (
    (tipo = 'cartao_credito'
      AND dia_fechamento BETWEEN 1 AND 31
      AND dia_vencimento BETWEEN 1 AND 31
      AND limite IS NOT NULL AND limite > 0)
    OR
    (tipo <> 'cartao_credito'
      AND dia_fechamento IS NULL
      AND dia_vencimento IS NULL
      AND limite IS NULL)
  )
);

CREATE TABLE lancamentos (
  id                  BIGSERIAL PRIMARY KEY,
  usuario_id          BIGINT        NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  tipo                VARCHAR(7)    NOT NULL,
  descricao           VARCHAR(200)  NOT NULL,
  valor               NUMERIC(14,2) NOT NULL,
  data                DATE          NOT NULL,
  categoria_id        BIGINT        NOT NULL REFERENCES categorias (id) ON DELETE RESTRICT,
  fonte_destino_id    BIGINT        NOT NULL REFERENCES fontes_destinos (id) ON DELETE RESTRICT,
  parcela_atual       SMALLINT      NOT NULL DEFAULT 1,
  total_parcelas      SMALLINT      NOT NULL DEFAULT 1,
  grupo_parcelamento  UUID,
  criado_em           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT lancamentos_valor_positivo CHECK (valor > 0),
  CONSTRAINT lancamentos_tipo_check     CHECK (tipo IN ('entrada', 'saida')),
  CONSTRAINT lancamentos_parcelas_check CHECK (
    total_parcelas BETWEEN 1 AND 48 AND parcela_atual BETWEEN 1 AND total_parcelas
  ),
  CONSTRAINT lancamentos_grupo_check CHECK (
    (total_parcelas = 1 AND grupo_parcelamento IS NULL)
    OR (total_parcelas > 1 AND grupo_parcelamento IS NOT NULL)
  )
);

CREATE INDEX lancamentos_usuario_data_idx ON lancamentos (usuario_id, data DESC);
CREATE INDEX lancamentos_categoria_idx    ON lancamentos (usuario_id, categoria_id);
CREATE INDEX lancamentos_fonte_idx        ON lancamentos (usuario_id, fonte_destino_id);
CREATE INDEX lancamentos_grupo_idx        ON lancamentos (grupo_parcelamento)
  WHERE grupo_parcelamento IS NOT NULL;
```

---

## 4. Dados iniciais por usuário (criados no cadastro)

Categorias: `Salário` (entrada); `Alimentação`, `Moradia`, `Saúde`, `Mobilidade`, `Lazer`, `Educação`, `Outros` (saída); `Outros` (entrada).
Fonte/destino padrão: `Conta corrente` (tipo `conta`).

Tudo criado na mesma operação do cadastro: se qualquer insert falhar, o usuário não é criado.

---

## 5. Seed de demonstração

- 2 usuários distintos, com e-mails e CPFs fictícios válidos.
- Pelo menos 3 meses de lançamentos por usuário, cobrindo entrada e saída.
- Uma compra parcelada em cartão de crédito, com fechamento e vencimento diferentes, para demonstrar a previsão de faturas.
- Um cartão com limite comprometido por parcelas futuras.
- Nenhuma credencial real, e as senhas de demonstração serão documentadas no README.
