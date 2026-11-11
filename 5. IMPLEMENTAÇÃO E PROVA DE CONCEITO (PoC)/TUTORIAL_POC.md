# Tutorial para reproduzir a PoC

Este roteiro acompanha [IMPLEMENTACAO_POC.md](IMPLEMENTACAO_POC.md). Execute os comandos a partir da **raiz de `AVIII`**, em um ambiente local de desenvolvimento. O script [consultas-poc.js](consultas-poc.js) apenas lê dados; não realiza exclusões.

## 1. Preparar o ambiente

Instale Node.js 20+, npm, MongoDB 8 (`mongod` e `mongosh`) e, se quiser testar backup, MongoDB Database Tools (`mongodump` e `mongorestore`). Os arquivos `database/mongo1.conf` a `mongo3.conf` guardam caminhos absolutos: ajuste `dbPath`, log e PID se o projeto foi movido.

Inicie os três nós e prepare o banco:

```bash
./database/start-replica.sh
./database/setup.sh
./database/status.sh
```

O resultado esperado de `status.sh` é **um PRIMARY e dois SECONDARY**. Os dados persistem em `database/data/`; repetir a inicialização não deve apagar o acervo.

## 2. Carregar dados de demonstração

```bash
cd database
npm install
npm run seed
cd ..
```

A saída informa duas contas, três coleções, quatro itens e nove fotos. A senha padrão é `coleciona-demo-123`. A seed pode ser repetida. Evite `npm run seed:online` se quiser manter o acervo atual: a etapa `apply` desse script substitui coleções e itens da base principal.

## 3. Executar C1–C5 diretamente no MongoDB

```bash
mongosh 'mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona' '5. IMPLEMENTAÇÃO E PROVA DE CONCEITO (PoC)/consultas-poc.js'
```

O script localiza os documentos da seed por `seed_tag` e apresenta: C1, item público encontrado por país e ano; C2, coleções e itens da conta Ana; C3, detalhe, média de notas e comentários do selo; C4, atributos de itens públicos; C5, quantidade de dependentes da coleção. O acesso direto com `mongosh` **não aplica a autorização da API**; no aplicativo, C1, C3 e C4 passam pelo controle de visibilidade do backend.

Para observar o plano de uma consulta na base isolada de carga, primeiro crie a carga de 100 mil itens (essa etapa pode demorar) e execute o script já existente:

```bash
cd database && node seed-load.js 100000 && cd ..
DB_NAME=coleciona_carga mongosh 'mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona' tests/rnf/explain.js
```

Compare `totalKeysExamined`, `totalDocsExamined`, índice escolhido e tempo com [explain-evidence.json](../reports/explain-evidence.json). Os números do relatório foram obtidos com uma base de **1 milhão** de itens e podem diferir da carga de 100 mil deste exemplo.

## 4. Subir a API e a interface

Prepare o segredo JWT e inicie o backend em um terminal:

```bash
cp backend/.env.example backend/.env
# Substitua JWT_SECRET em backend/.env por um valor aleatório com ao menos 32 caracteres.
cd backend
npm install
npm start
```

Em outro terminal, na raiz do projeto:

```bash
cd frontend
npm install
npm run dev
```

Abra `http://127.0.0.1:3000`. Entre com `ana.demo@coleciona.local` e a senha da seed. Em **Minhas coleções**, veja os dados da C2; em **Explorar**, teste C1 e C4 com itens públicos; abra o selo para C3. A coleção e o item privados não devem aparecer a outro usuário. `http://127.0.0.1:4000/api/v1/health/ready` deve devolver status `ok` quando o banco estiver pronto.

## 5. Verificar o CRUD e a cascata

Pela interface, crie uma coleção, cadastre um item com uma foto, edite seus atributos e depois exclua o item ou a coleção. A API usa `POST`, `GET`, `PATCH` e `DELETE` nas rotas listadas na seção 5.2 do documento principal.

Para verificar a cascata sem expor dados privados em uma consulta pública, use o banco local: antes da exclusão, conte os documentos com o `colecao_id`; após excluir pela interface, as contagens de `itens`, `avaliacoes`, `comentarios` e `imagens` vinculados devem ser zero. As fotos correspondentes também devem desaparecer de `storage/uploads/`. O comando abaixo é um exemplo para a coleção de demonstração **antes de apagá-la**:

```javascript
// Dentro do mongosh conectado a coleciona:
const c = db.colecoes.findOne({seed_tag:'demo:Objetos curiosos'});
for (const n of ['itens','avaliacoes','comentarios','imagens'])
  print(n, db.getCollection(n).countDocuments({colecao_id:c._id}));
```

Ao excluir a própria coleção, guarde seu `_id` antes, pois o documento deixa de existir. O job do backend retoma uma exclusão marcada e interrompida ao iniciar e a cada 60 segundos.

## 6. Executar testes e consultar evidências

Com API e replica set ativos:

```bash
cd backend && npm test && cd ..
node tests/functional/run.mjs
```

Para verificar a eleição local, use `node tests/replica/failover.mjs` **somente no replica set de desenvolvimento**: ele para e reinicia nós. Os resultados já registrados estão em [rnf-results.md](../reports/rnf-results.md) e [replica-failover.md](../reports/replica-failover.md).

## 7. Entender a expansão por sharding

O replica set local é uma única cópia lógica do banco; ele ainda não distribui os dados entre shards. Para experimentar fragmentação, monte **outro cluster** com dois replica sets de dados, um replica set de configuração e `mongos`; não execute `sh.shardCollection` no banco local atual como se ele já fosse um cluster fragmentado.

Depois de adaptar a API para consultar e atualizar itens com a chave de shard escolhida, o exemplo proposto na seção 5.3 usa `usuario_id` com hash. No `mongosh` conectado ao **mongos do cluster de teste**, a sequência conceitual seria:

```javascript
sh.addShard('rsShardA/host-a1:27017,host-a2:27017,host-a3:27017');
sh.addShard('rsShardB/host-b1:27017,host-b2:27017,host-b3:27017');
db.getSiblingDB('coleciona').itens.createIndex({usuario_id:'hashed'});
sh.shardCollection('coleciona.itens',{usuario_id:'hashed'});
sh.status();
```

Os nomes de host são **placeholders**. Antes de aplicar a mudança, verifique o índice, a distribuição dos usuários, as consultas sem `usuario_id`, as operações por `_id`, as transações de cascata e os índices únicos. O código atual ainda não atende a todos esses requisitos, portanto esse trecho descreve uma migração futura, não uma etapa da PoC executada. Consulte a [implantação de cluster sharded](https://www.mongodb.com/docs/manual/tutorial/deploy-shard-cluster/), a [escolha da chave](https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/) e as [restrições operacionais](https://www.mongodb.com/docs/manual/core/sharded-cluster-requirements/) do MongoDB.
