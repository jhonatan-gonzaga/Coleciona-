const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {ObjectId}=require('mongodb');
const database=`coleciona_image_test_${randomUUID().replaceAll('-','')}`;
process.env.MONGODB_DB=database;
const storage=fs.mkdtemp(path.join(os.tmpdir(),'coleciona-images-'));
const {db,connect}=require('./Repositories/mongoClient');
const images=require('./ImageService');
const catalog=require('./CatalogService');
test.after(async()=>{await (await connect()).close()});

async function fixture(){
  const owner=new ObjectId(),collection=new ObjectId(),item=new ObjectId(),now=new Date(),d=await db();
  await d.collection('colecoes').insertOne({_id:collection,usuario_id:owner,nome:'Teste',visibilidade:'publica',estado:'ativa',criado_em:now});
  await d.collection('itens').insertOne({_id:item,colecao_id:collection,usuario_id:owner,nome:'Teste',visibilidade:'publica',estado:'ativo',atributos:[],criado_em:now});
  const png=await fs.readFile(path.resolve(__dirname,'../../../tests/fixtures/test.png'));
  const file={buffer:png,size:png.length};
  const [image]=await images.prepare([file],owner,item,collection);
  await d.collection('imagens').insertOne(image);
  return {owner,collection,item,image,file,d};
}

test('galeria preserva imagem após falha e limita uploads concorrentes',async()=>{
  process.env.STORAGE_DIR=await storage;
  const {owner,item,image,file,d}=await fixture();
  try{
    await assert.rejects(images.remove(image),{code:'ULTIMA_IMAGEM'});
    await assert.rejects(images.reorder({_id:item},[String(image._id),String(image._id)]),{code:'ORDEM_INVALIDA'});
    const original=images.repo.replace;
    images.repo.replace=async()=>{throw new Error('Falha simulada do banco')};
    try{await assert.rejects(images.replace(image,file),/Falha simulada/)}finally{images.repo.replace=original}
    assert.equal((await d.collection('imagens').findOne({_id:image._id})).caminho,image.caminho);
    await fs.access(path.join(await storage,image.caminho));
    for(let i=0;i<3;i++)await images.add({_id:item,usuario_id:owner,colecao_id:image.colecao_id},[file]);
    const results=await Promise.allSettled([images.add({_id:item,usuario_id:owner,colecao_id:image.colecao_id},[file]),images.add({_id:item,usuario_id:owner,colecao_id:image.colecao_id},[file])]);
    assert.deepEqual(results.map(x=>x.status).sort(),['fulfilled','rejected']);
    assert.equal(await d.collection('imagens').countDocuments({item_id:item,estado:'ativa'}),5);
    const remaining=await images.repo.byItem(item);
    assert.deepEqual(remaining.map(x=>x.ordem),[0,1,2,3,4]);
  }finally{await (await connect()).db(database).dropDatabase();await fs.rm(await storage,{recursive:true,force:true})}
});

test('cascata interrompida bloqueia item e retoma sem órfãos',async()=>{
  process.env.STORAGE_DIR=await storage;
  const {owner,collection,item,image,d}=await fixture();
  try{
    await d.collection('avaliacoes').insertOne({colecao_id:collection,item_id:item,usuario_id:new ObjectId(),nota:5});
    await d.collection('comentarios').insertOne({colecao_id:collection,item_id:item,usuario_id:new ObjectId(),texto:'Teste'});
    const blocker=path.join(await storage,'bloqueio');await fs.writeFile(blocker,'não é diretório');
    process.env.STORAGE_DIR=blocker;
    await assert.rejects(catalog.deleteItem(String(owner),String(item)),{code:'ENOTDIR'});
    assert.equal((await d.collection('itens').findOne({_id:item})).estado,'em_exclusao');
    await assert.rejects(catalog.addImages(String(owner),String(item),[]),{code:'EM_EXCLUSAO'});
    process.env.STORAGE_DIR=await storage;
    await catalog.resumeDeletions();
    for(const name of ['itens','imagens','avaliacoes','comentarios'])assert.equal(await d.collection(name).countDocuments(name==='itens'?{_id:item}:{item_id:item}),0);
    await assert.rejects(fs.access(path.join(await storage,image.caminho)),{code:'ENOENT'});
  }finally{process.env.STORAGE_DIR=await storage;await (await connect()).db(database).dropDatabase();await fs.rm(await storage,{recursive:true,force:true})}
});

test('cascata de coleção interrompida retoma dependentes',async()=>{
  process.env.STORAGE_DIR=await storage;
  const {owner,collection,item,image,d}=await fixture();
  try{
    await d.collection('comentarios').insertOne({colecao_id:collection,item_id:item,usuario_id:new ObjectId(),texto:'Teste'});
    const blocker=path.join(await storage,'bloqueio');await fs.writeFile(blocker,'não é diretório');
    process.env.STORAGE_DIR=blocker;
    await assert.rejects(catalog.deleteCollection(String(owner),String(collection)),{code:'ENOTDIR'});
    assert.equal((await d.collection('colecoes').findOne({_id:collection})).estado,'em_exclusao');
    await assert.rejects(catalog.createItem(String(owner),String(collection),{nome:'Novo'},[]),{code:'EM_EXCLUSAO'});
    process.env.STORAGE_DIR=await storage;
    await catalog.resumeDeletions();
    for(const name of ['colecoes','itens','imagens','comentarios'])assert.equal(await d.collection(name).countDocuments(name==='colecoes'?{_id:collection}:{colecao_id:collection}),0);
    await assert.rejects(fs.access(path.join(await storage,image.caminho)),{code:'ENOENT'});
  }finally{process.env.STORAGE_DIR=await storage;await (await connect()).db(database).dropDatabase();await fs.rm(await storage,{recursive:true,force:true})}
});

test('limpeza pendente após substituição preserva imagem nova',async()=>{
  process.env.STORAGE_DIR=await storage;
  const {image,file,d}=await fixture();
  try{
    const [fresh]=await images.prepare([file],image.usuario_id,image.item_id,image.colecao_id);
    await d.collection('imagens').updateOne({_id:image._id},{$set:{caminho:fresh.caminho,remocoes_pendentes:[image.caminho]}});
    await images.resume();
    const saved=await d.collection('imagens').findOne({_id:image._id});
    assert.equal(saved.caminho,fresh.caminho);
    assert.deepEqual(saved.remocoes_pendentes,[]);
    await fs.access(path.join(await storage,fresh.caminho));
    await assert.rejects(fs.access(path.join(await storage,image.caminho)),{code:'ENOENT'});
  }finally{await (await connect()).db(database).dropDatabase();await fs.rm(await storage,{recursive:true,force:true})}
});
