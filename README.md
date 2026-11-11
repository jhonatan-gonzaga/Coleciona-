# Coleciona+

Aplicação web para organizar coleções e itens, guardar fotos e atributos personalizados, explorar acervos públicos e interagir por avaliações e comentários. Este repositório reúne a implementação da atividade AVIII, o banco local, os testes e os relatórios dos ensaios.

## Visão geral

| Parte | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Frontend | React 18 e Vite 5 | Telas de acesso, exploração, gestão e interações. |
| Backend | Node.js 20+ e Express 4 | API REST, autenticação, autorização, validação e regras de negócio. |
| Database | MongoDB 8 | Documentos, validação, índices e replica set local de três nós. |
| Storage | Sistema de arquivos | Fotos dos itens; seus metadados ficam no MongoDB. |
| Tests e reports | Node.js, `mongosh`, Markdown e JSON | Testes e evidências dos resultados. |

O navegador chama a API em `/api/v1`. O backend consulta as coleções MongoDB e lê ou grava as fotos em `storage/uploads/`. Durante o desenvolvimento, o Vite encaminha as chamadas da interface à API.

## Estrutura do repositório

```text
AVIII/
├── backend/                  API e regras de negócio
│   └── src/
│       ├── components/       Serviços, validações e repositórios
│       ├── jobs/             Retomada de exclusões e limpeza
│       ├── middleware/       Autenticação e erros
│       └── routes/           Rotas HTTP
├── database/                 MongoDB, índices, seeds e backup
├── frontend/                 Interface React e Vite
│   └── src/
│       ├── api/              Cliente HTTP e chamadas por domínio
│       ├── components/       Componentes reutilizáveis
│       ├── mocks/            Respostas de exemplo
│       └── screens/          Telas
├── reports/                  Resultados e evidências
├── storage/                  Arquivos gerados localmente
│   └── uploads/              Fotos dos itens
└── tests/
    ├── fixtures/             Imagens de teste
    ├── functional/           Fluxos completos pela API
    ├── replica/              Failover
    └── rnf/                  Carga, consultas e disponibilidade
```

`backend/`, `frontend/` e `database/` têm seus próprios `package.json`, `package-lock.json` e README. Os comandos npm devem ser executados dentro da pasta correspondente.

## Como executar localmente

**Pré-requisitos:** Node.js 20+, npm, `mongod` e `mongosh` do MongoDB 8. Para backup e restauração, instale também `mongodump` e `mongorestore` (MongoDB Database Tools).

Os três arquivos `database/mongo*.conf` contêm caminhos absolutos da máquina em que foram criados. Se mover o projeto, ajuste `dbPath`, log e `pidFilePath` antes de iniciar o banco. Os nós escutam em `127.0.0.1`, nas portas 27017, 27018 e 27019.

Na raiz do projeto, execute em ordem:

```bash
./database/start-replica.sh
./database/setup.sh
cd database && npm install && npm run seed
```

`setup.sh` cria ou atualiza validações e índices. A seed local adiciona contas, coleções, itens, imagens e interações demonstrativas; pode ser repetida sem duplicar seus registros identificados por `seed_tag`.

Volte à raiz e configure a API:

```bash
cp backend/.env.example backend/.env
# Edite backend/.env e troque JWT_SECRET por um valor aleatório de pelo menos 32 caracteres.
cd backend && npm install && npm start
```

Em outro terminal, a partir da raiz:

```bash
cd frontend && npm install && npm run dev
```

Abra `http://127.0.0.1:3000`. A API responde em `http://127.0.0.1:4000/api/v1`. `GET /api/v1/health/live` verifica o processo; `GET /api/v1/health/ready` verifica o acesso ao primário do MongoDB. `./database/status.sh` mostra o estado de cada nó.

`backend/.env.example` define URI, banco, segredo JWT, pasta de fotos e porta. `frontend/.env.example` define `VITE_API_URL`; sem ela, a interface usa `/api/v1` pelo proxy do Vite. O banco principal é `coleciona`. Para consultar a base isolada de carga, configure `MONGODB_DB=coleciona_carga` na API antes de iniciá-la.

