# 5. IMPLEMENTAÇÃO E PROVA DE CONCEITO (PoC)

A prova de conceito do Coleciona+ foi desenvolvida para verificar a viabilidade da modelagem documental, das consultas orientadas aos requisitos funcionais e da recuperação de escritas após a falha de um nó do banco de dados. A implementação utiliza MongoDB 8, uma API em Node.js e uma interface web em React. Os dados de catálogo e interação são armazenados no MongoDB; os arquivos de imagem permanecem em diretório privado, com referências e metadados registrados na coleção física `imagens`.

As consultas C1–C5 retomam a modelagem apresentada na [seção 7.7 da proposta do Coleciona+](../../AVII/coleciona_proposta_projeto.md), correspondente ao conteúdo previsto para a seção 4.2 do modelo de projeto final. Este capítulo apresenta os scripts efetivamente utilizados, as decisões de distribuição e os resultados observados. O ambiente de execução possui **replicação local**, mas **não possui fragmentação por sharding**. Por essa razão, a configuração de sharding descrita na seção 5.3 constitui uma estratégia de expansão a ser validada, e não um resultado experimental da PoC.

## 5.1. Scripts de inicialização

### 5.1.1. Inicialização do conjunto de réplicas

O banco de dados foi configurado como um replica set denominado `rsColeciona`, composto por três processos `mongod` nas portas 27017, 27018 e 27019. Cada membro possui diretório de dados, arquivo de log e PID próprios. Os arquivos `database/mongo1.conf`, `database/mongo2.conf` e `database/mongo3.conf` definem `replSetName: rsColeciona`, escuta em `127.0.0.1` e limite de 0,5 GB para o cache WiredTiger de cada processo. Essa topologia permite demonstrar eleição de primário e transações de múltiplos documentos; por utilizar uma única máquina, não oferece tolerância à falha do hospedeiro.

A [Listagem 1](../database/start-replica.sh) reproduz o núcleo do script de inicialização. O arquivo `init-replica.js` verifica se o conjunto já existe, chama `rs.initiate(...)` apenas na primeira execução e aguarda a eleição de um primário.

**Listagem 1 — Inicialização dos nós e do replica set (`database/start-replica.sh`).**

```bash
for port in 27017 27018 27019; do "$dir/start-node.sh" "$port"; done
mongosh --quiet --host 127.0.0.1 --port 27017 "$dir/init-replica.js"
```

A URI utilizada pela API é `mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona`. A conexão e as sessões transacionais são centralizadas em [mongoClient.js](../backend/src/components/Repositories/mongoClient.js). A prontidão da aplicação é verificada por `/api/v1/health/ready`, que executa `ping` e confirma a disponibilidade de um primário.

### 5.1.2. Criação das coleções e dos índices

O script [setup.sh](../database/setup.sh) executa [create-collections.js](../database/create-collections.js) e [create-indexes.js](../database/create-indexes.js) por meio do `mongosh`. A criação é repetível: uma coleção inexistente é criada com seu validador `$jsonSchema`; se já existir, o validador é atualizado com `collMod`, sem eliminar seus documentos.

**Listagem 2 — Aplicação dos validadores (`database/create-collections.js`).**

```javascript
for (const [name,schema] of Object.entries(specs)) {
  const validator={$jsonSchema:{bsonType:'object',...schema}};
  if (!dbi.getCollectionNames().includes(name)) dbi.createCollection(name,{validator});
  else dbi.runCommand({collMod:name,validator});
  print(`Validado: ${name}`);
}
```

Foram definidas seis coleções físicas: `usuarios`, `colecoes`, `itens`, `imagens`, `avaliacoes` e `comentarios`. Coleções pessoais são documentos de `colecoes`, e não coleções físicas independentes do MongoDB. As relações entre documentos usam identificadores BSON `ObjectId`: `colecao_id` associa o item à coleção pessoal; `item_id` associa imagens, avaliações e comentários ao item; `usuario_id` registra a propriedade ou autoria. Os campos `visibilidade` e `estado` controlam, respectivamente, exposição pública e ciclo de vida dos registros.

O documento de item incorpora um array de até 50 atributos `{chave, rotulo, tipo, valor}`. Os tipos admitidos são `texto`, `numero`, `data`, `booleano` e `opcao`. A validação do valor segundo o tipo, a normalização das chaves e os limites das requisições são complementados em [validation.js](../backend/src/components/validation.js). As regras que dependem de várias coleções, como manter de uma a cinco imagens para cada item ativo, são verificadas pelo backend; elas não decorrem isoladamente do validador de `itens`.

