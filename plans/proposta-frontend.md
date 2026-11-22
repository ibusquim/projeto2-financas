# Proposta Técnica do Front-end — Controle Financeiro Pessoal

| Campo | Valor |
|---|---|
| Responsável | Rafael (front-end) |
| Revisão | Igor (back-end e contrato da API) |
| Data | 2026-11-22 |
| Status | Documento de planejamento. **Nenhuma biblioteca aprovada, nenhuma dependência instalada, nenhum código implementado.** |
| Issues relacionadas | #2 (aprovação de banco e bibliotecas), Issue de proposta do front-end criada a partir deste documento |
| Referências | `PLANO_MESTRE_PROJETO.md` seções 1.2, 7, 8, 10, 12 e 13.6 |

> Este documento não autoriza instalação. Ele existe para (a) permitir que o professor aprove ou rejeite cada biblioteca antes do uso,
> (b) registrar a estrutura de páginas, componentes, contextos e serviços do front-end e
> (c) listar objetivamente os pontos do contrato da API que precisam ser definidos por Igor antes da integração.

---

## 1. Objetivo

Preparar o início do front-end do Projeto 2 sem implementar funcionalidades, conforme a primeira missão acordada com Rafael:

1. diagnosticar o repositório e o GitHub;
2. identificar o que existe e o que falta;
3. identificar decisões pendentes de aprovação do professor;
4. mapear as Issues de front-end;
5. propor a organização de páginas, componentes, contextos e serviços;
6. listar o que precisa ser alinhado com Igor no contrato da API.

---

## 2. Diagnóstico do ambiente — 2026-11-22

Comandos executados nesta máquina e resultado real observado:

| Verificação | Resultado |
|---|---|
| `git remote -v` | `origin https://github.com/ibusquim/projeto2-fullstack` (fetch e push) |
| `git branch --show-current` | `main` |
| `git branch -a` | apenas `main` local e `remotes/origin/main` |
| `git status --short --branch` | `## main...origin/main` sem divergência; apenas `?? AGENTS.md` e `?? PLANO_MESTRE_PROJETO.md` |
| `git log -5 --oneline` | um único commit: `b24bd32 Initial commit` |
| `git fetch origin` | sem novidades; `main` local igual a `origin/main` |
| `git ls-files` | somente `.gitignore` e `README.md` |
| `git ls-files AGENTS.md PLANO_MESTRE_PROJETO.md` | vazio — os dois documentos internos **não** estão rastreados |
| `gh auth status` | autenticado como `RafaSpitz`, escopos `gist`, `read:org`, `repo`, `workflow` |
| `gh repo view` | `ibusquim/projeto2-fullstack`, visibilidade **PUBLIC**, branch padrão `main` |
| `gh label list` | labels do projeto já criados (backend, frontend, auth, database, security, integration, reports, billing, blocked, testing, prioridades) |
| `gh issue list --state open` | #1 "Preparar repositorio, documentacao e protecao de segredos" e #2 "Registrar aprovacao do banco e das bibliotecas" |
| `git` no `PATH` | **não encontrado**. Instalado em `C:\Program Files\Git\cmd\git.exe` (versão 2.56.1.windows.1); é necessário usar caminho completo ou corrigir o `PATH` |
| `gh` no `PATH` | **não encontrado**. Instalado em `C:\Program Files\GitHub CLI\gh.exe`; além disso o `gh` falha ao localizar o Git enquanto o Git não estiver no `PATH` |
| `node` / `npm` | **não instalados** em `C:\Program Files\nodejs`, `C:\Program Files (x86)\nodejs`, Chocolatey, Volta ou nvm |
| `frontend/` | diretório existe, mas está **vazio** (sem `package.json`, sem `src/`, sem Vite) |
| `backend/` | **não existe** |
| contrato da API | **não publicado**. Só existe a tabela mínima do plano mestre, que declara o formato definitivo como decisão de Igor |

### 2.1 Conclusões do diagnóstico

