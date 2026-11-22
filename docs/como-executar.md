# Guia de instalação e execução

Documento destinado a qualquer pessoa que precise executar o projeto a partir de um ambiente limpo, sem conhecimento prévio do código.

**Projeto:** Aplicação Full Stack de Controle Financeiro Pessoal
**Componentes:** API REST em Node.js/Express com PostgreSQL e aplicação web em React/Vite
**Repositório:** `https://github.com/ibusquim/projeto2-fullstack`

---

## 1. Visão geral da execução

A aplicação é composta por três processos independentes que precisam estar ativos simultaneamente:

| Processo | Porta padrão | Responsabilidade |
|---|---|---|
| Servidor PostgreSQL | `5432` ou `5433` | persistência dos dados |
| API (Node.js/Express) | `3000` | regras de negócio, autenticação e acesso ao banco |
| Aplicação web (Vite) | `5173` | interface do usuário |

A aplicação web não acessa o banco de dados. Toda comunicação ocorre por HTTP/JSON entre o navegador e a API, autenticada por JWT.

---

## 2. Requisitos de ambiente

| Requisito | Versão mínima | Verificação |
|---|---|---|
| Node.js | 20 | `node -v` |
| npm | 10 | `npm -v` |
| PostgreSQL | 15 | serviço em execução ou cliente `pgAdmin` |

O PostgreSQL deve estar em execução antes do provisionamento do banco. A porta utilizada deve ser identificada no `pgAdmin` ou nos serviços do sistema operacional, pois instalações com mais de um cluster costumam ocupar portas distintas (por exemplo, `5432` e `5433`).

---

## 3. Obtenção do código-fonte

```bash
git clone https://github.com/ibusquim/projeto2-fullstack.git
cd projeto2-fullstack
```

Para atualizar uma cópia existente:

```bash
git switch main
git pull --ff-only origin main
```

---

## 4. Instalação das dependências

As dependências são declaradas por componente e devem ser instaladas separadamente.

```bash
cd backend
npm install

cd ../frontend
npm install
```

---

## 5. Configuração das variáveis de ambiente

A API lê a configuração de um arquivo `.env`, que não é versionado. O modelo público é o `.env.example`.

```bash
cd backend
copy .env.example .env
```

As variáveis e seus significados:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | não | porta da API (padrão `3000`) |
| `NODE_ENV` | não | ambiente de execução |
| `CORS_ORIGIN` | não | origens autorizadas, separadas por vírgula |
| `DB_HOST` | sim | host do PostgreSQL |
| `DB_PORT` | sim | porta do cluster em uso |
| `DB_NAME` | sim | nome do banco (sugerido `projeto2_financas`) |
| `DB_USER` | sim | usuário do banco |
| `DB_PASSWORD` | sim | senha do usuário do banco |
| `JWT_SECRET` | sim | segredo de assinatura, mínimo de 32 caracteres |
| `JWT_EXPIRACAO` | não | validade do token (padrão `2h`) |
| `LOGIN_MAX_TENTATIVAS` | não | limite de tentativas de login (padrão `10`) |
| `LOGIN_JANELA_MINUTOS` | não | janela do limitador (padrão `15`) |

Geração de um segredo adequado para `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

O valor de `CORS_ORIGIN` deve conter todas as origens pelas quais a interface será acessada. O navegador envia no cabeçalho `Origin` exatamente o endereço digitado, portanto recomenda-se incluir as duas formas:

```ini
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

> A aplicação recusa iniciar se `JWT_SECRET` tiver menos de 32 caracteres ou se qualquer variável obrigatória do banco estiver ausente. A mensagem de erro lista exatamente quais variáveis precisam de correção.

---

## 6. Provisionamento do banco de dados

Com o PostgreSQL em execução e o `.env` preenchido:

```bash
cd backend
npm run db:preparar
```

O comando executa três etapas sequenciais e pode ser repetido com segurança:

| Etapa | Comando isolado | Efeito |
|---|---|---|
| Criação | `npm run db:criar` | cria o banco definido em `DB_NAME`, se não existir |
| Migração | `npm run db:migrar` | aplica os arquivos de `database/migrations` em ordem e registra cada um na tabela `migracoes` |
| Dados de demonstração | `npm run db:seed` | recria dois usuários com categorias padrão, conta corrente, cartão de crédito, três meses de lançamentos e uma compra parcelada |

Saída esperada:

```text
[db:criar] banco "projeto2_financas" criado com sucesso.
[db:migrar] 001_schema.sql aplicada.
[db:seed] igor.demo@exemplo.com | senha: senha1234 | parcelamento: ... (3x de 1000.00)
[db:seed] rafael.demo@exemplo.com | senha: senha1234 | parcelamento: ... (3x de 1000.00)
[db:seed] total de lancamentos de igor.demo@exemplo.com: 12
[db:seed] total de lancamentos de rafael.demo@exemplo.com: 12
[db:seed] concluido.
```

---

## 7. Execução da API

```bash
cd backend
npm run dev
```

Saída esperada:

```text
[server] API ouvindo em http://localhost:3000/api (development)
```

Verificação:

```bash
curl http://localhost:3000/api/health
```

Resposta esperada:

```json
{ "status": "ok", "servico": "projeto2-fullstack-backend", "horario": "2026-11-22T06:00:00.000Z" }
```

---

## 8. Execução da aplicação web

Em um segundo terminal:

```bash
cd frontend
npm run dev
```

Endereço de acesso: `http://localhost:5173`.

Credenciais de demonstração criadas pelo seed:

| E-mail | Senha |
|---|---|
| `igor.demo@exemplo.com` | `senha1234` |
| `rafael.demo@exemplo.com` | `senha1234` |

---

## 9. Verificação do fluxo funcional

Após o login, recomenda-se a seguinte sequência para comprovar o funcionamento completo:

1. **Lançamentos → Novo lançamento**: registrar uma saída de `50,00` na conta corrente. O registro deve aparecer imediatamente na listagem e nos totais do mês.
2. **Lançamentos → Novo lançamento** com destino em cartão de crédito, valor `100,00` e `3` parcelas: a API divide o valor em `33,34 + 33,33 + 33,33` e cria as três parcelas no mesmo grupo.
3. **Faturas**: a compra parcelada deve aparecer distribuída nas faturas seguintes, com o rótulo de parcela, além de limite utilizado e disponível.
4. **Relatórios**: selecionar um período e conferir totais, percentuais, comparação com o período anterior e gráficos.
5. **Categorias**: criar uma categoria e tentar repetir o mesmo nome para o mesmo tipo. A API responde `409` e a mensagem é exibida junto ao campo.
6. **Saúde financeira** (desafio): abrir o item correspondente no menu. A página exibe cinco indicadores calculados no servidor, a projeção de saldo de seis meses em gráfico, as categorias fora da curva, as dicas e o aviso educativo.

---

## 10. Verificação da persistência no banco

### 10.1 Interface gráfica (pgAdmin)

1. Abrir o `pgAdmin` e selecionar o cluster correspondente à porta configurada em `DB_PORT`.
2. Navegar até `Databases` → `projeto2_financas` → `Schemas` → `public` → `Tables`.
3. Devem existir as tabelas `usuarios`, `categorias`, `fontes_destinos`, `lancamentos` e `migracoes`.
4. Para inspecionar registros: botão direito na tabela → **View/Edit Data** → **All Rows**.
5. Para consultas livres: botão direito no banco → **Query Tool**.

### 10.2 Linha de comando (psql)

```bash
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5433 -U postgres -d projeto2_financas
```

Dentro do `psql`, `\dt` lista as tabelas e `\q` encerra a sessão.

### 10.3 Consultas de verificação

```sql
-- Volume de lançamentos por usuário
SELECT u.email, COUNT(l.id) AS lancamentos
  FROM usuarios u
  LEFT JOIN lancamentos l ON l.usuario_id = u.id
 GROUP BY u.email
 ORDER BY u.email;

-- Últimos lançamentos com categoria e fonte/destino
SELECT l.id, l.data, l.tipo, l.descricao, l.valor,
       c.nome AS categoria, f.nome AS fonte_destino,
       l.parcela_atual || '/' || l.total_parcelas AS parcela
  FROM lancamentos l
  JOIN categorias c ON c.id = l.categoria_id
  JOIN fontes_destinos f ON f.id = l.fonte_destino_id
 ORDER BY l.id DESC
 LIMIT 10;

-- Parcelas de cada compra parcelada
SELECT parcela_atual, total_parcelas, valor, data, grupo_parcelamento
  FROM lancamentos
 WHERE grupo_parcelamento IS NOT NULL
 ORDER BY grupo_parcelamento, parcela_atual;

-- Confirmação de que a soma das parcelas iguala o valor da compra
SELECT grupo_parcelamento,
       COUNT(*)   AS parcelas,
       SUM(valor) AS total,
       MIN(valor) AS menor_parcela,
       MAX(valor) AS maior_parcela
  FROM lancamentos
 WHERE grupo_parcelamento IS NOT NULL
 GROUP BY grupo_parcelamento;

-- Confirmação de que a senha é armazenada como hash
SELECT email, LEFT(senha_hash, 7) AS inicio_do_hash, LENGTH(senha_hash) AS tamanho
  FROM usuarios;

-- Totais de saída por categoria no mês corrente
SELECT c.nome, SUM(l.valor) AS total
  FROM lancamentos l
  JOIN categorias c ON c.id = l.categoria_id
 WHERE l.tipo = 'saida'
   AND l.data >= date_trunc('month', CURRENT_DATE)
 GROUP BY c.nome
 ORDER BY total DESC;
```