Os índices da [Listagem 3](../database/create-indexes.js) correspondem à estratégia de indexação da proposta. O índice multikey de `itens.atributos` apoia filtros por chave, tipo e valor; os índices de `colecao_id` apoiam a identificação dos dependentes de uma coleção; os índices únicos impedem duplicação de e-mail e de avaliação por usuário e item.

**Listagem 3 — Índices associados às consultas C1–C5 (`database/create-indexes.js`).**

```javascript
d.colecoes.createIndex({visibilidade:1,estado:1,_id:1});
d.itens.createIndex({visibilidade:1,estado:1,'atributos.chave':1,'atributos.tipo':1,'atributos.valor':1});
d.colecoes.createIndex({usuario_id:1,estado:1});
d.itens.createIndex({usuario_id:1,estado:1,criado_em:-1});
d.avaliacoes.createIndex({item_id:1,usuario_id:1},{unique:true});
d.comentarios.createIndex({item_id:1,criado_em:-1});
for(const name of ['itens','avaliacoes','comentarios','imagens']) d[name].createIndex({colecao_id:1});
d.imagens.createIndex({item_id:1,estado:1,ordem:1});
d.usuarios.createIndex({email:1},{unique:true});
```

O script completo também cria índices para etiquetas e para a ordenação da busca pública. A existência de um índice não garante sua seleção pelo otimizador; a escolha efetiva foi examinada com `explain('executionStats')`, conforme discutido na seção 5.2.

### 5.1.3. Carga inicial de dados

O comando `npm run seed`, definido em `database/package.json`, executa [seed.js](../database/seed.js). A carga demonstrativa gera dois usuários, três coleções pessoais, quatro itens, nove imagens PNG válidas, uma avaliação e um comentário. O script utiliza `bcrypt` com custo 12 para as senhas, `sharp` para gerar as imagens e `seed_tag` para identificar os registros de demonstração. A [Listagem 4](../database/seed.js) apresenta a inserção condicional de uma coleção pessoal.

**Listagem 4 — Inserção repetível de dados demonstrativos (`database/seed.js`).**

```javascript
const seed_tag=`demo:${name}`;
await d.collection('colecoes').updateOne(
  {seed_tag},
  {$setOnInsert:{usuario_id:owner._id,nome:name,descricao:'Coleção demonstrativa',visibilidade:visibility,estado:'ativa',criado_em:now,atualizado_em:now}},
  {upsert:true}
);
```

Cada arquivo criado pela seed é gravado em `storage/uploads/`; o documento correspondente em `imagens` armazena caminho relativo, tipo MIME, tamanho, ordem e identificadores do item, da coleção e do proprietário. A carga pode ser repetida sem duplicar os documentos identificados por `seed_tag`. Como sistema de arquivos e MongoDB não participam de uma transação única, essa propriedade de repetição não deve ser interpretada como atomicidade conjunta da seed.

Para avaliar consultas em volumes maiores, [seed-load.js](../database/seed-load.js) gera 100 mil, 500 mil ou 1 milhão de itens na base separada `coleciona_carga`. Os registros incluem atributos e combinações de visibilidade, mas **não possuem imagens físicas**. A carga de desempenho, portanto, verifica consultas sobre documentos e não mede persistência nem transferência de fotografias. O script [seed-online.js](../database/seed-online.js) oferece um acervo demonstrativo com fotografias e créditos, mas sua etapa de aplicação substitui dados da base funcional; ela não foi necessária para a medição de C1.

## 5.2. Operações CRUD e consultas complexas

O acesso aos dados é organizado em rotas HTTP, serviços de domínio e repositórios MongoDB. Os serviços recebem o identificador da conta autenticada, verificam propriedade e visibilidade e, então, acionam os repositórios. A API não aceita `usuario_id` fornecido pelo cliente como prova de propriedade. A criação de item recebe `multipart/form-data`, com os dados em JSON e de uma a cinco imagens; as demais alterações de catálogo usam JSON. As operações principais encontram-se em [catalogRoutes.js](../backend/src/routes/catalogRoutes.js), [imageRoutes.js](../backend/src/routes/imageRoutes.js), [interactionRoutes.js](../backend/src/routes/interactionRoutes.js) e [searchRoutes.js](../backend/src/routes/searchRoutes.js).

