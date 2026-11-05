const {db,oid}=require('./mongoClient');
class AuthRepository {
  async byEmail(email){return (await db()).collection('usuarios').findOne({email})}
  async byId(id){const _id=oid(id);return _id?(await db()).collection('usuarios').findOne({_id}):null}
  async create(user){return (await db()).collection('usuarios').insertOne(user)}
  async updateLogin(id,update){return (await db()).collection('usuarios').updateOne({_id:oid(id)},update)}
}
module.exports=AuthRepository;
