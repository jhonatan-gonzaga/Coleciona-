import{execFile}from'node:child_process';import{promisify}from'node:util';import{readFile}from'node:fs/promises';import path from'node:path';import{fileURLToPath}from'node:url';
const run=promisify(execFile),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),base=process.env.API_URL||'http://127.0.0.1:4000/api/v1',ports=[27017,27018,27019],png=await readFile(path.join(root,'tests/fixtures/test.png'));
async function mongo(port,code){const {stdout}=await run('mongosh',['--quiet',`mongodb://127.0.0.1:${port}/coleciona?directConnection=true`,'--eval',code],{timeout:8000});return stdout.trim()}
async function hello(port){try{return JSON.parse(await mongo(port,'print(JSON.stringify(db.hello()))'))}catch{return null}}
async function api(route,{method='GET',token,body,files}={}){let payload=body,headers={};if(token)headers.Authorization=`Bearer ${token}`;if(files){payload=new FormData();payload.append('dados',JSON.stringify(body));for(const file of files)payload.append('imagens',new Blob([file],{type:'image/png'}),'test.png')}else if(body){payload=JSON.stringify(body);headers['Content-Type']='application/json'}const response=await fetch(base+route,{method,headers,body:payload,signal:AbortSignal.timeout(6000)});const data=response.headers.get('content-type')?.includes('json')?await response.json():null;return {status:response.status,data:data?.data,error:data?.error}}
function required(result,status,label){if(result.status!==status)throw new Error(`${label}: esperado ${status}, recebido ${result.status} ${JSON.stringify(result.error)}`);return result.data}
async function waitFor(predicate,seconds=45){const end=Date.now()+seconds*1000;while(Date.now()<end){const value=await predicate();if(value)return value;await new Promise(r=>setTimeout(r,500))}throw new Error('Tempo de espera excedido')}
const started=new Date(),seed=Date.now(),user={nome:'Ensaio Primário',email:`failover${seed}@teste.local`,senha:'senha-forte-123'},other={nome:'Ensaio Terceiro',email:`outro${seed}@teste.local`,senha:'senha-forte-123'};
required(await api('/auth/cadastro',{method:'POST',body:user}),201,'cadastro');required(await api('/auth/cadastro',{method:'POST',body:other}),201,'cadastro terceiro');
const token=required(await api('/auth/login',{method:'POST',body:user}),200,'login').token,otherToken=required(await api('/auth/login',{method:'POST',body:other}),200,'login terceiro').token;
const collection=required(await api('/colecoes',{method:'POST',token,body:{nome:'Ensaio RNF09',visibilidade:'publica'}}),201,'coleção');
const privateItem=required(await api(`/colecoes/${collection.id}/itens`,{method:'POST',token,body:{nome:'Segredo RNF10',visibilidade:'privada'},files:[png]}),201,'item privado');
const publicItem=required(await api(`/colecoes/${collection.id}/itens`,{method:'POST',token,body:{nome:'Escrita RNF09',visibilidade:'publica'},files:[png]}),201,'item público');
const initial=await Promise.all(ports.map(hello));if(initial.filter(x=>x?.isWritablePrimary).length!==1||initial.filter(x=>x?.secondary).length!==2)throw new Error('Replica set não está com 1 PRIMARY e 2 SECONDARY');
const primary=ports[initial.findIndex(x=>x.isWritablePrimary)],marker=`marker${seed}@teste.local`;
await mongo(primary,`db.getSiblingDB('coleciona').usuarios.insertOne({nome:'Marcador de maioria',email:'${marker}',senha_hash:'sem-login',tentativas_login:NumberInt(0),criado_em:new Date()},{writeConcern:{w:'majority'}});print('OK')`);
let stoppedPrimary=false,stoppedSecondary=null;const transient=[];let failoverMs,writeResumeMs,markerPreserved=false,privateProtected=false,secondaryWrite=false;
try{
  const stopAt=Date.now();await run(path.join(root,'database/stop-node.sh'),[String(primary)],{timeout:35000});stoppedPrimary=true;
  const nextPrimary=await waitFor(async()=>{const states=await Promise.all(ports.filter(p=>p!==primary).map(hello));const i=states.findIndex(x=>x?.isWritablePrimary);return i>=0?ports.filter(p=>p!==primary)[i]:null});failoverMs=Date.now()-stopAt;
  await waitFor(async()=>{try{const r=await api(`/itens/${publicItem.id}`,{method:'PATCH',token,body:{descricao:'Escrita após failover'}});if(r.status===200)return true;transient.push(r.status)}catch(error){transient.push(error.code||error.name)}return false});writeResumeMs=Date.now()-stopAt;
  markerPreserved=(await mongo(nextPrimary,`print(db.getSiblingDB('coleciona').usuarios.countDocuments({email:'${marker}'}))`))==='1';
  privateProtected=(await api(`/itens/${privateItem.id}`,{token:otherToken})).status===404;
  await run(path.join(root,'database/start-node.sh'),[String(primary)],{timeout:15000});stoppedPrimary=false;
  await waitFor(async()=> (await hello(primary))?.secondary===true);
  stoppedSecondary=primary;await run(path.join(root,'database/stop-node.sh'),[String(stoppedSecondary)],{timeout:35000});
  secondaryWrite=(await api(`/itens/${publicItem.id}`,{method:'PATCH',token,body:{descricao:'Escrita com secundário parado'}})).status===200;
  await run(path.join(root,'database/start-node.sh'),[String(stoppedSecondary)],{timeout:15000});stoppedSecondary=null;
  await waitFor(async()=>{const states=await Promise.all(ports.map(hello));return states.filter(x=>x?.isWritablePrimary).length===1&&states.filter(x=>x?.secondary).length===2});
  console.log(JSON.stringify({inicio:started.toISOString(),fim:new Date().toISOString(),uri:'mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona',primario_inicial:primary,novo_primario:nextPrimary,eleicao_ms:failoverMs,escrita_retomada_ms:writeResumeMs,respostas_transitorias:transient,marcador_majority_preservado:markerPreserved,item_privado_protegido:privateProtected,escrita_com_secundario_parado:secondaryWrite,tres_membros_saudaveis:true}));
}finally{if(stoppedPrimary)await run(path.join(root,'database/start-node.sh'),[String(primary)]).catch(console.error);if(stoppedSecondary)await run(path.join(root,'database/start-node.sh'),[String(stoppedSecondary)]).catch(console.error)}