| Recurso | Criação | Leitura | Atualização | Exclusão |
| --- | --- | --- | --- | --- |
| Coleção pessoal | `POST /colecoes` | `GET /colecoes/minhas` | `PATCH /colecoes/:id` | `DELETE /colecoes/:id` |
| Item | `POST /colecoes/:id/itens` | `GET /itens/:id` | `PATCH /itens/:id` | `DELETE /itens/:id` |
| Imagem | `POST /itens/:id/imagens` | `GET /imagens/:id/arquivo` | `PUT /imagens/:id` e alteração da ordem | `DELETE /imagens/:id` |
| Avaliação | `PUT /itens/:id/avaliacao/minha` | `GET /itens/:id/avaliacoes/resumo` | Novo `PUT` | `DELETE /itens/:id/avaliacao/minha` |
| Comentário | `POST /itens/:id/comentarios` | `GET /itens/:id/comentarios` | `PATCH /comentarios/:id` | `DELETE /comentarios/:id` |

*Nota:* os caminhos da tabela são relativos ao prefixo `/api/v1`. As consultas C1–C5 abaixo foram extraídas do código executável e do script de verificação [consultas-poc.js](consultas-poc.js). Os trechos foram formatados para apresentação; a autorização de acesso ocorre na API e não é substituída por consultas diretas no `mongosh`.

### 5.2.1. C1 — Busca global por atributos personalizados

A consulta C1 responde à busca por itens que atendem simultaneamente a atributos de naturezas distintas. Em [SearchService.js](../backend/src/components/SearchService.js), a API identifica as coleções ativas e públicas, exige que os itens também sejam ativos e públicos e constrói um `$elemMatch` para cada filtro recebido. Os filtros são reunidos em `$and`: cada condição exige `chave`, `tipo` e `valor` no mesmo subdocumento do array `atributos`, enquanto o conjunto exige que o item satisfaça todos os atributos solicitados.

A [Listagem 5](consultas-poc.js) reproduz a consulta com `pais = Brasil` e `ano ≥ 1980`, usando dados da seed. O repositório da API acrescenta `sort({criado_em:-1})`, `skip`, `limit` e `countDocuments` para compor a página e seu total.

**Listagem 5 — Consulta C1 no MongoDB (`consultas-poc.js`).**

```javascript
const publicas = poc.colecoes.find(
  {visibilidade:'publica',estado:'ativa'},
  {projection:{_id:1}}
).map(x=>x._id).toArray();
const filtroC1={colecao_id:{$in:publicas},visibilidade:'publica',estado:'ativo',$and:[
  {atributos:{$elemMatch:{chave:'pais',tipo:'texto',valor:'Brasil'}}},
  {atributos:{$elemMatch:{chave:'ano',tipo:'numero',valor:{$gte:1980}}}}
]};
poc.itens.find(filtroC1).sort({criado_em:-1}).limit(20).toArray();
```

Os filtros externos são validados antes da montagem da consulta: são aceitos no máximo três filtros; `eq` e `in` aplicam-se aos tipos pertinentes, enquanto `gte` e `lte` são admitidos para números e datas. O resultado é revalidado por [AccessControlService.js](../backend/src/components/AccessControlService.js) antes de ser enviado. O repositório mantém em memória um cache limitado a 500 contagens e o invalida nas mutações efetuadas pela própria API. A consulta preliminar dos IDs públicos, a transferência da lista para `$in`, a contagem e a revalidação fazem parte do custo da requisição; o cache local não coordena múltiplas instâncias da API.

### 5.2.2. C2 — Coleções e itens do usuário

A consulta C2 utiliza o `usuario_id` obtido da autenticação para selecionar coleções do proprietário, inclusive privadas. A listagem de itens de uma coleção exige uma verificação prévia de propriedade; a busca por todos os itens do usuário utiliza o escopo `minhas`. A [Listagem 6](../backend/src/components/Repositories/CatalogRepository.js) apresenta os filtros aplicados pelo repositório.

**Listagem 6 — Filtros de propriedade e paginação de C2 (`CatalogRepository.js`).**

```javascript
const filtroColecoes={usuario_id:oid(userId),estado:'ativa'};
d.collection('colecoes').find(filtroColecoes)
  .sort({criado_em:-1}).skip(skip).limit(limit).toArray();

const filtroItens={colecao_id:oid(collectionId),estado:'ativo'};
d.collection('itens').find(filtroItens)
  .sort({criado_em:-1}).skip(skip).limit(limit).toArray();
```

