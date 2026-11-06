# Resultados RNF — 05/11/2026

Ambiente: Intel Core i5-13420H, 12 CPUs lógicas, 7,96 GB RAM, Linux, MongoDB 8.3.9 em três processos locais com cache WiredTiger de 0,5 GB por nó, Node.js 20.20.2. A suíte funcional passou com **92 verificações** e os testes unitários com **9 casos**.

## Carga medida

Busca via API com 100 clientes, 100 req/s, página de 20 e três filtros (`ano ≥ 1980`, `pais = Brasil`, `vram_gb ≥ 8`). Cada base é isolada, criada por `database/seed-load.js`, com distribuição pública/privada; não contém fotos físicas e mede **somente consultas**. Cada rodada durou 10 s e fez 1.000 requisições, com 0 erros.

| Itens | p95 da API | Vazão | Situação da meta RNF01 |
|---:|---:|---:|---|
| 100 mil | 5,52 ms | 100 req/s | dentro da meta |
| 500 mil | 6,25 ms | 100 req/s | dentro da meta |
| 1 milhão | 33,42 ms na primeira rodada; 4,84 ms após aquecimento | 100 req/s | dentro da meta de 500 ms |

No `explain("executionStats")` da base de 1 milhão, a página com três filtros retornou 20 itens, examinou **83 chaves e 83 documentos** e usou o índice multikey `visibilidade_1_estado_1_atributos.chave_1_atributos.tipo_1_atributos.valor_1` (I2). O total exato da busca é reutilizado em memória por filtro e invalidado em mudanças de item ou coleção feitas por esta API. Uma aplicação com múltiplos processos exigiria invalidação distribuída; alterações diretas no banco também exigem reiniciar a API ou implantar essa invalidação. Essa limitação pertence a RNF06.

Em outra rodada, 500 clientes lógicos executaram 100 req/s durante 10 s na base funcional: **602 buscas, 298 detalhes e 100 edições**, 0 erros, p95 geral **4,96 ms**, p95 de detalhes **2,93 ms** e p95 de edição **5,84 ms**. A base funcional era pequena; esse resultado não mede detalhes com muitas interações nem uploads.

| RNF | Meta resumida | Situação | Resultado e evidência |
|---|---|---|---|
| 01 | Busca p95 ≤ 500 ms em 1 milhão, 100 clientes | atendido | 33,42 ms na primeira rodada com três filtros; índice I2, 83 documentos examinados para a página. |
| 02 | Detalhes p95 ≤ 300 ms com muitas interações | não medido | P95 de detalhes 2,93 ms em base pequena; faltam itens com muitas notas/comentários. |
| 03 | Escrita p95 ≤ 500 ms / upload ≤ 3 s | não medido | Edição sem upload: 5,84 ms; faltam percentis de upload de 1 e 5 imagens. |
| 04 | Escala em 100 mil, 500 mil, 1 milhão | não medido | Curva de busca acima; RNF02–03 não foram repetidos nas três bases. |
| 05 | 500 clientes, 100 req/s, erro < 1% | atendido | 1.000 requisições mistas em 10 s, 0% erro, p95 4,96 ms na base funcional pequena. |
| 06 | Revisão de consultas e sharding | não medido | I2 foi útil; lista de IDs públicos e cache local de totais limitam expansão. Não houve sharding real. |
| 07 | Atributos sem migração/parada | atendido | Teste criou atributo novo e confirmou outro item inalterado. |
| 08 | Disponibilidade ≥ 99,5% em 30 dias | não medido | Monitor fornecido; período de 30 dias não decorrido. |
| 09 | Escrita retoma em ≤ 30 s | atendido | [Failover](replica-failover.md): 16,542 s e 16,521 s; marcadores preservados. |
| 10 | Sem exposição após tornar privado | atendido | Busca e detalhe após alteração retornaram sem conteúdo; ensaio de failover retornou 404 para terceiro. |
| 11 | Backup RPO ≤ 24 h, RTO ≤ 4 h | não medido | Scripts entregues; `mongodump`/`mongorestore` não estão instalados nesta máquina. |
| 12 | bcrypt ≥ 10, JWT ≤ 1 h, bloqueio | atendido | Código usa bcrypt custo 12 e JWT 1 h; teste verificou bloqueio após cinco falhas. |
| 13 | TLS 1.2+ e HTTP bloqueado | não medido | Ambiente local sem proxy TLS. |
| 14 | Autorização de escrita | atendido | Terceiro recebeu 403 em edição/exclusão de coleção, item e imagem; `usuario_id` no corpo não alterou propriedade. |
| 15 | Injeção e HTML | atendido | `$where` e `regex` recusados; comentário com `<script>` permanece texto e React o renderiza como texto. |
| 16 | Quatro combinações de visibilidade | atendido | Teste criou pública/pública, pública/privada, privada/pública e privada/privada; terceiro recebeu 404 nas três privadas em detalhe, média e arquivo. |
| 17 | Interações somente públicas | atendido | Terceiro não avaliou nem comentou item privado; dono não avaliou item próprio e pôde comentá-lo quando público. |
| 18 | 1–5 imagens válidas | atendido | 0, 1, 5, sexta, última removida, JPEG/PNG/WebP, >5 MiB, >6000 px e corrupção verificados; conteúdo WebP com nome PNG foi identificado pelo conteúdo. |
| 19 | Arquivo privado e sem cache | atendido | Rota privada retornou 404 ao terceiro, caminho estático retornou 404; arquivo autorizado enviou `private, no-store`. |
| 20 | Persistência e limpeza | não medido | Substituição, cascata e corrida entre adição de foto/exclusão passaram sem metadados órfãos; faltam reinício e falha forçada de disco. |
| 21 | Limites de campos/páginas | atendido | 51 atributos, rótulo >50, descrição >500, comentário >1000, item >64 KB e página 51 recusados. |
| 22 | Viewport 360 px e quatro navegadores | não medido | CSS responsivo implementado; inspeção visual em Chrome, Firefox, Edge e Safari pendente. |

Dados numéricos registrados em [load-evidence.json](load-evidence.json) e [explain-evidence.json](explain-evidence.json). As linhas `não medido` não constituem aprovação da meta. Os scripts para continuar os ensaios estão em `tests/`; `mongodump` e `mongorestore` são dependências externas do teste de backup.