1. O repositório remoto existe, está público e sincronizado; o acesso de Rafael está funcional.
2. Os documentos internos estão fora do Git **hoje**, mas o `.gitignore` **não** os protege. Um `git add .` os publicaria.
3. A máquina de Rafael não consegue executar Vite porque **Node.js/npm não estão instalados**. Isso bloqueia fisicamente a Fase 1 do front-end.
4. Nenhuma Issue de front-end existe ainda. As Issues #1 e #2 são de organização e de aprovação, ambas com escopo de Igor.
5. A Issue #1 está com todo o escopo marcado como concluído, porém nada disso está em `main`: o `.gitignore` não foi alterado, `plans/proposta-tecnica.md` não existe, o `README.md` continua com duas linhas. O trabalho pode estar em uma branch local de Igor ainda não publicada. **Este documento não tenta refazer esse trabalho.**

---

## 3. Decisões pendentes de aprovação do professor

O plano mestre (seção 1.2) e o `AGENTS.md` (regra 6) proíbem instalar bibliotecas antes da aprovação.
Todas as opções abaixo são **propostas**, não decisões tomadas.

| Item | Recomendação | Alternativas consideradas | Motivo da recomendação | Se for negado |
|---|---|---|---|---|
| Ambiente de execução | Node.js LTS estável | nenhuma | Pré-requisito obrigatório do Vite; não é biblioteca de aplicação | impossível rodar o front-end |
| Framework | Vite + React (JavaScript/JSX) | Create React App (descontinuado), Next.js (fora do escopo SPA) | Exigido pelo enunciado e pelo plano mestre | bloqueio total |
| Roteamento | `react-router-dom` | navegação manual por estado, TanStack Router | Exigido pelo plano mestre (seção 8); padrão consolidado para SPA | rotas protegidas teriam de ser feitas à mão, com mais risco |
| Cliente HTTP | `fetch` nativo com um único módulo `services/api.js` | `axios` | Zero dependência nova; atende Authorization automático, erros tipados e tratamento de 401; reduz a superfície de aprovação | usar axios, se o professor exigir |
| Gráficos | `recharts` | `chart.js` + `react-chartjs-2`, ApexCharts, ECharts | API declarativa em React, componentes leves, MIT, atende pizza/rosca/barras dos relatórios | trocar por outra biblioteca aprovada; a tela fica pronta mas sem gráfico |
| Validação de formulário | HTML5 nativo + funções de validação próprias | `react-hook-form` + `zod`, `yup` | Evita dependência nova; a validação oficial é do servidor, a do cliente é complementar | adotar a biblioteca que o professor indicar |
| Estilização | CSS puro com `index.css`/`App.css` e CSS Modules por componente | Tailwind CSS, Bootstrap, Material UI, Chakra UI | Sem dependência nova, sem build extra e sem impor identidade visual de terceiros | adotar a opção institucional |
| Formatação de moeda e data | `Intl.NumberFormat`/`Intl.DateTimeFormat` nativos | `date-fns`, `dayjs`, `numeral` | Atende exatamente o exigido (`pt-BR` e BRL) sem biblioteca extra | sem impacto: nenhuma biblioteca é necessária |
| Estado global | React Context apenas para autenticação; estado local nas páginas | Redux, Zustand, Jotai, React Query | O escopo não justifica biblioteca de estado; dados são buscados por página | usar a biblioteca aprovada, se exigido |
| Testes de front-end | `vitest` + `@testing-library/react` + `jsdom` | Jest + Testing Library | Integração nativa com Vite; mesmo runner do projeto | testes manuais documentados, sem automação |
| Mock de API em desenvolvimento | módulo local claramente marcado, removido antes da integração | MSW | MSW é mais uma biblioteca a aprovar; um mock explícito e removível é suficiente | usar MSW, se aprovado |

### 3.1 Versões

As versões exatas só devem ser registradas **depois** da aprovação e da instalação, com a saída real de
`npm ls --depth=0` e do `package.json`. Registrar versões inventadas agora violaria a regra de não afirmar algo não verificado.