A segunda consulta é precedida de `ownedCollection(actor, collectionId)` em [CatalogService.js](../backend/src/components/CatalogService.js). Já `POST /itens/busca` com `escopo:'minhas'` produz `{usuario_id:oid(actor),estado:'ativo'}` e inclui itens privados do proprietário. A paginação padrão é de 20 registros, com máximo de 50. O índice de `colecoes(usuario_id, estado)` atende à seleção de coleções; o índice de `itens(usuario_id, estado, criado_em desc)` atende à listagem geral por usuário.

### 5.2.3. C3 — Detalhes e interações de um item

A consulta C3 é composta por leituras independentes: item por `_id`, coleção correspondente para verificar visibilidade efetiva, imagens ativas ordenadas por `ordem`, agregação das avaliações e página de comentários. A autorização é aplicada antes da divulgação das interações; para terceiros, tanto a coleção quanto o item precisam estar públicos e ativos. O acesso a um item existente, porém privado para o solicitante, resulta em `404`.

A [Listagem 7](../backend/src/components/Repositories/InteractionRepository.js) apresenta a agregação de notas e a paginação de comentários implementadas em `InteractionRepository.js`.

**Listagem 7 — Agregação e paginação de C3 (`InteractionRepository.js`).**

```javascript
d.collection('avaliacoes').aggregate([
  {$match:{item_id:oid(itemId)}},
  {$group:{_id:null,media:{$avg:'$nota'},quantidade:{$sum:1}}}
]).toArray();

const filtroComentarios={item_id:oid(itemId)};
d.collection('comentarios').find(filtroComentarios)
  .sort({criado_em:-1}).skip(skip).limit(limit).toArray();
```

O índice `avaliacoes(item_id, usuario_id)` localiza as avaliações do item e impõe a unicidade da nota por usuário; `comentarios(item_id, criado_em desc)` apoia a ordenação da página. A média é calculada sobre as avaliações existentes, sem pré agregação persistida. Consequentemente, o custo do resumo pode aumentar com o número de avaliações. A medição de p95 do detalhe registrada na PoC foi realizada em uma base pequena e não comprova a meta para itens com grande volume de interações.

### 5.2.4. C4 — Descoberta de filtros disponíveis

C4 identifica as combinações de chave, tipo e valores presentes nos itens acessíveis no escopo selecionado. O filtro inicial de `SearchService.js` reproduz a restrição de visibilidade de C1 para o escopo global ou restringe os itens ao proprietário para o escopo `minhas`. O pipeline real de [SearchRepository.js](../backend/src/components/Repositories/SearchRepository.js) é apresentado na Listagem 8.

**Listagem 8 — Agregação dos atributos disponíveis (`SearchRepository.js`).**

```javascript
(await db()).collection('itens').aggregate([
  {$match:filter},
  {$unwind:'$atributos'},
  {$unwind:'$atributos.valor'},
  {$group:{_id:{chave:'$atributos.chave',tipo:'$atributos.tipo'},
           valores:{$addToSet:'$atributos.valor'}}},
  {$sort:{'_id.chave':1}}
]).toArray();
```

O segundo `$unwind` trata os múltiplos valores de atributos do tipo `opcao`; o `$group` deduplica os valores por par `(chave, tipo)`. A API limita a 100 os valores retornados para tipos discretos. A etapa `$match` antecede a expansão dos atributos, mas o custo do pipeline ainda depende da quantidade de itens e de atributos acessíveis. Não há ensaio específico de C4 com 1 milhão de itens.

### 5.2.5. C5 — Dependentes de uma coleção e exclusão em cascata

C5 localiza os registros dependentes por `colecao_id`. A exclusão em cascata é coordenada pelo backend, pois a remoção do documento de `colecoes` não elimina automaticamente itens, avaliações, comentários ou metadados de imagens. [CatalogService.js](../backend/src/components/CatalogService.js) primeiro atualiza a coleção de `ativa` para `em_exclusao`, bloqueando sua exposição e novas operações dependentes. Em seguida, [ImageService.js](../backend/src/components/ImageService.js) remove os arquivos físicos apontados pelos metadados. Por fim, o repositório executa a exclusão dos documentos em uma transação, conforme a Listagem 9.

**Listagem 9 — Exclusão transacional dos dependentes (`CatalogRepository.js`).**

