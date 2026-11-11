const {db,oid}=require('./mongoClient');
class AuthRepository {
  async byEmail(email){return (await db()).collection('usuarios').findOne({email})}
  async byId(id){const _id=oid(id);return _id?(await db()).collection('usuarios').findOne({_id}):null}
  async byIds(ids){return ids.length?(await db()).collection('usuarios').find({_id:{$in:ids}},{projection:{nome:1}}).toArray():[]}
  async create(user){return (await db()).collection('usuarios').insertOne(user)}
  async updateLogin(id,version,state){return (await db()).collection('usuarios').updateOne({_id:oid(id),'controle_login.versao':version},{$set:{controle_login:{...state,versao:version+1}}})}
}
module.exports=AuthRepository;
