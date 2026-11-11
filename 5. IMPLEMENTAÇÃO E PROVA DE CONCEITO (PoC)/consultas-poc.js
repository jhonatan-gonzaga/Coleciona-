// Consulta somente leitura para a seed de database/seed.js.
// Execute: mongosh '<URI_DO_REPLICA_SET>' '5. IMPLEMENTAÇÃO E PROVA DE CONCEITO (PoC)/consultas-poc.js'
const poc = db.getSiblingDB('coleciona');
const usuario = poc.usuarios.findOne({email:'ana.demo@coleciona.local'});
const colecao = poc.colecoes.findOne({seed_tag:'demo:Objetos curiosos'});
const item = poc.itens.findOne({seed_tag:'demo:Selo comemorativo'});
if (!usuario || !colecao || !item) throw new Error('Execute primeiro: cd database && npm run seed');

print('\nC1 — busca global por atributos');
const publicas = poc.colecoes.find({visibilidade:'publica',estado:'ativa'},{projection:{_id:1}}).map(x=>x._id).toArray();
printjson(poc.itens.find({colecao_id:{$in:publicas},visibilidade:'publica',estado:'ativo',$and:[
  {atributos:{$elemMatch:{chave:'pais',tipo:'texto',valor:'Brasil'}}},
  {atributos:{$elemMatch:{chave:'ano',tipo:'numero',valor:{$gte:1980}}}}
]},{projection:{nome:1,colecao_id:1,atributos:1}}).sort({criado_em:-1}).limit(20).toArray());

print('\nC2 — coleções e itens do proprietário');
printjson(poc.colecoes.find({usuario_id:usuario._id,estado:'ativa'},{projection:{nome:1,visibilidade:1}}).toArray());
printjson(poc.itens.find({usuario_id:usuario._id,estado:'ativo'},{projection:{nome:1,visibilidade:1}}).sort({criado_em:-1}).limit(20).toArray());

print('\nC3 — detalhe e interações (autorize antes de usar na API)');
printjson(poc.itens.findOne({_id:item._id,estado:'ativo'},{projection:{nome:1,atributos:1,colecao_id:1}}));
printjson(poc.avaliacoes.aggregate([{$match:{item_id:item._id}},{$group:{_id:null,media:{$avg:'$nota'},quantidade:{$sum:1}}}]).toArray());
printjson(poc.comentarios.find({item_id:item._id},{projection:{texto:1,criado_em:1}}).sort({criado_em:-1}).limit(20).toArray());

print('\nC4 — filtros disponíveis no escopo público');
printjson(poc.itens.aggregate([
  {$match:{colecao_id:{$in:publicas},visibilidade:'publica',estado:'ativo'}},
  {$unwind:'$atributos'},
  {$unwind:'$atributos.valor'},
  {$group:{_id:{chave:'$atributos.chave',tipo:'$atributos.tipo'},valores:{$addToSet:'$atributos.valor'}}},
  {$sort:{'_id.chave':1}}
]).toArray());

print('\nC5 — dependentes da coleção (somente contagem; não exclui dados)');
for (const nome of ['itens','avaliacoes','comentarios','imagens']) {
  print(`${nome}: ${poc.getCollection(nome).countDocuments({colecao_id:colecao._id})}`);
}