### 3.2 O que **não** será usado sem aprovação

- Nenhuma biblioteca de UI, ícones, formulários, datas, gráficos ou estado global.
- Nenhuma dependência de back-end.
- Nenhum serviço externo, telemetria ou fonte remota.

---

## 4. Pré-requisitos de ambiente na máquina de Rafael

Antes de qualquer scaffolding:

1. Instalar **Node.js LTS** (inclui `npm`). Verificar com `node --version` e `npm --version`.
2. Adicionar ao `PATH` do usuário:
   - `C:\Program Files\Git\cmd`
   - `C:\Program Files\GitHub CLI`
   Isso corrige o `gh repo view`/`gh issue list`, que hoje falham por não localizar o Git.
3. Reabrir o terminal do VS Code para recarregar o `PATH`.
4. Confirmar `git status`, `git branch --show-current` e `gh auth status` novamente após o ajuste.

Sem os itens 1 e 2, a Issue de estrutura inicial do front-end **não pode** ser executada nem verificada.

---

## 5. Estrutura de pastas proposta para `frontend/`

A estrutura respeita o enunciado e a orientação recebida: páginas em JSX dentro de `components/`,
mais `contexts/` e `services/`. Nenhuma pasta extra de topo em `src/` é necessária.

```text
frontend/
├── package.json
├── vite.config.js
├── index.html
├── .env.example                # VITE_API_URL, sem segredos
├── .gitignore                  # node_modules, dist, .env
└── src/
    ├── main.jsx                # ReactDOM.createRoot + BrowserRouter + AuthProvider
    ├── App.jsx                 # definição das rotas
    ├── index.css               # reset, tokens de cor, tipografia, layout base
    ├── App.css                 # layout do shell autenticado
    ├── components/
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── CadastroPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── LancamentosPage.jsx
    │   │   ├── CategoriasPage.jsx
    │   │   ├── FontesDestinosPage.jsx
    │   │   ├── RelatorioCategoriasPage.jsx
    │   │   ├── RelatorioFontesDestinosPage.jsx
    │   │   ├── FaturasPage.jsx
    │   │   └── NotFoundPage.jsx
    │   ├── layout/
    │   │   ├── AppLayout.jsx       # cabeçalho, navegação, área de conteúdo
    │   │   ├── MenuLateral.jsx
    │   │   └── RotaProtegida.jsx
    │   ├── ui/
    │   │   ├── Botao.jsx
    │   │   ├── CampoTexto.jsx
    │   │   ├── CampoSelecao.jsx
    │   │   ├── CampoMoeda.jsx
    │   │   ├── MensagemErro.jsx
    │   │   ├── MensagemSucesso.jsx
    │   │   ├── EstadoCarregando.jsx
    │   │   ├── EstadoVazio.jsx
    │   │   ├── ConfirmacaoDialogo.jsx
    │   │   └── Paginacao.jsx
    │   ├── auth/
    │   │   ├── FormularioLogin.jsx
    │   │   └── FormularioCadastro.jsx
    │   ├── categorias/
    │   │   ├── ListaCategorias.jsx
    │   │   └── FormularioCategoria.jsx
    │   ├── fontes/
    │   │   ├── ListaFontesDestinos.jsx
    │   │   └── FormularioFonteDestino.jsx
    │   ├── lancamentos/
    │   │   ├── ListaLancamentos.jsx
    │   │   ├── FormularioLancamento.jsx
    │   │   ├── FiltrosLancamentos.jsx
    │   │   ├── TotaisPeriodo.jsx
    │   │   └── DialogoExclusaoParcela.jsx
    │   ├── dashboard/
    │   │   ├── ResumoMensal.jsx
    │   │   └── UltimosLancamentos.jsx
    │   ├── relatorios/
    │   │   ├── SeletorPeriodo.jsx
    │   │   ├── TabelaCategorias.jsx
    │   │   ├── GraficoCategorias.jsx
    │   │   ├── TabelaFontesDestinos.jsx
    │   │   ├── GraficoFontesDestinos.jsx
    │   │   └── ComparacaoPeriodo.jsx
    │   └── faturas/
    │       ├── CartaoFatura.jsx
    │       ├── ListaFaturas.jsx
    │       └── ResumoLimite.jsx
    ├── contexts/
    │   └── AuthContext.jsx        # usuario, token, carregando, login, cadastrar, logout
    └── services/
        ├── api.js                 # cliente HTTP único, ApiError, tratamento de 401
        ├── authService.js
        ├── categoriasService.js
        ├── fontesDestinosService.js
        ├── lancamentosService.js
        ├── relatoriosService.js
        └── faturasService.js
```

