const {MongoClient,ObjectId}=require('mongodb');
let client;
async function connect() {
  if (!client) { client=new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona',{serverSelectionTimeoutMS:3000}); await client.connect(); }
  return client;
}
async function db() {return (await connect()).db(process.env.MONGODB_DB||'coleciona')}
function oid(value) {if(!ObjectId.isValid(value)||String(new ObjectId(value))!==String(value).toLowerCase()) return null;return new ObjectId(value)}
function id(value) {return value?.toString()}
function serialize(doc) {
  if (Array.isArray(doc)) return doc.map(serialize);
  if (!doc || typeof doc!=='object' || doc instanceof Date) return doc;
  if (doc instanceof ObjectId) return doc.toString();
  const out={};for(const [key,value] of Object.entries(doc))out[key==='_id'?'id':key]=serialize(value);return out;
}
const unavailable=()=>Object.assign(new Error('Recurso em exclusão ou indisponível.'),{status:409,code:'EM_EXCLUSAO'});
async function withActiveCollection(collectionId,work){const c=await connect(),session=c.startSession();try{return await session.withTransaction(async()=>{const d=c.db(process.env.MONGODB_DB||'coleciona');const collection=await d.collection('colecoes').findOneAndUpdate({_id:collectionId,estado:'ativa'},{$inc:{operacao_seq:1},$set:{atualizado_em:new Date()}},{session,returnDocument:'after'});if(!collection)throw unavailable();return work(d,session,collection)})}finally{await session.endSession()}}
async function withActiveItem(itemId,work){const c=await connect(),session=c.startSession();try{return await session.withTransaction(async()=>{const d=c.db(process.env.MONGODB_DB||'coleciona');const item=await d.collection('itens').findOneAndUpdate({_id:itemId,estado:'ativo'},{$inc:{operacao_seq:1},$set:{atualizado_em:new Date()}},{session,returnDocument:'after'});if(!item)throw unavailable();const collection=await d.collection('colecoes').findOneAndUpdate({_id:item.colecao_id,estado:'ativa'},{$inc:{operacao_seq:1},$set:{atualizado_em:new Date()}},{session,returnDocument:'after'});if(!collection)throw unavailable();return work(d,session,item,collection)})}finally{await session.endSession()}}
module.exports={connect,db,oid,id,serialize,ObjectId,withActiveCollection,withActiveItem,unavailable};
