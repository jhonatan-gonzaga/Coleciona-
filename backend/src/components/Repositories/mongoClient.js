const {MongoClient,ObjectId}=require('mongodb');
let client;
async function connect() {
  if (!client) { client=new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona',{serverSelectionTimeoutMS:3000}); await client.connect(); }
  return client;
}
async function db() {return (await connect()).db('coleciona')}
function oid(value) {if(!ObjectId.isValid(value)||String(new ObjectId(value))!==String(value).toLowerCase()) return null;return new ObjectId(value)}
function id(value) {return value?.toString()}
function serialize(doc) {
  if (Array.isArray(doc)) return doc.map(serialize);
  if (!doc || typeof doc!=='object' || doc instanceof Date) return doc;
  if (doc instanceof ObjectId) return doc.toString();
  const out={};for(const [key,value] of Object.entries(doc))out[key==='_id'?'id':key]=serialize(value);return out;
}
module.exports={connect,db,oid,id,serialize,ObjectId};