Decisões de organização:

- **Páginas dentro de `components/pages/`**: atende ao enunciado sem criar uma quarta pasta de topo.
- **`ui/` para componentes sem regra de negócio**: evita duplicação de botões, campos, estados de carregamento e vazio.
- **Um serviço por recurso**: cada arquivo espelha um grupo de rotas da API e concentra a montagem de parâmetros.
- **Nenhuma regra de negócio no front-end**: agregações, percentuais, saldos, parcelamento e faturas vêm prontos do servidor.
- **`src/hooks/` não será criado** nesta fase. Se surgir necessidade real de hooks reutilizáveis, isso será proposto em Issue própria.

---

## 6. Mapa de rotas e páginas

| Rota | Página | Acesso | Dados principais |
|---|---|---|---|
| `/login` | LoginPage | público | `POST /api/auth/login` |
| `/cadastro` | CadastroPage | público | `POST /api/auth/cadastro` |
| `/` | redireciona para `/dashboard` | protegido | — |
| `/dashboard` | DashboardPage | protegido | resumo do mês (endpoint a definir com Igor) |
| `/lancamentos` | LancamentosPage | protegido | `GET/POST/PUT/DELETE /api/lancamentos` |
| `/categorias` | CategoriasPage | protegido | `GET/POST/PUT/DELETE /api/categorias` |
| `/fontes-destinos` | FontesDestinosPage | protegido | `GET/POST/PUT/DELETE /api/fontes-destinos` |
| `/relatorios/categorias` | RelatorioCategoriasPage | protegido | `GET /api/relatorios/categorias` |
| `/relatorios/fontes-destinos` | RelatorioFontesDestinosPage | protegido | `GET /api/relatorios/fontes-destinos` |
| `/faturas` | FaturasPage | protegido | `GET /api/relatorios/faturas?meses=3` |
| `*` | NotFoundPage | público | — |

Regras de navegação:

- Rota protegida sem token válido redireciona para `/login`, preservando a intenção de retorno quando fizer sentido.
- Login e cadastro, quando já autenticados, redirecionam para `/dashboard`.
- Após logout ou `401`, o usuário volta para `/login` com mensagem de sessão expirada.

---

## 7. Serviços e cliente HTTP

### 7.1 `services/api.js`

Responsabilidades únicas:

1. Ler a base da API de `import.meta.env.VITE_API_URL`.
2. Serializar JSON e definir `Content-Type` apenas quando houver corpo.
3. Injetar `Authorization: Bearer <token>` quando houver token e a rota não for pública.
4. Converter respostas de erro no formato do plano mestre — `{ erro, campos }` — em uma classe `ApiError` com `status`, `erro` e `campos`.
5. Em `401` fora das rotas de login/cadastro: limpar sessão e redirecionar para `/login`, sem laço de redirecionamento.
6. Em falha de rede: mensagem amigável única, sem expor detalhes técnicos.

Sem esta definição, cada página trataria erro de forma diferente — o que o plano proíbe.

### 7.2 Serviços por recurso

