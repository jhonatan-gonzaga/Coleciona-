const {db,oid}=require('./mongoClient');
class InteractionRepository {
  async rating(itemId,userId){return (await db()).collection('avaliacoes').findOne({item_id:oid(itemId),usuario_id:oid(userId)})}
  async upsertRating(item,actor,nota){const now=new Date();return (await db()).collection('avaliacoes').findOneAndUpdate({item_id:item._id,usuario_id:oid(actor)},{$set:{nota,atualizado_em:now},$setOnInsert:{colecao_id:item.colecao_id,criado_em:now}},{upsert:true,returnDocument:'after'})}
  async deleteRating(itemId,userId){return (await db()).collection('avaliacoes').deleteOne({item_id:oid(itemId),usuario_id:oid(userId)})}
  async ratingSummary(itemId){const rows=await (await db()).collection('avaliacoes').aggregate([{$match:{item_id:oid(itemId)}},{$group:{_id:null,media:{$avg:'$nota'},quantidade:{$sum:1}}}]).toArray();return rows[0]||{media:null,quantidade:0}}
  async comments(itemId,skip,limit){const d=await db(),filter={item_id:oid(itemId)};return {rows:await d.collection('comentarios').find(filter).sort({criado_em:-1}).skip(skip).limit(limit).toArray(),total:await d.collection('comentarios').countDocuments(filter)}}
  async comment(id){const _id=oid(id);return _id?(await db()).collection('comentarios').findOne({_id}):null}
  async createComment(item,actor,texto){const now=new Date(),doc={colecao_id:item.colecao_id,item_id:item._id,usuario_id:oid(actor),texto,criado_em:now,atualizado_em:now};const result=await (await db()).collection('comentarios').insertOne(doc);return {...doc,_id:result.insertedId}}
  async updateComment(id,actor,texto){return (await db()).collection('comentarios').findOneAndUpdate({_id:oid(id),usuario_id:oid(actor)},{$set:{texto,atualizado_em:new Date()}},{returnDocument:'after'})}
  async deleteComment(id,actor){return (await db()).collection('comentarios').deleteOne({_id:oid(id),usuario_id:oid(actor)})}
  async mine(actor,skip,limit){const d=await db(),user=oid(actor);const [ratings,comments]=await Promise.all([d.collection('avaliacoes').find({usuario_id:user}).toArray(),d.collection('comentarios').find({usuario_id:user}).toArray()]);const rows=[...ratings.map(x=>({...x,tipo:'avaliacao'})),...comments.map(x=>({...x,tipo:'comentario'}))].sort((a,b)=>b.criado_em-a.criado_em);return {rows:rows.slice(skip,skip+limit),total:rows.length}}
}
module.exports=InteractionRepository;
