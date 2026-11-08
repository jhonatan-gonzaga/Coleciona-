const {MongoClient,ObjectId}=require('mongodb');
const bcrypt=require('bcryptjs');
const sharp=require('sharp');
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');

const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona';
const storage=path.resolve(__dirname,'../storage');
const uploads=path.join(storage,'uploads');
const stage=path.join(storage,'online-seed');
const creditsFile=path.join(storage,'online-image-credits.json');
const userAgent='ColecionaDemoSeeder/1.0 (educational local catalog)';
const accounts=[
  {nome:'Ana Filatelista',email:'ana.filatelia@coleciona.local',collections:[
    {name:'Selos postais',item:'Selo postal',query:'postage stamp',match:'postage|stamp|selo',exclude:'fire lookout|releasing|Mt Hood|no postage stamp|postcard',tags:['selos','filatelia']},
    {name:'Cartões postais',item:'Cartão postal',query:'postcard',match:'postcard|post card|carte postale',tags:['cartões postais','correspondência']}
  ]},
  {nome:'Bruno Numismata',email:'bruno.numismatica@coleciona.local',collections:[
    {name:'Moedas antigas',item:'Moeda',query:'coin',match:'coin|moeda|denarius|penny',tags:['moedas','numismática']},
    {name:'Cédulas do mundo',item:'Cédula',query:'banknote',match:'banknote|bank note|currency|dollar bill',tags:['cédulas','numismática']}
  ]},
  {nome:'Clara Naturalista',email:'clara.natureza@coleciona.local',collections:[
    {name:'Fósseis',item:'Fóssil',query:'trilobite fossil',match:'trilobite',tags:['fósseis','natureza']},
    {name:'Minerais e cristais',item:'Mineral',query:'quartz crystal',match:'quartz|crystal|amethyst|geode|mineral',exclude:'^151 Quartz|Ice Crystal',tags:['minerais','cristais']}
  ]},
  {nome:'Diego Fotógrafo',email:'diego.fotografia@coleciona.local',collections:[
    {name:'Câmeras clássicas',item:'Câmera',query:'vintage camera',match:'camera',tags:['câmeras','fotografia']},
    {name:'Lentes fotográficas',item:'Lente',query:'camera lens',match:'lens|lente',tags:['lentes','fotografia']}
  ]},
  {nome:'Elisa Melômana',email:'elisa.musica@coleciona.local',collections:[
    {name:'Discos de vinil',item:'Disco de vinil',query:'vinyl record',match:'vinyl record|vinyl disc|record|turntable|lp',tags:['vinil','música']},
    {name:'Guitarras',item:'Guitarra',query:'guitar',match:'guitar|guitarra',tags:['guitarras','música']}
  ]},
  {nome:'Fábio Mobilidade',email:'fabio.transportes@coleciona.local',collections:[
    {name:'Carros clássicos',item:'Carro clássico',query:'classic car',match:'car|automobile|roadster',tags:['carros','transportes']},
    {name:'Bicicletas',item:'Bicicleta',query:'bicycle',match:'bicycle|bike|cycle',tags:['bicicletas','transportes']}
  ]}
];

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function clean(value,max=120){return String(value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').replace(/^File:/i,'').replace(/\.(jpe?g|png|webp)$/i,'').trim().slice(0,max)}
function demoAttributes(category,license,author){return [
  {chave:'categoria',rotulo:'Categoria',tipo:'opcao',valor:[category]},
  {chave:'licenca',rotulo:'Licença',tipo:'opcao',valor:[license.toUpperCase()]},
  {chave:'autor',rotulo:'Autor da imagem',tipo:'texto',valor:author}
]}

async function get(url,binary=false){
  for(let attempt=0;attempt<5;attempt++){
    try{
      const response=await fetch(url,{headers:{'User-Agent':userAgent},signal:AbortSignal.timeout(35000)});
      if(response.status===429||response.status>=500){
        const retry=Number(response.headers.get('retry-after'));
        await wait(Number.isFinite(retry)&&retry>0?Math.min(retry*1000,30000):2000*(attempt+1));
        continue;
      }
      if(!response.ok)throw Object.assign(new Error(`HTTP ${response.status}`),{permanent:response.status<500});
      return binary?Buffer.from(await response.arrayBuffer()):response.json();
    }catch(error){if(error.permanent||attempt===4)throw error;await wait(1500*(attempt+1))}
  }
  throw new Error(`Não foi possível acessar ${url}`);
}

async function search(topic,page){
  const url=new URL('https://api.openverse.org/v1/images/');
  for(const [key,value] of Object.entries({q:topic.query,page,page_size:20,license:'cc0,pdm',source:'flickr'}))url.searchParams.set(key,String(value));
  return (await get(url)).results||[];
}

function suitable(photo,topic,used){
  const title=clean(photo.title);
  const landing=photo.foreign_landing_url;
  return !used.has(photo.id)&&photo.source==='flickr'&&['cc0','pdm'].includes(photo.license)&&!photo.mature&&
    (photo.width||0)>=450&&(photo.height||0)>=350&&photo.thumbnail&&
    /^https:\/\//.test(landing||'')&&new RegExp(topic.match,'i').test(title)&&
    !/logo|diagram|icon|molecule|formula|map of|coat of arms|flag of/i.test(title)&&
    !(topic.exclude&&new RegExp(topic.exclude,'i').test(title));
}

async function download(photo){
  const url=new URL(photo.thumbnail);
  if(url.hostname!=='api.openverse.org')throw new Error('URL de miniatura inesperada');
  url.searchParams.set('full_size','true');
  const bytes=await get(url,true);
  const metadata=await sharp(bytes,{failOn:'error'}).metadata();
  if((metadata.width||0)<320||(metadata.height||0)<240)throw new Error('Imagem pequena');
  const image=await sharp(bytes,{failOn:'error'}).rotate().resize({width:960,height:960,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
  if(image.length>5*1024*1024)throw new Error('Imagem maior que 5 MiB');
  const filename=`${randomUUID()}.webp`;
  await fs.writeFile(path.join(stage,filename),image,{flag:'wx'});
  return {filename,bytes:image.length,sha256:createHash('sha256').update(image).digest('hex'),title:clean(photo.title),author:clean(photo.creator,100)||'Autor não informado',license:photo.license,source:photo.foreign_landing_url,openverse:photo.detail_url||`https://openverse.org/image/${photo.id}`};
}

async function prepare(){
  await fs.rm(stage,{recursive:true,force:true});
  await fs.mkdir(stage,{recursive:true});
  const used=new Set(),hashes=new Set(),collections=[];
  try{
    for(let accountIndex=0;accountIndex<accounts.length;accountIndex++)for(let collectionIndex=0;collectionIndex<2;collectionIndex++){
      const topic=accounts[accountIndex].collections[collectionIndex],photos=[];
      for(let page=1;photos.length<10&&page<=8;page++){
        const results=await search(topic,page);
        if(!results.length)break;
        for(const photo of results){
          if(photos.length===10)break;
          if(!suitable(photo,topic,used))continue;
          try{const saved=await download(photo);if(hashes.has(saved.sha256)){await fs.rm(path.join(stage,saved.filename));continue}photos.push(saved);used.add(photo.id);hashes.add(saved.sha256)}
          catch(error){console.warn(`Imagem ignorada (${topic.name}): ${error.message}`)}
          await wait(250);
        }
      }
      if(photos.length!==10)throw new Error(`${topic.name}: apenas ${photos.length} imagens válidas`);
      collections.push({accountIndex,collectionIndex,photos});
      console.log(`Preparado: ${topic.name} (${photos.length} imagens)`);
    }
    await fs.writeFile(path.join(stage,'manifest.json'),JSON.stringify({source:'Openverse / Flickr',createdAt:new Date().toISOString(),collections},null,2));
    console.log(JSON.stringify({status:'preparado',contas:accounts.length,colecoes:collections.length,itens:collections.reduce((n,c)=>n+c.photos.length,0),stage}));
  }catch(error){await fs.rm(stage,{recursive:true,force:true});throw error}
}

async function apply(){
  const manifest=JSON.parse(await fs.readFile(path.join(stage,'manifest.json'),'utf8'));
  if(manifest.collections?.length!==12||manifest.collections.some(c=>c.photos?.length!==10))throw new Error('Manifesto precisa ter 12 coleções com 10 imagens cada');
  await fs.mkdir(uploads,{recursive:true});
  const copied=[];
  let committed=false;
  try{
    for(const collection of manifest.collections)for(const photo of collection.photos){
      if(!/^[0-9a-f-]+\.webp$/.test(photo.filename))throw new Error('Nome de imagem inválido');
      const from=path.join(stage,photo.filename),to=path.join(uploads,photo.filename);
      const bytes=await fs.readFile(from);
      if(bytes.length!==photo.bytes||createHash('sha256').update(bytes).digest('hex')!==photo.sha256||(await sharp(bytes).metadata()).format!=='webp')throw new Error(`Imagem inválida: ${photo.filename}`);
      await fs.copyFile(from,to,fs.constants.COPYFILE_EXCL);copied.push(to);
    }
    const client=new MongoClient(uri,{serverSelectionTimeoutMS:5000});
    let oldImages=[];
    try{
      await client.connect();
      const db=client.db('coleciona');
      oldImages=await db.collection('imagens').find({},{projection:{caminho:1}}).toArray();
      const hash=await bcrypt.hash(process.env.SEED_PASSWORD||'coleciona-demo-123',12);
      const session=client.startSession();
      try{
        await session.withTransaction(async()=>{
          for(const name of ['avaliacoes','comentarios','imagens','itens','colecoes'])await db.collection(name).deleteMany({},{session});
          const now=new Date(),users=[];
          for(const account of accounts){
            await db.collection('usuarios').updateOne({email:account.email},{$set:{nome:account.nome,senha_hash:hash,tentativas_login:0,falhas_em:null,bloqueado_ate:null,atualizado_em:now},$setOnInsert:{criado_em:now}},{upsert:true,session});
            users.push(await db.collection('usuarios').findOne({email:account.email},{session}));
          }
          const collectionDocs=[],itemDocs=[],imageDocs=[];
          let order=0;
          for(const entry of manifest.collections){
            const topic=accounts[entry.accountIndex].collections[entry.collectionIndex],owner=users[entry.accountIndex],collectionId=new ObjectId();
            collectionDocs.push({_id:collectionId,usuario_id:owner._id,nome:topic.name,descricao:`Acervo demonstrativo de ${topic.name.toLowerCase()} com imagens abertas.`,visibilidade:'publica',estado:'ativa',criado_em:now,atualizado_em:now});
            for(let index=0;index<entry.photos.length;index++){
              const photo=entry.photos[index],itemId=new ObjectId(),title=`${topic.item} ${String(index+1).padStart(2,'0')} · ${photo.title}`.slice(0,100),created=new Date(now.getTime()+order++);
              itemDocs.push({_id:itemId,colecao_id:collectionId,usuario_id:owner._id,nome:title,descricao:`Imagem de ${photo.author} via Flickr (${photo.license.toUpperCase()}).`,visibilidade:'publica',estado:'ativo',atributos:demoAttributes(topic.name,photo.license,photo.author),etiquetas:topic.tags,favorito:false,criado_em:created,atualizado_em:now});
              imageDocs.push({_id:new ObjectId(),colecao_id:collectionId,item_id:itemId,usuario_id:owner._id,caminho:photo.filename,ordem:0,tipo_mime:'image/webp',tamanho_bytes:photo.bytes,estado:'ativa',remocoes_pendentes:[],origem_url:photo.source,origem_autor:photo.author,origem_licenca:photo.license,origem_titulo:photo.title,criado_em:now,atualizado_em:now});
            }
          }
          await db.collection('colecoes').insertMany(collectionDocs,{session});
          await db.collection('itens').insertMany(itemDocs,{session});
          await db.collection('imagens').insertMany(imageDocs,{session});
        });
        committed=true;
      }finally{await session.endSession()}
      const totals=await Promise.all(['colecoes','itens','imagens'].map(name=>db.collection(name).countDocuments({})));
      if(totals.join(',')!=='12,120,120')throw new Error(`Contagem inesperada após a carga: ${totals}`);
    }finally{await client.close()}
    try{await fs.writeFile(creditsFile,JSON.stringify({generatedAt:new Date().toISOString(),source:'https://openverse.org/',collections:manifest.collections.map(entry=>({account:accounts[entry.accountIndex].email,collection:accounts[entry.accountIndex].collections[entry.collectionIndex].name,photos:entry.photos}))},null,2))}catch(error){console.warn(`Créditos não salvos: ${error.message}`)}
    for(const image of oldImages)if(/^[0-9a-f-]+\.(jpg|png|webp)$/.test(image.caminho||''))try{await fs.rm(path.join(uploads,image.caminho),{force:true})}catch(error){console.warn(`Imagem antiga não removida: ${error.message}`)}
    try{await fs.rm(stage,{recursive:true,force:true})}catch(error){console.warn(`Área temporária não removida: ${error.message}`)}
    console.log(JSON.stringify({status:'aplicado',contas_novas:accounts.length,colecoes:12,itens:120,imagens:120,creditos:creditsFile}));
  }catch(error){
    if(!committed)await Promise.all(copied.map(file=>fs.rm(file,{force:true})));
    throw error;
  }
}

async function enrich(){
  const client=new MongoClient(uri,{serverSelectionTimeoutMS:5000});
  try{
    await client.connect();
    const db=client.db('coleciona');
    const users=await db.collection('usuarios').find({email:{$in:accounts.map(account=>account.email)}},{projection:{_id:1}}).toArray();
    const collections=await db.collection('colecoes').find({usuario_id:{$in:users.map(user=>user._id)},estado:'ativa'},{projection:{_id:1,nome:1}}).toArray();
    const names=new Map(collections.map(collection=>[String(collection._id),collection.nome]));
    const items=await db.collection('itens').find({colecao_id:{$in:collections.map(collection=>collection._id)},atributos:[]},{projection:{_id:1,colecao_id:1}}).toArray();
    const images=await db.collection('imagens').find({item_id:{$in:items.map(item=>item._id)},estado:'ativa',ordem:0},{projection:{item_id:1,origem_autor:1,origem_licenca:1}}).toArray();
    const imageByItem=new Map(images.map(image=>[String(image.item_id),image]));
    const updates=items.map(item=>{
      const image=imageByItem.get(String(item._id));
      if(!image?.origem_autor||!image?.origem_licenca)throw new Error(`Metadados incompletos no item ${item._id}`);
      return {updateOne:{filter:{_id:item._id,atributos:[]},update:{$set:{atributos:demoAttributes(names.get(String(item.colecao_id)),image.origem_licenca,image.origem_autor)}}}};
    });
    const updated=updates.length?(await db.collection('itens').bulkWrite(updates)).modifiedCount:0;
    console.log(JSON.stringify({status:'enriquecido',colecoes:collections.length,itens_atualizados:updated}));
  }finally{await client.close()}
}

async function main(){const command=process.argv[2];if(command==='prepare')await prepare();else if(command==='apply')await apply();else if(command==='run'){await prepare();await apply()}else if(command==='enrich')await enrich();else throw new Error('Use prepare, apply, run ou enrich')}
main().catch(error=>{console.error(error);process.exitCode=1});