## `backend/`: API e regras de negócio

`src/server.js` carrega o ambiente, conecta ao MongoDB, inicia a limpeza e abre o servidor. `src/app.js` configura Express, JSON, CORS, autenticação opcional, rotas e tratamento de erros. As respostas de sucesso usam `{data}` e, nas listagens, `{meta}`; falhas usam `{error}`.

| Caminho | O que foi feito |
| --- | --- |
| `src/routes/authRoutes.js` | Cadastro, login e consulta da conta autenticada. |
| `src/routes/catalogRoutes.js` | CRUD de coleções e itens, sugestões de etiquetas, inclusão e ordenação de fotos. |
| `src/routes/searchRoutes.js` | Exploração de coleções públicas, filtros disponíveis e busca de itens. |
| `src/routes/imageRoutes.js` | Substituição, exclusão e entrega autorizada de arquivos. |
| `src/routes/interactionRoutes.js` | Notas, médias, comentários e histórico de interações. |
| `src/routes/healthRoutes.js` | Verificações `live` e `ready`. |
| `src/components/*Service.js` | Regras de acesso, autenticação, catálogo, imagens, busca e interações. |
| `src/components/validation.js` | Limites de campos, paginação, visibilidade e atributos tipados. |
| `src/components/Repositories/` | Consultas e transações MongoDB, IDs e serialização. |
| `src/middleware/` | JWT Bearer, proteção de rotas e erros HTTP. |
| `src/jobs/cleanupImages.js` | Limpeza periódica de arquivos e exclusões pendentes. |

O login usa bcrypt com custo 12 e JWT válido por uma hora. Cinco falhas de senha dentro de 15 minutos bloqueiam novas tentativas por 15 minutos. Só o dono pode editar seus recursos. Para um item aparecer publicamente, **a coleção e o item** devem estar públicos e ativos. Avaliações exigem item público e não podem ser feitas pelo dono; o dono pode comentar seu item público. Imagens privadas são entregues apenas pela rota autorizada, com `Cache-Control: private, no-store`.

Os itens aceitam etiquetas, favorito e até 50 atributos dos tipos `texto`, `numero`, `data`, `booleano` e `opcao`. O tipo `opcao` aceita de 1 a 20 valores. Busca e filtros respeitam os escopos `global` e `minhas`. A paginação aceita até 50 registros por página. A busca guarda em memória o total por filtro e o invalida nas mutações feitas pela API; várias instâncias exigiriam invalidação distribuída.

Principais recursos, todos sob `/api/v1`:

| Caminho | Operações |
| --- | --- |
| `/auth/cadastro`, `/auth/login`, `/auth/me` | Criar conta, entrar e consultar sessão. |
| `/explorar/colecoes` | Listar coleções públicas por nome e filtros dos itens. |
| `/colecoes`, `/colecoes/minhas`, `/colecoes/:id` | Criar, listar as próprias, alterar e excluir coleções. |
| `/colecoes/:id/itens`, `/itens/:id` | Criar, listar, consultar, alterar e excluir itens. |
| `/itens/busca`, `/itens/filtros`, `/etiquetas/minhas` | Buscar, descobrir filtros e sugerir etiquetas. |
| `/imagens/:id`, `/imagens/:id/arquivo`, `/itens/:id/imagens` | Gerenciar e consultar fotos. |
| `/itens/:id/avaliacao/minha`, `/itens/:id/avaliacoes/resumo` | Registrar nota e consultar média. |
| `/itens/:id/comentarios`, `/comentarios/:id`, `/interacoes/minhas` | Gerenciar comentários e listar interações. |

Na criação de um item, envie `multipart/form-data`: `dados` contém o JSON do item e `imagens` contém de 1 a 5 arquivos. Veja [backend/README.md](backend/README.md) para os formatos de busca e outros detalhes da API.

## `database/`: MongoDB, índices e dados

