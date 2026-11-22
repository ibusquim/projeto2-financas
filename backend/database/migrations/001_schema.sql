-- Schema do Projeto 2 Full Stack — Controle Financeiro Pessoal
-- Aplicado pelo script database/migrar.js
--
-- Decisoes refletidas aqui:
--   * dinheiro em NUMERIC(14,2), nunca float;
--   * unicidade de e-mail e CPF garantida pelo banco;
--   * cartao de credito com fechamento, vencimento e limite obrigatorios;
--   * parcela entre 1 e 48, com grupo de parcelamento obrigatorio quando parcelado;
--   * FKs com ON DELETE RESTRICT em lancamentos, para bloquear exclusao de item em uso.

CREATE TABLE IF NOT EXISTS usuarios (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(254) NOT NULL,
  cpf         CHAR(11)     NOT NULL,
  senha_hash  VARCHAR(255) NOT NULL,
  criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_email_unico   UNIQUE (email),
  CONSTRAINT usuarios_cpf_unico     UNIQUE (cpf),
  CONSTRAINT usuarios_email_formato CHECK (email = lower(email) AND email LIKE '%_@_%._%'),
  CONSTRAINT usuarios_cpf_formato   CHECK (cpf ~ '^[0-9]{11}$'),
  CONSTRAINT usuarios_nome_check    CHECK (char_length(btrim(nome)) >= 3)
);

CREATE TABLE IF NOT EXISTS categorias (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT      NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  nome        VARCHAR(60) NOT NULL,
  tipo        VARCHAR(7)  NOT NULL,
  CONSTRAINT categorias_tipo_check  CHECK (tipo IN ('entrada', 'saida')),
  CONSTRAINT categorias_nome_unico  UNIQUE (usuario_id, tipo, nome)
);

CREATE TABLE IF NOT EXISTS fontes_destinos (
  id              BIGSERIAL PRIMARY KEY,
  usuario_id      BIGINT      NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  nome            VARCHAR(60) NOT NULL,
  tipo            VARCHAR(14) NOT NULL,
  dia_fechamento  SMALLINT,
  dia_vencimento  SMALLINT,
  limite          NUMERIC(14,2),
  CONSTRAINT fontes_tipo_check    CHECK (tipo IN ('renda', 'conta', 'cartao_credito')),
  CONSTRAINT fontes_nome_unico    UNIQUE (usuario_id, nome),
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

CREATE TABLE IF NOT EXISTS lancamentos (
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

CREATE INDEX IF NOT EXISTS lancamentos_usuario_data_idx ON lancamentos (usuario_id, data DESC);
CREATE INDEX IF NOT EXISTS lancamentos_categoria_idx    ON lancamentos (usuario_id, categoria_id);
CREATE INDEX IF NOT EXISTS lancamentos_fonte_idx        ON lancamentos (usuario_id, fonte_destino_id);
CREATE INDEX IF NOT EXISTS lancamentos_grupo_idx        ON lancamentos (grupo_parcelamento)
  WHERE grupo_parcelamento IS NOT NULL;