| Arquivo | Endpoints | Observações |
|---|---|---|
| `authService.js` | `POST /api/auth/cadastro`, `POST /api/auth/login`, `GET /api/auth/me` | não enviam token no cadastro/login |
| `categoriasService.js` | `GET/POST /api/categorias`, `PUT/DELETE /api/categorias/:id` | parâmetros definidos com Igor |
| `fontesDestinosService.js` | `GET/POST /api/fontes-destinos`, `PUT/DELETE /api/fontes-destinos/:id` | cartão exige fechamento, vencimento e limite |
| `lancamentosService.js` | listagem com filtros/paginação, criação, detalhe, edição, exclusão | exclusão de parcelado precisa de parâmetro explícito |
| `relatoriosService.js` | relatórios por categoria e por fonte/destino | somente dados agregados |
| `faturasService.js` | `GET /api/relatorios/faturas?meses=3` | previsão calculada no servidor |

---

## 8. AuthContext e fluxo de sessão

Estado exposto:

```text
{
  usuario,        // { id, nome, email } vindo do servidor
  token,          // JWT
  carregando,     // true durante a recuperação inicial da sessão
  autenticado,    // derivado de usuario + token
  login(email, senha),
  cadastrar(dados),
  logout()
}
```

Fluxo decidido:

1. `login` chama o serviço, guarda o token e o usuário e navega para `/dashboard`.
2. `cadastrar` envia os dados; em sucesso, faz login automático ou redireciona para o login — **a decidir com Rafael** (recomendação: entrar direto, com mensagem de boas-vindas).
3. Na carga inicial, se houver token persistido, o contexto chama `GET /api/auth/me` para validar a sessão antes de renderizar rotas protegidas. Não se confia em dados de usuário guardados no navegador.
4. `logout` limpa token e usuário e volta para `/login`.
5. Token persistido em `localStorage` com chave única e versionada, por exemplo `controle-financeiro.token`.
6. Enquanto `carregando` for verdadeiro, a aplicação exibe um estado de carregamento global em vez de piscar a tela de login.

---

## 9. Padrões transversais de interface

- **Estados obrigatórios**: carregando, vazio, erro e sucesso em toda tela que consome API.
- **Erros de campo**: `campos` do servidor mapeado para o campo correspondente; `erro` exibido como mensagem geral. O cadastro deve destacar e-mail e CPF duplicados no campo correto.
- **Moeda**: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Nenhum cálculo monetário no cliente.
- **Datas**: exibição em `dd/MM/aaaa`; entradas de data em formato ISO `aaaa-mm-dd` conforme a API. Conversão feita sem `new Date('aaaa-mm-dd')` para evitar deslocamento de fuso.
- **Formulários**: validação complementar no cliente (obrigatórios, formato de e-mail, senha mínima, confirmação de senha, valor positivo, campos do cartão), sem substituir a validação do servidor.
- **Confirmações**: exclusão sempre com confirmação; parcela de compra parcelada pergunta se exclui uma ou todas.
- **Acessibilidade**: `label` associado a cada campo, foco visível, navegação por teclado nos diálogos, mensagens de erro anunciáveis.
- **Responsividade**: layout de uma coluna no celular e barra lateral no desktop; tabelas com rolagem horizontal controlada.

---

## 10. Contrato da API — pontos que precisam ser alinhados com Igor

Nenhum endpoint será consumido antes de o formato estar documentado. Itens objetivos:

