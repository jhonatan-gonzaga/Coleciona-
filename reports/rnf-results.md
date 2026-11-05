# Resultados RNF — 05/11/2026

Ambiente: Intel Core i5-13420H, 12 CPUs lógicas, 7,96 GB RAM, Linux, MongoDB 8.3.9 local com três processos, Node.js 20.20.2. `tests/functional/run.mjs` passou com **62 verificações**; `tests/rnf/load.mjs` executou **1.000 requisições** em 10 s, 100 clientes e limite de 100 req/s: **p95 11,46 ms, 0 erros, CPU média 12,62%**. A base era pequena, portanto esse número não é resultado da meta de 1 milhão de itens. `explain("executionStats")` examinou 2 chaves e 2 documentos, retornou 2, com índice `visibilidade_1_estado_1_atributos.chave_1_atributos.tipo_1_atributos.valor_1`; havia 3 coleções públicas.

| RNF | Meta resumida | Situação | Resultado e evidência |
|---|---|---|---|
| 01 | Busca p95 ≤ 500 ms em 1 milhão, 100 clientes | não medido | Ensaio pequeno: 11,46 ms; índice usado, 2 documentos examinados. Falta base de 1 milhão. |
| 02 | Detalhes p95 ≤ 300 ms | não medido | Rotas funcionais verificadas; não houve carga mista de detalhes. |
| 03 | Escrita p95 ≤ 500 ms / upload ≤ 3 s | não medido | Gravação funcional passou; faltam percentis por cenário. |
| 04 | Escala em 100 mil, 500 mil, 1 milhão | não medido | `database/seed-load.js` prepara bases; carga completa não executada. |
| 05 | 500 clientes, 100 req/s, erro < 1% | não medido | Ensaio parcial com 100 clientes, 100 req/s, 0% erro. |
| 06 | Revisão de consultas e sharding | não medido | I2 usado; lista de IDs públicos no filtro pode crescer. Não houve sharding real. |
| 07 | Atributos sem migração/parada | atendido | Teste criou atributo novo e confirmou outro item inalterado. |
| 08 | Disponibilidade ≥ 99,5% em 30 dias | não medido | Monitor fornecido; período de 30 dias não decorrido. |
| 09 | Escrita retoma em ≤ 30 s | atendido | [Failover](replica-failover.md): 16,542 s; marcador preservado. |
| 10 | Sem exposição após tornar privado | atendido | Busca e detalhe após alteração retornaram sem conteúdo; ensaio de failover retornou 404 para terceiro. |
| 11 | Backup RPO ≤ 24 h, RTO ≤ 4 h | não medido | Scripts entregues; `mongodump`/`mongorestore` não estão instalados nesta máquina. |
| 12 | bcrypt ≥ 10, JWT ≤ 1 h, bloqueio | atendido | Código usa bcrypt custo 12 e JWT 1 h; teste verificou bloqueio após cinco falhas. Inspeção BSON ainda manual. |
| 13 | TLS 1.2+ e HTTP bloqueado | não medido | Ambiente local sem proxy TLS. |
| 14 | Autorização de escrita | atendido | Edição de item por terceiro retornou 403; corpo com `usuario_id` não alterou proprietário. |
| 15 | Injeção e HTML | atendido | `$where` e operador `regex` recusados; comentário com `<script>` permanece texto, React renderiza como texto. |
| 16 | Quatro combinações de visibilidade | atendido | Teste criou pública/pública, pública/privada, privada/pública e privada/privada; terceiro recebeu 404 nas três privadas. |
| 17 | Interações somente públicas | atendido | Dono impedido de avaliar; terceiros impedidos em itens privados; dono comentou item próprio público. |
| 18 | 1–5 imagens válidas | não medido | 0, 1, 5, sexta e remoção da última verificados; formatos, dimensões e corrupção ainda não cobertos integralmente. |
| 19 | Arquivo privado e sem cache | atendido | Rota privada retornou 404 ao terceiro; arquivo autorizado enviou `Cache-Control: private, no-store`. |
| 20 | Persistência e limpeza | não medido | Cascata funcional passou; faltam reinício e falha de disco. |
| 21 | Limites de campos/páginas | não medido | Comentário >1000 e página 51 recusados; faltam os demais limites. |
| 22 | Viewport 360 px e quatro navegadores | não medido | CSS responsivo implementado; inspeção visual em browsers pendente. |

As linhas `não medido` não constituem aprovação da meta. Os scripts necessários para continuar os ensaios estão em `tests/`; `mongodump` e `mongorestore` são dependências externas do teste de backup.
