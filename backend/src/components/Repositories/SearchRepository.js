const {db,oid}=require('./mongoClient');
const countCache=new Map();
class SearchRepository {
  static invalidate(){countCache.clear()}
  async publicCollections(skip,limit,name){const d=await db(),filter={estado:'ativa',visibilidade:'publica'};if(name)filter.nome={$regex:name,$options:'i'};const rows=await d.collection('colecoes').find(filter).sort({_id:-1}).skip(skip).limit(limit).toArray();return {rows,total:await d.collection('colecoes').countDocuments(filter)}}
  async publicCollectionIds(){return (await db()).collection('colecoes').find({estado:'ativa',visibilidade:'publica'},{projection:{_id:1}}).sort({_id:1}).map(x=>x._id).toArray()}
  async collectionIdsByName(scope,actor,name){const filter={estado:'ativa',nome:{$regex:name,$options:'i'}};if(scope==='global')filter.visibilidade='publica';else filter.usuario_id=oid(actor);return (await db()).collection('colecoes').find(filter,{projection:{_id:1}}).map(x=>x._id).toArray()}
  async collectionNames(ids){return (await db()).collection('colecoes').find({_id:{$in:ids}},{projection:{_id:1,nome:1}}).toArray()}
  async countPublicItems(collectionId){return (await db()).collection('itens').countDocuments({colecao_id:oid(collectionId),estado:'ativo',visibilidade:'publica'})}
  async search(filter,skip,limit){const col=(await db()).collection('itens'),key=`${process.env.MONGODB_DB||'coleciona'}:${JSON.stringify(filter)}`;let count=countCache.get(key);if(!count){count=col.countDocuments(filter).catch(error=>{countCache.delete(key);throw error});if(countCache.size>=500)countCache.delete(countCache.keys().next().value);countCache.set(key,count)}const [rows,total]=await Promise.all([col.find(filter).sort({criado_em:-1}).skip(skip).limit(limit).toArray(),count]);return {rows,total}}
  async discover(filter){return (await db()).collection('itens').aggregate([{$match:filter},{$unwind:'$atributos'},{$group:{_id:{chave:'$atributos.chave',tipo:'$atributos.tipo'},valores:{$addToSet:'$atributos.valor'}}},{$sort:{'_id.chave':1}}]).toArray()}
}
module.exports=SearchRepository;