| # | Assunto | Proposta para discussão | Por que bloqueia o front-end |
|---:|---|---|---|
| 1 | Envelope de sucesso | listas retornarem `{ dados: [...], paginacao: {...} }` e detalhes retornarem o objeto direto | define como todas as páginas leem a resposta |
| 2 | Formato do dinheiro | retornar valor monetário como **string decimal** (`"1234.56"`) ou inteiro em centavos; nunca número binário ambíguo | define formatação, entrada e comparação de valores |
| 3 | Paginação | confirmar `pagina`, definir tamanho da página, `total` de itens e `totalPaginas` | sem isso não é possível montar o componente de paginação |
| 4 | Totais da listagem | a resposta de `GET /api/lancamentos` incluir `totais: { entradas, saidas, saldo }` | o plano exige totais do período; o front-end não deve somar páginas |
| 5 | Nomes de parâmetros | confirmar `inicio`, `fim`, `tipo`, `categoriaId`, `fonteDestinoId`, `pagina` | evita retrabalho em todos os filtros |
| 6 | Datas | `aaaa-mm-dd` sem horário em requisições e respostas | evita erros de fuso no filtro e na exibição |
| 7 | Login | resposta com `token` e `usuario: { id, nome, email }`; expiração definida | define o AuthContext e a mensagem de sessão expirada |
| 8 | Cadastro | corpo com `nome`, `email`, `cpf`, `senha`, `confirmacaoSenha`; `201` com usuário criado (sem hash) | define o formulário e o redirecionamento |
| 9 | `GET /api/auth/me` | retornar `{ id, nome, email }` | validação da sessão após recarregar a página |
| 10 | Erros | confirmar `{ erro, campos }`; chaves de `campos` iguais aos nomes enviados (`email`, `cpf`, `senha`) | permite exibir o erro no campo correto |
| 11 | Conflito de unicidade | `409` com `campos.email` ou `campos.cpf` | requisito explícito do cadastro |
| 12 | Recurso de outro usuário | sempre `404`, nunca `403` | o front-end precisa tratar como "não encontrado" |
| 13 | Relatório por categoria | formato com total de saídas, itens `{ categoria, total, percentual }`, total de entradas e comparação com período anterior | define tabela e gráfico |
| 14 | Relatório por fonte/destino | formato com entradas por fonte, saídas por destino e saldo por conta | define tabela e gráfico |
| 15 | Faturas | formato com cartões, faturas (atual + próximas), lançamentos/parcelas, total, limite utilizado e disponível | define toda a página de faturas |
| 16 | Exclusão de parcelado | definir como indicar "todas as parcelas" (query ou rota distinta) | define o diálogo de exclusão |
| 17 | **Dashboard** | **não existe endpoint no contrato mínimo**; decidir entre `GET /api/dashboard/resumo` ou reutilizar totais de `GET /api/lancamentos` | sem essa decisão o dashboard não pode ser especificado |
| 18 | CORS e porta | origem de desenvolvimento do Vite (por exemplo `http://localhost:5173`) e porta do back-end | sem CORS correto nenhuma chamada funciona |
| 19 | `VITE_API_URL` | valor de desenvolvimento acordado, por exemplo `http://localhost:3000/api` | configuração inicial do cliente HTTP |
| 20 | `meses` em faturas | confirmar padrão 3 e limite máximo | define o seletor de faturas |

### 10.1 Perguntas objetivas para Igor

1. O contrato será publicado em `docs/api-contract.md`? Quando?
2. Listas retornam array puro ou envelope com paginação?
3. Valores monetários saem como string, número ou centavos?
4. `GET /api/lancamentos` já devolve os totais do período?
5. Como o front-end pede a exclusão de todas as parcelas?
6. Qual endpoint alimenta o dashboard?
7. Qual porta e qual origem o CORS vai liberar em desenvolvimento?
8. O `409` de duplicidade identifica o campo em `campos`?

Enquanto essas respostas não existirem, o front-end pode apenas montar layout e componentes sem chamadas reais, com mock explicitamente marcado.

---

## 11. Critérios de aceite propostos para a Issue de estrutura inicial do front-end

- [ ] `frontend/` criado com Vite + React em JavaScript (JSX).
- [ ] `npm run dev` inicia sem erro e a página é acessível no navegador.
- [ ] Pastas `src/components`, `src/contexts` e `src/services` criadas.
- [ ] Layout base com cabeçalho, navegação e área de conteúdo.
- [ ] Rotas públicas, protegidas e `NotFound` definidas com React Router (somente após aprovação).
- [ ] Nenhuma chamada real à API; nenhum mock apresentado como integração.
- [ ] `.env.example` com `VITE_API_URL` e sem segredos.
- [ ] `node_modules/`, `dist/` e `.env` fora do Git.
- [ ] `npm run build` conclui sem erro.
- [ ] PR com evidências reais dos comandos executados.

