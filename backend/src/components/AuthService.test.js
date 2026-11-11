const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const database=`coleciona_auth_test_${randomUUID().replaceAll('-','')}`;
process.env.MONGODB_DB=database;
process.env.JWT_SECRET='segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';
const {db,connect}=require('./Repositories/mongoClient');
const auth=require('./AuthService');
test.after(async()=>{await (await connect()).close()});
const credentials={nome:'Teste de login',email:'login@test.local',senha:'senha-forte-123'};

test('janela móvel, bloqueio, desbloqueio e tentativas simultâneas',async()=>{
  try{
    const created=await auth.cadastro(credentials);
    assert.equal(created.controle_login,undefined);
    const users=(await db()).collection('usuarios');
    const wrong={email:credentials.email,senha:'senha-incorreta'};
    await users.updateOne({email:credentials.email},{$set:{'controle_login.falhas_em':[
      new Date(Date.now()-16*60_000),new Date(Date.now()-14*60_000),new Date(Date.now()-13*60_000),new Date(Date.now()-12*60_000)
    ]}});
    await assert.rejects(auth.login(wrong),{code:'CREDENCIAIS_INVALIDAS'});
    let control=(await users.findOne({email:credentials.email})).controle_login;
    assert.equal(control.falhas_em.length,4,'falha com mais de 15 minutos deve sair da janela');
    await assert.rejects(auth.login(wrong),{code:'CREDENCIAIS_INVALIDAS'});
    await assert.rejects(auth.login({...credentials}),{code:'LOGIN_BLOQUEADO'});
    await users.updateOne({email:credentials.email},{$set:{'controle_login.bloqueado_ate':new Date(Date.now()-1000)}});
    const logged=await auth.login(credentials);
    assert.ok(logged.token);
    control=(await users.findOne({email:credentials.email})).controle_login;
    assert.deepEqual(control.falhas_em,[]);
    const results=await Promise.allSettled(Array.from({length:5},()=>auth.login(wrong)));
    assert.equal(results.filter(x=>x.status==='rejected'&&x.reason.code==='CREDENCIAIS_INVALIDAS').length,5);
    control=(await users.findOne({email:credentials.email})).controle_login;
    assert.equal(control.falhas_em.length,5,'concorrência não pode perder falhas');
    assert.ok(control.bloqueado_ate>new Date());
    await assert.rejects(auth.login(credentials),{code:'LOGIN_BLOQUEADO'});
  }finally{await (await connect()).db(database).dropDatabase()}
});
