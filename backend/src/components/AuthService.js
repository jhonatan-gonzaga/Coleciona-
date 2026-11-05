const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {fail}=require('../middleware/errorHandler');
const {serialize}=require('./Repositories/mongoClient');
const AuthRepository=require('./Repositories/AuthRepository');
const repo=new AuthRepository();
const safe=user=>{const {senha_hash,tentativas_login,falhas_em,bloqueado_ate,...publico}=serialize(user);return publico};
const secret=()=>{if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32) fail(503,'CONFIGURACAO','JWT_SECRET deve ter pelo menos 32 caracteres.');return process.env.JWT_SECRET};
async function cadastro(body){
  const nome=String(body.nome||'').trim(),email=String(body.email||'').trim().toLowerCase(),senha=body.senha;
  if(nome.length<2||nome.length>100||!/^\S+@\S+\.\S+$/.test(email)||typeof senha!=='string'||senha.length<8||senha.length>128) fail(422,'DADOS_INVALIDOS','Informe nome, e-mail e senha de 8 a 128 caracteres.');
  if(await repo.byEmail(email)) fail(409,'EMAIL_EM_USO','E-mail já cadastrado.');
  const user={nome,email,senha_hash:await bcrypt.hash(senha,12),tentativas_login:0,falhas_em:null,bloqueado_ate:null,criado_em:new Date(),atualizado_em:new Date()};
  const result=await repo.create(user);return safe({...user,_id:result.insertedId});
}
async function login(body){
  const email=String(body.email||'').trim().toLowerCase();const user=await repo.byEmail(email);
  if(!user) fail(401,'CREDENCIAIS_INVALIDAS','E-mail ou senha inválidos.');
  const now=Date.now();if(user.bloqueado_ate && user.bloqueado_ate.getTime()>now) fail(429,'LOGIN_BLOQUEADO','Aguarde 15 minutos para tentar novamente.');
  if(!await bcrypt.compare(String(body.senha||''),user.senha_hash)){
    const count=user.falhas_em && now-user.falhas_em.getTime()<900000?(user.tentativas_login||0)+1:1;
    await repo.updateLogin(user._id,{$set:{tentativas_login:count,falhas_em:new Date(),bloqueado_ate:count>=5?new Date(now+900000):null}});
    fail(401,'CREDENCIAIS_INVALIDAS','E-mail ou senha inválidos.');
  }
  await repo.updateLogin(user._id,{$set:{tentativas_login:0,falhas_em:null,bloqueado_ate:null}});
  return {token:jwt.sign({},secret(),{subject:String(user._id),expiresIn:'1h'}),usuario:safe(user)};
}
async function me(id){const user=await repo.byId(id);if(!user) fail(401,'NAO_AUTENTICADO','Sessão inválida.');return safe(user)}
module.exports={cadastro,login,me,secret};
