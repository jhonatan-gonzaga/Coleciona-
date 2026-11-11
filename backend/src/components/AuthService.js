const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {fail}=require('../middleware/errorHandler');
const {serialize}=require('./Repositories/mongoClient');
const AuthRepository=require('./Repositories/AuthRepository');
const repo=new AuthRepository();
const safe=user=>{const {senha_hash,tentativas_login,falhas_em,bloqueado_ate,controle_login,...publico}=serialize(user);return publico};
const secret=()=>{if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32) fail(503,'CONFIGURACAO','JWT_SECRET deve ter pelo menos 32 caracteres.');return process.env.JWT_SECRET};
async function cadastro(body){
  const nome=String(body.nome||'').trim(),email=String(body.email||'').trim().toLowerCase(),senha=body.senha;
  if(nome.length<2||nome.length>100||!/^\S+@\S+\.\S+$/.test(email)||typeof senha!=='string'||senha.length<8||senha.length>128) fail(422,'DADOS_INVALIDOS','Informe nome, e-mail e senha de 8 a 128 caracteres.');
  if(await repo.byEmail(email)) fail(409,'EMAIL_EM_USO','E-mail já cadastrado.');
  const user={nome,email,senha_hash:await bcrypt.hash(senha,12),controle_login:{falhas_em:[],bloqueado_ate:null,versao:0},criado_em:new Date(),atualizado_em:new Date()};
  const result=await repo.create(user);return safe({...user,_id:result.insertedId});
}
async function login(body){
  const email=String(body.email||'').trim().toLowerCase();let user=await repo.byEmail(email);
  if(!user) fail(401,'CREDENCIAIS_INVALIDAS','E-mail ou senha inválidos.');
  const valid=await bcrypt.compare(String(body.senha||''),user.senha_hash);
  for(let attempt=0;attempt<20;attempt++){
    const now=Date.now(),control=user.controle_login||{falhas_em:[],bloqueado_ate:null,versao:0};
    if(control.bloqueado_ate && new Date(control.bloqueado_ate).getTime()>now)fail(429,'LOGIN_BLOQUEADO','Aguarde 15 minutos para tentar novamente.');
    const recent=(control.falhas_em||[]).filter(date=>new Date(date).getTime()>now-900000);
    const failures=valid?[]:[...recent,new Date(now)];
    const state={falhas_em:failures,bloqueado_ate:!valid&&failures.length>=5?new Date(now+900000):null};
    const result=await repo.updateLogin(user._id,control.versao||0,state);
    if(result.matchedCount){
      if(!valid)fail(401,'CREDENCIAIS_INVALIDAS','E-mail ou senha inválidos.');
      return {token:jwt.sign({},secret(),{subject:String(user._id),expiresIn:'1h'}),usuario:safe(user)};
    }
    user=await repo.byEmail(email);
    if(!user)fail(401,'CREDENCIAIS_INVALIDAS','E-mail ou senha inválidos.');
  }
  fail(503,'LOGIN_CONCORRENTE','Tente novamente em instantes.');
}
async function me(id){const user=await repo.byId(id);if(!user) fail(401,'NAO_AUTENTICADO','Sessão inválida.');return safe(user)}
module.exports={cadastro,login,me,secret};
