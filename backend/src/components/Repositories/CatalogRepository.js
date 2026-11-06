const {db,oid,connect,withActiveCollection,withActiveItem}=require('./mongoClient');
class CatalogRepository {
  async collection(id){const _id=oid(id);return _id?(await db()).collection('colecoes').findOne({_id}):null}
  async item(id){const _id=oid(id);return _id?(await db()).collection('itens').findOne({_id}):null}
  async activeItemsByIds(ids,filter={}){return (await db()).collection('itens').find({_id:{$in:ids},estado:'ativo',...filter}).toArray()}
  async publicCollectionsByIds(ids){return (await db()).collection('colecoes').find({_id:{$in:ids},estado:'ativa',visibilidade:'publica'},{projection:{_id:1}}).toArray()}
  async myCollections(userId,skip,limit,name){const filter={usuario_id:oid(userId),estado:'ativa'},d=await db();if(name)filter.nome={$regex:name,$options:'i'};return {rows:await d.collection('colecoes').find(filter).sort({criado_em:-1}).skip(skip).limit(limit).toArray(),total:await d.collection('colecoes').countDocuments(filter)}}
  async itemsInCollection(collectionId,skip,limit){const filter={colecao_id:oid(collectionId),estado:'ativo'},d=await db();return {rows:await d.collection('itens').find(filter).sort({criado_em:-1}).skip(skip).limit(limit).toArray(),total:await d.collection('itens').countDocuments(filter)}}
  async countItems(collectionId){return (await db()).collection('itens').countDocuments({colecao_id:oid(collectionId),estado:'ativo'})}
  async suggestTags(userId,prefix){
    const escaped=prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return (await db()).collection('itens').aggregate([
      {$match:{usuario_id:oid(userId),estado:'ativo',etiquetas:{$regex:`^${escaped}`,$options:'i'}}},
      {$unwind:'$etiquetas'},
      {$match:{etiquetas:{$regex:`^${escaped}`,$options:'i'}}},
      {$group:{_id:{$toLower:'$etiquetas'},nome:{$first:'$etiquetas'}}},
      {$sort:{nome:1}},
      {$limit:8},
      {$project:{_id:0,nome:1}}
    ]).toArray()
  }
  async insertCollection(doc){const result=await (await db()).collection('colecoes').insertOne(doc);return {...doc,_id:result.insertedId}}
  async updateCollection(id,owner,patch){return (await db()).collection('colecoes').findOneAndUpdate({_id:oid(id),usuario_id:oid(owner),estado:'ativa'},{$set:{...patch,atualizado_em:new Date()}},{returnDocument:'after'})}
  async updateItem(id,owner,patch){return withActiveItem(oid(id),async(d,session)=>d.collection('itens').findOneAndUpdate({_id:oid(id),usuario_id:oid(owner),estado:'ativo'},{$set:{...patch,atualizado_em:new Date()}},{session,returnDocument:'after'}))}
  async createItemAndImages(item,images){await withActiveCollection(item.colecao_id,async(d,session)=>{await d.collection('itens').insertOne(item,{session});await d.collection('imagens').insertMany(images,{session})});return item}
  async markItemDeleting(id,owner){return (await db()).collection('itens').findOneAndUpdate({_id:oid(id),usuario_id:oid(owner),estado:'ativo'},{$set:{estado:'em_exclusao',atualizado_em:new Date()}},{returnDocument:'after'})}
  async markCollectionDeleting(id,owner){return (await db()).collection('colecoes').findOneAndUpdate({_id:oid(id),usuario_id:oid(owner),estado:'ativa'},{$set:{estado:'em_exclusao',atualizado_em:new Date()}},{returnDocument:'after'})}
  async deletingItems(){return (await db()).collection('itens').find({estado:'em_exclusao'}).toArray()}
  async deletingCollections(){return (await db()).collection('colecoes').find({estado:'em_exclusao'}).toArray()}
  async itemsByCollection(id){return (await db()).collection('itens').find({colecao_id:oid(id)}).toArray()}
  async finishItemDeletion(item){const client=await connect(),session=client.startSession();try{await session.withTransaction(async()=>{const d=client.db(process.env.MONGODB_DB||'coleciona'),filter={item_id:item._id};await Promise.all([d.collection('avaliacoes').deleteMany(filter,{session}),d.collection('comentarios').deleteMany(filter,{session}),d.collection('imagens').deleteMany(filter,{session})]);await d.collection('itens').deleteOne({_id:item._id,estado:'em_exclusao'},{session})})}finally{await session.endSession()}}
  async finishCollectionDeletion(collection){const client=await connect(),session=client.startSession();try{await session.withTransaction(async()=>{const d=client.db(process.env.MONGODB_DB||'coleciona'),filter={colecao_id:collection._id};for(const name of ['avaliacoes','comentarios','imagens','itens'])await d.collection(name).deleteMany(filter,{session});await d.collection('colecoes').deleteOne({_id:collection._id,estado:'em_exclusao'},{session})})}finally{await session.endSession()}}
  async ready(){const d=await db();await d.command({ping:1});const hello=await d.command({hello:1});return !!hello.isWritablePrimary}
}
module.exports=CatalogRepository;