`start-replica.sh`, `start-node.sh`, `stop-node.sh` e `status.sh` controlam o conjunto local `rsColeciona`. `init-replica.js` inicia o replica set; `setup.sh` executa `create-collections.js` e `create-indexes.js`. Dados, logs e PIDs gerados ficam em `database/data/`, `database/logs/` e `database/run/` e não são versionados.

`create-collections.js` aplica validadores JSON Schema às seis coleções: `usuarios`, `colecoes`, `itens`, `imagens`, `avaliacoes` e `comentarios`. `create-indexes.js` cria índices para e-mail único, dono/estado, visibilidade, atributos de busca, ordem das fotos, comentários e avaliação única por usuário e item. Operações que precisam preservar vínculos entre documentos usam transações; a exclusão de itens e coleções remove documentos dependentes e arquivos associados.

| Script | Finalidade |
| --- | --- |
| `seed.js` / `npm run seed` | Duas contas, três coleções, quatro itens e nove imagens de demonstração. |
| `seed-online.js` / `npm run seed:online` | Acervo maior com fotos da internet e créditos: 12 coleções e 120 itens. |
| `seed-load.js` / `npm run seed:load -- 100000` | Base separada para consultas; aceita 100000, 500000 ou 1000000 itens. |
| `backup.sh [destino]` | `mongodump` e pacote de `storage/uploads/` com SHA-256. |
| `restore.sh BACKUP URI_SEPARADA STORAGE_SEPARADO` | Verifica checksum e restaura banco e fotos em destinos separados. |

**Atenção ao `seed:online`:** sua etapa `apply` substitui coleções, itens, imagens, avaliações e comentários da base `coleciona`. É possível preparar e conferir os arquivos com `node seed-online.js prepare` e depois executar `node seed-online.js apply`. A carga de `seed-load.js` usa `coleciona_carga` por padrão, não contém fotos físicas e serve aos testes de consulta. Veja [database/README.md](database/README.md) para contas de demonstração, senha padrão e parâmetros.

## `frontend/`: interface web

`src/main.jsx` monta a aplicação. `src/WebApp.jsx` controla sessão, menu e navegação. O token de login fica em `localStorage` e `src/api/http.js` o envia como Bearer. `src/api/imageApi.js` obtém imagens privadas com autorização.

| Caminho | Responsabilidade |
| --- | --- |
| `src/screens/AccessScreen.jsx` | Cadastro e login. |
| `src/screens/ExploreScreen.jsx` | Coleções públicas, busca, filtros e itens de uma coleção. |
| `src/screens/CollectionDashboard.jsx` | Acervo próprio, inclusive privado, e gestão de itens. |
| `src/screens/ItemEditor.jsx` | Formulário de itens, atributos, etiquetas e fotos. |
| `src/screens/ItemDetails.jsx` | Detalhes, galeria, médias, avaliações e comentários. |
| `src/screens/MyInteractionsScreen.jsx` | Avaliações e comentários da conta. |
| `src/components/` | Formulários, galeria, estrelas, filtros, atributos, etiquetas e prévias. |
| `src/api/` | Chamadas por autenticação, catálogo, busca, imagens e interações. |
| `src/mocks/responses.js` | Respostas de exemplo para desenvolvimento. |
| `src/style.css` | Estilos e ajustes responsivos. |
| `vite.config.js` | Servidor na porta 3000 e proxy para a API na porta 4000. |

A interface permite configurar visibilidade por coleção e item, vários valores para atributos do tipo Opções, sugestões de etiquetas e atributos, ordenação de fotos e edição de avaliações e comentários. A primeira foto aparece como capa. `npm run build` gera a versão estática em `frontend/dist/`. Veja [frontend/README.md](frontend/README.md) para instruções de uso.

## `storage/`: imagens

`storage/uploads/` recebe as fotos dos itens. `storage/online-seed/` guarda downloads temporários da seed online, e `storage/online-image-credits.json` registra os créditos dessas fotos. Esses arquivos gerados são ignorados pelo Git. A coleção `imagens` no MongoDB guarda caminho, ordem, tipo MIME, tamanho e vínculos; os bytes ficam no disco.

