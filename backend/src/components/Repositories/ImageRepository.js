const {db,oid,connect}=require('./mongoClient');
class ImageRepository {
  async byId(id){const _id=oid(id);return _id?(await db()).collection('imagens').findOne({_id}):null}
  async byItem(id){return (await db()).collection('imagens').find({item_id:oid(id),estado:'ativa'}).sort({ordem:1}).toArray()}
  async byCollection(id){return (await db()).collection('imagens').find({colecao_id:oid(id)}).toArray()}
  async insertMany(images){return (await db()).collection('imagens').insertMany(images)}
  async replace(id,patch,oldPath){return (await db()).collection('imagens').findOneAndUpdate({_id:oid(id),estado:'ativa'},{$set:{...patch,atualizado_em:new Date()},$addToSet:{remocoes_pendentes:oldPath}},{returnDocument:'after'})}
  async clearPending(id,path){return (await db()).collection('imagens').updateOne({_id:oid(id)},{$pull:{remocoes_pendentes:path}})}
  async pending(){return (await db()).collection('imagens').find({'remocoes_pendentes.0':{$exists:true}}).toArray()}
  async reorder(itemId,ids){const client=await connect(),session=client.startSession();try{await session.withTransaction(async()=>{const col=client.db('coleciona').collection('imagens');for(let i=0;i<ids.length;i++)await col.updateOne({_id:oid(ids[i]),item_id:oid(itemId),estado:'ativa'},{$set:{ordem:i}},{session})})}finally{await session.endSession()}}
  async markRemoving(id){return (await db()).collection('imagens').findOneAndUpdate({_id:oid(id),estado:'ativa'},{$set:{estado:'em_remocao'}},{returnDocument:'after'})}
  async delete(id){return (await db()).collection('imagens').deleteOne({_id:oid(id),estado:'em_remocao'})}
  async removing(){return (await db()).collection('imagens').find({estado:'em_remocao'}).toArray()}
}
module.exports=ImageRepository;