```javascript
await session.withTransaction(async()=>{
  const d=client.db(process.env.MONGODB_DB||'coleciona');
  const filter={colecao_id:collection._id};
  for(const name of ['avaliacoes','comentarios','imagens','itens'])
    await d.collection(name).deleteMany(filter,{session});
  await d.collection('colecoes').deleteOne(
    {_id:collection._id,estado:'em_exclusao'},
    {session}
  );
});
```

Os índices de `colecao_id` nas quatro coleções dependentes apoiam a localização dos registros. A remoção de um item isolado usa o mesmo princípio, com `item_id` para avaliações, comentários e imagens. O estado `em_exclusao` é persistido antes da limpeza de arquivos; se houver interrupção, [cleanupImages.js](../backend/src/jobs/cleanupImages.js) retoma as exclusões pendentes na inicialização da API e a cada 60 segundos. A remoção física usa `fs.rm(...,{force:true})`, permitindo repetição quando o arquivo já não existe. Os documentos MongoDB são excluídos atomicamente na transação, mas a remoção do arquivo no sistema operacional **não é revertida** por ela. O serviço só conclui a requisição de exclusão após a limpeza e a transação.

### 5.2.6. Resultados e limites da medição

A avaliação de C1 foi realizada por meio da API com 100 clientes lógicos, taxa de 100 requisições por segundo, páginas de 20 itens e três filtros (`ano ≥ 1980`, `pais = Brasil` e `vram_gb ≥ 8`). Cada rodada durou 10 segundos e completou 1.000 requisições sem erro. Os dados foram produzidos em bases isoladas de 100 mil, 500 mil e 1 milhão de itens por `seed-load.js`.

| Volume da base | p95 observado na API |
| ---: | ---: |
| 100 mil itens | 5,52 ms |
| 500 mil itens | 6,25 ms |
| 1 milhão de itens, primeira rodada | 33,42 ms |

Na base de 1 milhão, [explain-evidence.json](../reports/explain-evidence.json) registra o uso do índice multikey de atributos, com 83 chaves e 83 documentos examinados para retornar 20 itens. O script de `explain` executa a página da consulta sem o cálculo de `total` e sem a ordenação da rota HTTP; seus tempos não são diretamente equivalentes ao p95 da API. A carga sintética possui dez coleções e um único proprietário, de modo que não demonstra o custo de listas extensas de IDs públicos nem a distribuição por usuários em shards. As demais metas e lacunas de medição estão discriminadas em [rnf-results.md](../reports/rnf-results.md).

## 5.3. Estratégia de distribuição

### 5.3.1. Replicação implementada

O replica set `rsColeciona` constitui a estratégia de replicação efetivamente implementada. A configuração inicial registra três membros e aguarda a eleição do primário, como mostra a Listagem 10. As escritas da aplicação dependem de um primário disponível; os membros secundários mantêm cópias e podem participar de uma nova eleição quando há maioria. A replicação não substitui o backup dos documentos e das fotografias.

**Listagem 10 — Configuração inicial do replica set (`database/init-replica.js`).**

```javascript
rs.initiate({_id:'rsColeciona',members:[
  {_id:0,host:'127.0.0.1:27017'},
  {_id:1,host:'127.0.0.1:27018'},
  {_id:2,host:'127.0.0.1:27019'}
]});
```

O ensaio de [failover](../reports/replica-failover.md) interrompeu o primário local e registrou, na rodada final, eleição em 16,287 s e primeira escrita posterior em 16,521 s. Um marcador confirmado com `w: majority` permaneceu preservado. Essa confirmação majoritária foi aplicada ao marcador do ensaio; o código da API não define explicitamente `writeConcern: 'majority'` para todas as escritas. Como os três processos estavam na mesma máquina, o resultado demonstra recuperação diante da falha de um processo, sem comprovar disponibilidade diante da perda do hospedeiro ou durante um mês completo.

### 5.3.2. Proposta de fragmentação horizontal