Qualquer lançamento criado pela interface deve aparecer nessas consultas imediatamente, comprovando a persistência.

---

## 11. Verificação dos controles de segurança

| Verificação | Comando | Resultado esperado |
|---|---|---|
| Rota protegida sem token | `curl -i http://localhost:3000/api/lancamentos` | `401` com `{"erro":"Autenticacao necessaria."}` |
| Login válido | `POST /api/auth/login` com usuário do seed | `200` com `token` |
| Senha incorreta | `POST /api/auth/login` com senha errada | `401` com mensagem genérica |
| E-mail duplicado | `POST /api/auth/cadastro` com e-mail existente | `409` com `campos.email` |
| CPF duplicado | `POST /api/auth/cadastro` com CPF existente | `409` com `campos.cpf` |
| Valor inválido | `POST /api/lancamentos` com `valor: "0.00"` | `400` com `campos.valor` |
| Origem não autorizada | requisição com `Origin` desconhecida | sem cabeçalho `Access-Control-Allow-Origin` |

Exemplo de login:

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"igor.demo@exemplo.com","senha":"senha1234"}'
```

---

## 12. Execução da suíte de testes

```bash
cd backend
npm test
```

Resultado de referência: **114 testes, 114 aprovados, 0 falhas**, incluindo testes de integração com o PostgreSQL real que cobrem isolamento entre dois usuários, unicidade de e-mail e CPF, parcelamento com centavos exatos, relatórios e previsão de faturas.

Validação do front-end:

```bash
cd frontend
npm run lint
npm run build
```

---

## 13. Diagnóstico de falhas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| `password authentication failed` | senha ou porta divergentes no `.env` | revisar `DB_PORT` e `DB_PASSWORD` |
| `ECONNREFUSED` na porta do banco | serviço do PostgreSQL parado | iniciar o serviço e confirmar a porta |
| Interface exibe falha de conexão com o servidor | API não está em execução | iniciar a API e conferir `/api/health` |
| Erro de CORS no navegador | origem ausente em `CORS_ORIGIN` | incluir a origem exata utilizada |
| `EADDRINUSE` | porta ocupada por processo anterior | encerrar o processo ou alterar a porta |
| Login retorna `401` sempre | dados de demonstração ausentes | executar `npm run db:seed` |
| Login retorna `429` | limite de tentativas atingido | aguardar a janela configurada |
| API não inicia e lista variáveis | `.env` incompleto | preencher as variáveis indicadas |

---

## 14. Encerramento dos serviços

Encerrar os processos com `Ctrl + C` em cada terminal.

Caso as portas permaneçam ocupadas:

```bash
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %a /F
for /f "tokens=5" %a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /PID %a /F
```

---

## 15. Roteiro resumido de demonstração

1. `npm run db:preparar` no diretório `backend`: comprova criação do banco, migração e carga inicial.
2. `npm run dev` na API e `npm run dev` na aplicação web.
3. Autenticação com um usuário de demonstração.
4. Registro de um lançamento simples e de uma compra de `100,00` em `3` parcelas.
5. Abertura da tela de faturas para exibir a distribuição das parcelas e o limite comprometido.
6. Consulta direta ao banco, no `pgAdmin`, confirmando a soma exata das parcelas e o hash da senha.
7. Tentativa de cadastro com e-mail repetido, demonstrando a resposta `409` no campo correto.
8. Requisição a uma rota protegida sem token, demonstrando a resposta `401`.
9. Abertura da página de saúde financeira, mostrando os indicadores, a projeção em gráfico e as dicas calculadas no servidor.
