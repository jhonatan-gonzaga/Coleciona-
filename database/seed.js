const {MongoClient,ObjectId}=require('mongodb');
const bcrypt=require('bcryptjs');
const sharp=require('sharp');
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const sources=require('./assets/demo/sources.json');

const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona';
const storage=path.resolve(__dirname,'../storage/uploads');
const assets=path.join(__dirname,'assets/demo');

async function imageAsset(key){
  const source=sources[key];
  if(!source)throw new Error(`Fonte da imagem não encontrada: ${key}`);
  const bytes=await fs.readFile(path.join(assets,`${key}.webp`));
  const {format,width,height}=await sharp(bytes,{failOn:'error'}).metadata();
  if(format!=='webp'||!width||!height||width>6000||height>6000||bytes.length>5*1024*1024)throw new Error(`Imagem demonstrativa inválida: ${key}`);
  return {bytes,source};
}

async function isOldPlaceholder(image){
  if(image.tipo_mime!=='image/png'||image.tamanho_bytes>1000)return false;
  try{
    const metadata=await sharp(path.join(storage,image.caminho)).metadata();
    return metadata.width===16&&metadata.height===16;
  }catch{return false}
}

async function main(){
  const client=new MongoClient(uri);
  await client.connect();
  try{
    const d=client.db('coleciona'),now=new Date();
    await fs.mkdir(storage,{recursive:true});
    const password=process.env.SEED_PASSWORD||'coleciona-demo-123';
    const hash=await bcrypt.hash(password,12);
    async function user(nome,email){
      await d.collection('usuarios').updateOne({email},{$setOnInsert:{nome,email,senha_hash:hash,controle_login:{falhas_em:[],bloqueado_ate:null,versao:0},criado_em:now,atualizado_em:now}},{upsert:true});
      return d.collection('usuarios').findOne({email});
    }
    const ana=await user('Ana Colecionadora','ana.demo@coleciona.local');
    const bruno=await user('Bruno Colecionador','bruno.demo@coleciona.local');
    async function collection(owner,name,visibility){
      const seed_tag=`demo:${name}`;
      await d.collection('colecoes').updateOne({seed_tag},{$setOnInsert:{usuario_id:owner._id,nome:name,descricao:'Coleção demonstrativa',visibilidade:visibility,estado:'ativa',criado_em:now,atualizado_em:now}},{upsert:true});
      return d.collection('colecoes').findOne({seed_tag});
    }
    const open=await collection(ana,'Objetos curiosos','publica');
    const closed=await collection(ana,'Memórias privadas','privada');
    const other=await collection(bruno,'Computadores antigos','publica');
    let inserted=0,replaced=0;
    async function item(c,name,visibility,attributes,keys){
      const seed_tag=`demo:${name}`;
      await d.collection('itens').updateOne({seed_tag},{$setOnInsert:{colecao_id:c._id,usuario_id:c.usuario_id,nome:name,descricao:`Exemplo de ${name.toLowerCase()}`,visibilidade:visibility,estado:'ativo',atributos:attributes,etiquetas:['demonstração'],favorito:false,criado_em:now,atualizado_em:now}},{upsert:true});
      const doc=await d.collection('itens').findOne({seed_tag});
      const images=d.collection('imagens');
      const active=await images.find({item_id:doc._id,estado:'ativa'}).sort({ordem:1}).toArray();
      for(let index=0;index<keys.length;index++){
        const key=keys[index],old=active[index];
        if(old?.seed_tag===`demo:${key}`)continue;
        if(old&&!await isOldPlaceholder(old))continue; // preserva fotos enviadas pelo usuário
        const {bytes,source}=await imageAsset(key);
        const filename=`${randomUUID()}.webp`;
        await fs.writeFile(path.join(storage,filename),bytes,{flag:'wx'});
        const fields={caminho:filename,ordem:index,tipo_mime:'image/webp',tamanho_bytes:bytes.length,estado:'ativa',seed_tag:`demo:${key}`,origem_url:source.source,origem_autor:source.creator,origem_licenca:source.license,origem_titulo:source.title,atualizado_em:now};
        try{
          if(old){
            const result=await images.updateOne({_id:old._id,caminho:old.caminho,estado:'ativa'},{$set:fields,$addToSet:{remocoes_pendentes:old.caminho}});
            if(!result.matchedCount){await fs.rm(path.join(storage,filename));continue}
            replaced++;
            await fs.rm(path.join(storage,old.caminho),{force:true});
            await images.updateOne({_id:old._id},{$pull:{remocoes_pendentes:old.caminho}});
          }else{
            await images.insertOne({_id:new ObjectId(),colecao_id:c._id,item_id:doc._id,usuario_id:c.usuario_id,remocoes_pendentes:[],criado_em:now,...fields});
            inserted++;
          }
        }catch(error){
          const saved=await images.findOne({item_id:doc._id,caminho:filename});
          if(!saved)await fs.rm(path.join(storage,filename),{force:true});
          throw error;
        }
      }
      return doc;
    }
    const selo=await item(open,'Selo comemorativo','publica',[{chave:'ano',rotulo:'Ano',tipo:'numero',valor:1980},{chave:'pais',rotulo:'País',tipo:'texto',valor:'Brasil'}],['selo-1','selo-2']);
    await item(open,'Carta rara','privada',[{chave:'edicao',rotulo:'Edição',tipo:'texto',valor:'Primeira'}],['carta-1']);
    await item(closed,'Foto de família','publica',[{chave:'ano',rotulo:'Ano',tipo:'numero',valor:1974}],['familia-1']);
    await item(other,'Placa de vídeo','publica',[{chave:'vram_gb',rotulo:'VRAM (GB)',tipo:'numero',valor:8},{chave:'fabricante',rotulo:'Fabricante',tipo:'texto',valor:'Exemplo'}],['placa-video-1','placa-video-2','placa-video-3','placa-video-4','placa-video-5']);
    await d.collection('avaliacoes').updateOne({item_id:selo._id,usuario_id:bruno._id},{$setOnInsert:{colecao_id:open._id,nota:5,criado_em:now,atualizado_em:now}},{upsert:true});
    await d.collection('comentarios').updateOne({seed_tag:'demo:comentario'},{$setOnInsert:{colecao_id:open._id,item_id:selo._id,usuario_id:bruno._id,texto:'Peça muito interessante.',criado_em:now,atualizado_em:now}},{upsert:true});
    console.log(JSON.stringify({usuarios:[ana.email,bruno.email],senha_demo:password,colecoes:3,itens:4,imagens:9,inseridas:inserted,substituidas:replaced}));
  }finally{await client.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
