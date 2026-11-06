const {db,oid,withActiveItem,unavailable}=require('./mongoClient');
const problem=(status,code,message)=>Object.assign(new Error(message),{status,code});
class ImageRepository {
  async byId(id){const _id=oid(id);return _id?(await db()).collection('imagens').findOne({_id}):null}
  async byItem(id){return (await db()).collection('imagens').find({item_id:oid(id),estado:'ativa'}).sort({ordem:1}).toArray()}
  async byItems(ids){return (await db()).collection('imagens').find({item_id:{$in:ids},estado:'ativa'}).sort({item_id:1,ordem:1}).toArray()}
  async allByItem(id){return (await db()).collection('imagens').find({item_id:oid(id)}).toArray()}
  async byCollection(id){return (await db()).collection('imagens').find({colecao_id:oid(id)}).toArray()}
  async insertMany(images){if(!images.length)return;return withActiveItem(images[0].item_id,async(d,session)=>{const active=await d.collection('imagens').find({item_id:images[0].item_id,estado:'ativa'},{session}).sort({ordem:1}).toArray();if(active.length+images.length>5)throw problem(409,'LIMITE_IMAGENS','Máximo de cinco imagens por item.');const start=active.length?Math.max(...active.map(x=>x.ordem))+1:0;images.forEach((image,i)=>image.ordem=start+i);return d.collection('imagens').insertMany(images,{session})})}
  async replace(id,patch,oldPath){const image=await this.byId(id);if(!image)throw unavailable();return withActiveItem(image.item_id,async(d,session)=>d.collection('imagens').findOneAndUpdate({_id:oid(id),estado:'ativa'},{$set:{...patch,atualizado_em:new Date()},$addToSet:{remocoes_pendentes:oldPath}},{session,returnDocument:'after'}))}
  async clearPending(id,path){return (await db()).collection('imagens').updateOne({_id:oid(id)},{$pull:{remocoes_pendentes:path}})}
  async pending(){return (await db()).collection('imagens').find({'remocoes_pendentes.0':{$exists:true}}).toArray()}
  async reorder(itemId,ids){return withActiveItem(oid(itemId),async(d,session)=>{const col=d.collection('imagens'),active=await col.find({item_id:oid(itemId),estado:'ativa'},{session}).toArray();if(active.length!==ids.length||ids.some(id=>!active.some(x=>String(x._id)===String(id))))throw problem(422,'ORDEM_INVALIDA','Informe todas as imagens ativas.');for(let i=0;i<ids.length;i++)await col.updateOne({_id:oid(ids[i]),item_id:oid(itemId),estado:'ativa'},{$set:{ordem:i}},{session})})}
  async markRemoving(id){const image=await this.byId(id);if(!image)throw unavailable();return withActiveItem(image.item_id,async(d,session)=>{const col=d.collection('imagens'),count=await col.countDocuments({item_id:image.item_id,estado:'ativa'},{session});if(count<=1)throw problem(409,'ULTIMA_IMAGEM','O item precisa manter pelo menos uma imagem.');return col.findOneAndUpdate({_id:oid(id),estado:'ativa'},{$set:{estado:'em_remocao'}},{session,returnDocument:'after'})})}
  async delete(id){return (await db()).collection('imagens').deleteOne({_id:oid(id),estado:'em_remocao'})}
  async removing(){return (await db()).collection('imagens').find({estado:'em_remocao'}).toArray()}
}
module.exports=ImageRepository;