O backend aceita JPEG, PNG e WebP de até 5 MiB e 6000 × 6000 pixels, verificando o conteúdo com `sharp`. Cada item ativo mantém de 1 a 5 fotos. Trocas e exclusões incluem limpeza de arquivos, com retomada de pendências pelo job do backend. Para recuperar um acervo completo, são necessários **o backup do MongoDB e o de `storage/uploads/`**.

## `tests/`: verificação

| Caminho | O que verifica | Execução |
| --- | --- | --- |
| `backend/src/components/*.test.js` | Validação, busca e regras de acesso. | `cd backend && npm test` |
| `tests/functional/run.mjs` | Contas, visibilidade, busca, interações, galeria, limites e exclusão em cascata pela API. | `node tests/functional/run.mjs` |
| `tests/fixtures/` | PNG, JPEG e WebP válidos e uma PNG larga demais para testar rejeição. | Usadas pelo teste funcional. |
| `tests/rnf/load.mjs` | p95, vazão, erros e recursos em carga configurável. | `CLIENTS=100 RPS=100 SECONDS=30 node tests/rnf/load.mjs` |
| `tests/rnf/run-mixed.mjs` | Mistura busca, detalhe e escrita com clientes lógicos. | `CLIENTS=500 RPS=100 SECONDS=30 node tests/rnf/run-mixed.mjs` |
| `tests/rnf/explain.js` | Plano e estatísticas de execução das consultas. | `mongosh '<URI>' tests/rnf/explain.js` |
| `tests/rnf/monitor-ready.mjs` | Amostragem de prontidão para ensaio prolongado. | `MINUTES=43200 READY_LOG=ready.jsonl node tests/rnf/monitor-ready.mjs` |
| `tests/replica/failover.mjs` | Eleição, retomada da escrita e preservação dos dados. | `node tests/replica/failover.mjs` |

Os testes externos precisam da API e do replica set ativos. O ensaio de failover **interrompe e reinicia nós locais** e deve rodar no ambiente de desenvolvimento. `API_URL`, `ITEM_ID`, `TOKEN`, `FILTERS_JSON`, `SEED_EMAIL` e `SEED_PASSWORD` ajustam cenários. Instruções completas estão em [tests/README.md](tests/README.md).

## `reports/`: resultados e limites

`reports/rnf-results.md` reúne o ambiente, a tabela das metas não funcionais e as medições de carga. Os dados de carga e planos de consulta ficam em `load-evidence.json` e `explain-evidence.json`. `reports/replica-failover.md` descreve a falha do primário, com dados em `replica-evidence.json`.

Nos ensaios registrados em novembro de 2026, a suíte funcional passou com **92 verificações** e os testes unitários com **9 casos**. Na base isolada de 1 milhão de itens, a busca com três filtros e 100 requisições por segundo teve p95 de **33,42 ms** na primeira rodada registrada, sem erros. No ensaio final de failover, a primeira escrita da API voltou em **16,521 s** após a parada do primário. Esses valores descrevem somente o ambiente e os cenários dos relatórios.

As metas de disponibilidade por 30 dias, TLS, backup com RPO/RTO, inspeção visual em quatro navegadores, upload sob carga e persistência após falha de disco **não foram comprovadas** pelos ensaios registrados. Consulte [reports/rnf-results.md](reports/rnf-results.md) e [reports/replica-failover.md](reports/replica-failover.md) antes de usar os números como evidência de uma meta específica.

O capítulo [Implementação e PoC](5.%20IMPLEMENTA%C3%87%C3%83O%20E%20PROVA%20DE%20CONCEITO%20%28PoC%29/IMPLEMENTACAO_POC.md) relaciona os scripts e as consultas C1–C5 ao projeto de banco de dados; há um [tutorial separado](5.%20IMPLEMENTA%C3%87%C3%83O%20E%20PROVA%20DE%20CONCEITO%20%28PoC%29/TUTORIAL_POC.md) para reproduzir a demonstração.