Para distribuir os dados entre máquinas, a arquitetura teria de evoluir de um único replica set para um cluster sharded. A topologia proposta compreende um replica set de servidores de configuração (CSRS), dois ou mais shards de dados, cada um constituído por replica set, e roteadores `mongos` para receber as conexões da API. O `mongos` consulta os metadados do CSRS e encaminha operações aos shards. Essa composição corresponde à arquitetura descrita na [documentação oficial do MongoDB](https://www.mongodb.com/docs/manual/core/sharded-cluster-components/).

```text
API ──> mongos ──> CSRS: metadados da fragmentação
              ├──> shard A: replica set de dados
              └──> shard B: replica set de dados
```

A chave de shard deve ser escolhida a partir da cardinalidade dos valores, da distribuição do volume de dados e dos filtros efetivamente executados. A seguinte análise explicita as alternativas para a coleção física `itens`:

| Chave candidata | Acesso direcionado | Consultas distribuídas ou limitação |
| --- | --- | --- |
| `{usuario_id:'hashed'}` | Itens de um usuário, desde que o filtro contenha `usuario_id`. | C1 e C4 globais; um usuário com acervo muito grande pode concentrar dados em um shard. |
| `{colecao_id:'hashed'}` | Itens de uma coleção e etapas de C5 com `colecao_id`. | Listagem geral de itens do usuário e buscas globais; uma coleção muito grande permanece concentrada. |
| `{_id:'hashed'}` | Leitura pontual de um item por ID. | C1, C2, C4 e C5 não usam `_id` como filtro principal. |

Como hipótese inicial, considera-se `{usuario_id:'hashed'}` para `itens`, em razão do acesso frequente por proprietário em C2. Essa decisão **não foi validada experimentalmente**. A base de um milhão de itens gerada por `seed-load.js` contém apenas um `usuario_id`; todos os seus itens teriam o mesmo valor da chave proposta, o que a torna inadequada para avaliar a distribuição entre shards. Antes da escolha definitiva, seria necessário gerar uma carga com muitos proprietários, diferentes tamanhos de acervo e o padrão esperado de consultas públicas. A avaliação da chave deve considerar também o volume de C1 e C4, que não incluem `usuario_id` e, portanto, podem exigir consultas a vários shards. Esses critérios são descritos na [documentação de seleção da shard key](https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/) e de [consultas distribuídas](https://www.mongodb.com/docs/manual/core/distributed-queries/).

A configuração ilustrativa da Listagem 11 pressupõe que o CSRS, os dois replica sets de dados e o `mongos` já tenham sido implantados em **ambiente separado**, com nomes de host reais. A aplicação ainda precisaria ser adaptada antes de utilizar a coleção fragmentada.

**Listagem 11 — Comandos previstos para um cluster sharded de ensaio (`mongosh` conectado ao `mongos`).**

```javascript
sh.addShard('rsShardA/host-a1:27017,host-a2:27017,host-a3:27017');
sh.addShard('rsShardB/host-b1:27017,host-b2:27017,host-b3:27017');
db.getSiblingDB('coleciona').itens.createIndex({usuario_id:'hashed'});
sh.shardCollection('coleciona.itens',{usuario_id:'hashed'});
sh.status();
```

Os comandos acima **não foram executados nesta PoC**. Em coleção não vazia, o MongoDB exige índice compatível com a shard key antes de `sh.shardCollection`. Além disso, `withActiveItem` usa atualmente `findOneAndUpdate` filtrado por `_id` e `estado`, sem igualdade em `usuario_id`. Para fragmentar `itens` pela chave proposta, o backend teria de obter a identidade do proprietário de forma confiável e incluí-la nos filtros de atualizações pontuais; também seria necessário reavaliar consultas por ID, busca global, transações e exclusões em cascata. As restrições de operações pontuais em coleções fragmentadas constam da [documentação operacional do MongoDB](https://www.mongodb.com/docs/manual/core/sharded-cluster-requirements/).

As coleções `usuarios` e `avaliacoes` permaneceriam inicialmente sem fragmentação. Em especial, o índice único atual de `avaliacoes` é `{item_id:1,usuario_id:1}`: sua manutenção em uma coleção sharded exigiria analisar a compatibilidade com a chave de shard, pois a unicidade distribuída está sujeita à exigência de prefixo da shard key. A mesma análise deve ser feita antes de fragmentar qualquer outra coleção que possua índice único. Os dados de fotografias exigiriam ainda armazenamento compartilhado ou de objetos quando a API passasse a executar em múltiplas máquinas; o sharding do MongoDB não distribui os arquivos mantidos em `storage/uploads/`.

A migração somente poderia ser considerada demonstrada após medir C1–C5 em cluster fragmentado, identificar operações roteadas a um ou vários shards, verificar distribuição de espaço e requisições, repetir os testes de autorização e exclusão concorrente, medir p95 sob carga e testar failover de um nó de cada replica set. Os resultados atuais comprovam apenas as propriedades indicadas nos [relatórios da PoC](../reports/rnf-results.md), e não o desempenho ou a disponibilidade de uma implantação sharded.
