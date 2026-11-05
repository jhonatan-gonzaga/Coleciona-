const jwt=require('jsonwebtoken');
const {fail}=require('./errorHandler');
const {secret}=require('../components/AuthService');
function optionalAuth(req,res,next){
  const header=req.get('authorization');
  if(!header){req.actorId=null;return next()}
  if(!header.startsWith('Bearer ')) return next(Object.assign(new Error('Token Bearer inválido.'),{status:401,code:'NAO_AUTENTICADO'}));
  try{req.actorId=jwt.verify(header.slice(7),secret()).sub;next()}catch(error){next(Object.assign(new Error('Token inválido ou expirado.'),{status:401,code:'NAO_AUTENTICADO'}))}
}
function requireAuth(req,res,next){if(!req.actorId)return next(Object.assign(new Error('Autenticação necessária.'),{status:401,code:'NAO_AUTENTICADO'}));next()}
module.exports={optionalAuth,requireAuth};
