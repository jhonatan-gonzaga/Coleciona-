const {db,oid}=require('./mongoClient');
class SearchRepository {
  async publicCollections(skip,limit){const d=await db(),filter={estado:'ativa',visibilidade:'publica'};const rows=await d.collection('colecoes').find(filter).sort({_id:-1}).skip(skip).limit(limit).toArray();return {rows,total:await d.collection('colecoes').countDocuments(filter)}}
  async publicCollectionIds(){return (await db()).collection('colecoes').find({estado:'ativa',visibilidade:'publica'},{projection:{_id:1}}).map(x=>x._id).toArray()}
  async countPublicItems(collectionId){return (await db()).collection('itens').countDocuments({colecao_id:oid(collectionId),estado:'ativo',visibilidade:'publica'})}
  async search(filter,skip,limit){const col=(await db()).collection('itens');return {rows:await col.find(filter).sort({criado_em:-1}).skip(skip).limit(limit).toArray(),total:await col.countDocuments(filter)}}
  async discover(filter){return (await db()).collection('itens').aggregate([{$match:filter},{$unwind:'$atributos'},{$group:{_id:{chave:'$atributos.chave',tipo:'$atributos.tipo'},valores:{$addToSet:'$atributos.valor'}}},{$sort:{'_id.chave':1}}]).toArray()}
}
module.exports=SearchRepository;