Fora do escopo dessa Issue: login real, AuthContext completo, CRUDs, gráficos, faturas e qualquer alteração em `backend/`.

---

## 12. Riscos e bloqueios atuais

| Risco | Impacto | Mitigação |
|---|---|---|
| Node.js/npm ausentes | não é possível instalar Vite, rodar `dev` ou `build` | instalar Node LTS antes da Issue de estrutura |
| Git e `gh` fora do `PATH` | comandos do fluxo GitHub falham | ajustar `PATH` e reabrir o terminal |
| Repositório público sem `.gitignore` protegendo os documentos internos | risco de publicar `AGENTS.md` e `PLANO_MESTRE_PROJETO.md` em um `git add .` | corrigir pelo escopo da Issue #1, coordenando com Igor; nunca usar `git add .` |
| Issue #1 marcada como concluída sem alterações em `main` | risco de trabalho duplicado ou perdido | confirmar com Igor em qual branch o trabalho está antes de editar os mesmos arquivos |
| Bibliotecas não aprovadas | impede instalação e início real do front-end | enviar a seção 14 ao professor e registrar a resposta na Issue #2 |
| Contrato da API não publicado | impede integração e define formatos | alinhar os 20 pontos da seção 10 e aguardar a publicação |
| Endpoint de dashboard inexistente | dashboard não especificável | decidir com Igor antes da Issue de dashboard |

---

## 13. Texto pronto para envio ao professor

> Prezado professor,
>
> Somos Igor e Rafael, da turma de Programação Web Full Stack, e estamos desenvolvendo o Projeto 2 — aplicação de controle financeiro pessoal
> com front-end SPA em React (Vite), back-end em Node.js/Express, banco de dados com persistência real e autenticação JWT.
>
> Antes de instalar qualquer dependência, solicitamos a aprovação das tecnologias do front-end:
>
> 1. Ambiente: Node.js LTS (obrigatório para o Vite).
> 2. Framework: Vite + React em JavaScript (JSX).
> 3. Roteamento: `react-router-dom`.
> 4. Cliente HTTP: `fetch` nativo, sem biblioteca adicional.
> 5. Gráficos: `recharts` (alternativas que aceitamos: `chart.js` com `react-chartjs-2` ou outra de sua indicação).
> 6. Validação de formulários: recursos nativos do HTML5 e funções próprias, sem biblioteca.
> 7. Estilização: CSS puro e CSS Modules, sem framework de UI.
> 8. Formatação de moeda e datas: `Intl` nativo do JavaScript.
> 9. Estado global: apenas React Context para autenticação, sem biblioteca de estado.
> 10. Testes: `vitest` com `@testing-library/react` e `jsdom` (se permitido; caso contrário, faremos testes manuais documentados).
>
> Confirmamos que a validação de segurança, as regras de negócio, o isolamento de usuários, os relatórios e o cálculo de faturas
> serão implementados no back-end, conforme o enunciado.
>
> Solicitamos também a confirmação do banco de dados a ser utilizado, decisão que está sendo conduzida pelo Igor.
>
> Ficamos à disposição para ajustar qualquer escolha conforme sua orientação.
>
> Atenciosamente,
> Igor e Rafael

---

## 14. Próximos passos

1. Rafael revisa este documento e solicita ao professor a aprovação da seção 13.
2. Igor confirma em qual branch está o trabalho da Issue #1 e publica o contrato da API.
3. Registrar as respostas nas Issues #2 e de proposta do front-end e no `PLANO_MESTRE_PROJETO.md`.
4. Instalar Node.js LTS e corrigir o `PATH` de Git e GitHub CLI.
5. Após aprovação, criar a Issue de estrutura inicial do front-end e a branch correspondente.
6. Somente então executar o scaffolding do Vite e o layout base.
