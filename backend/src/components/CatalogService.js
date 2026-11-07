const {fail}=require('../middleware/errorHandler');
const {ObjectId,serialize}=require('./Repositories/mongoClient');
const CatalogRepository=require('./Repositories/CatalogRepository');
const SearchRepository=require('./Repositories/SearchRepository');
const AccessControlService=require('./AccessControlService');
const AuthRepository=require('./Repositories/AuthRepository');
const images=require('./ImageService');
const {page,itemFields,collectionFields}=require('./validation');
const repo=new CatalogRepository(),access=new AccessControlService(),users=new AuthRepository();
async function ownedCollection(actor,id){const c=await repo.collection(id);if(!c)fail(404,'NAO_ENCONTRADO','Coleção não encontrada.');if(!await access.canEdit(actor,c))fail(c.usuario_id.toString()===actor?409:403,c.estado==='em_exclusao'?'EM_EXCLUSAO':'SEM_PERMISSAO','Coleção indisponível.');return c}
async function ownedItem(actor,id){const item=await repo.item(id);if(!item)fail(404,'NAO_ENCONTRADO','Item não encontrado.');if(!await access.canEdit(actor,item))fail(item.usuario_id.toString()===actor?409:403,item.estado==='em_exclusao'?'EM_EXCLUSAO':'SEM_PERMISSAO','Item indisponível.');await ownedCollection(actor,item.colecao_id);return item}
async function myCollections(actor,query){const pg=page(query);if(query.q!==undefined&&(typeof query.q!=='string'||query.q.trim().length>100))fail(400,'BUSCA_INVALIDA','A busca deve ter até 100 caracteres.');const term=query.q?.trim()||'',pattern=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),result=await repo.myCollections(actor,pg.skip,pg.tamanho,pattern);const owner=await users.byId(actor);const rows=await Promise.all(result.rows.map(async c=>({...serialize(c),dono_nome:owner?.nome,quantidade_itens:await repo.countItems(c._id)})));return {data:rows,meta:{pagina:pg.pagina,tamanho:pg.tamanho,total:result.total}}}
async function suggestTags(actor,query){
  const prefix=query.q===undefined?'':query.q;
  if(typeof prefix!=='string'||prefix.trim().length>50)fail(400,'CONSULTA_INVALIDA','A busca deve ter até 50 caracteres.');
  if(!prefix.trim())return {data:[]};
  const rows=await repo.suggestTags(actor,prefix.trim());
  return {data:rows.map(row=>row.nome)}
}
async function createCollection(actor,body){const now=new Date(),doc={usuario_id:new ObjectId(actor),...collectionFields(body),estado:'ativa',criado_em:now,atualizado_em:now};const created=await repo.insertCollection(doc);SearchRepository.invalidate();return {...serialize(created),dono_nome:(await users.byId(actor))?.nome}}
async function updateCollection(actor,id,body){await ownedCollection(actor,id);const updated=await repo.updateCollection(id,actor,collectionFields(body,true));if(!updated)fail(409,'EM_EXCLUSAO','Coleção indisponível.');SearchRepository.invalidate();return {...serialize(updated),dono_nome:(await users.byId(actor))?.nome}}
async function collectionItems(actor,id,query){await ownedCollection(actor,id);const pg=page(query),result=await repo.itemsInCollection(id,pg.skip,pg.tamanho);return {data:await Promise.all(result.rows.map(presentItem)),meta:{pagina:pg.pagina,tamanho:pg.tamanho,total:result.total}}}
async function presentItem(item){const collection=await repo.collection(item.colecao_id);const [gallery,owner]=await Promise.all([images.byItem(item._id),collection?users.byId(collection.usuario_id):null]);return {...serialize(item),colecao_nome:collection?.nome,dono_nome:owner?.nome,imagens:gallery}}
async function createItem(actor,collectionId,body,files){const collection=await ownedCollection(actor,collectionId);if(!files?.length)fail(422,'IMAGEM_OBRIGATORIA','O item precisa de pelo menos uma imagem.');if(files.length>5)fail(409,'LIMITE_IMAGENS','Máximo de cinco imagens por item.');const now=new Date(),item={_id:new ObjectId(),colecao_id:collection._id,usuario_id:new ObjectId(actor),...itemFields(body),estado:'ativo',criado_em:now,atualizado_em:now};const docs=await images.prepare(files,item.usuario_id,item._id,collection._id);try{await repo.createItemAndImages(item,docs);SearchRepository.invalidate();return {...serialize(item),colecao_nome:collection.nome,dono_nome:(await users.byId(actor))?.nome,imagens:images.publicImages(docs)}}catch(error){await Promise.all(docs.map(x=>images.removeFile(x.caminho)));throw error}}
async function getItem(actor,id){const item=await repo.item(id);if(!item||!await access.canViewItem(actor,id))fail(404,'NAO_ENCONTRADO','Item não encontrado.');return presentItem(item)}
async function updateItem(actor,id,body){await ownedItem(actor,id);const updated=await repo.updateItem(id,actor,itemFields(body,true));if(!updated)fail(409,'EM_EXCLUSAO','Item indisponível.');SearchRepository.invalidate();return presentItem(updated)}
async function addImages(actor,id,files){const item=await ownedItem(actor,id);return images.add(item,files)}
async function getOwnedImage(actor,id){const image=await images.repo.byId(id);if(!image||image.estado!=='ativa')fail(404,'NAO_ENCONTRADO','Imagem não encontrada.');await ownedItem(actor,image.item_id);return image}
async function replaceImage(actor,id,file){const image=await getOwnedImage(actor,id);if(!file)fail(422,'IMAGEM_OBRIGATORIA','Envie uma imagem.');return images.replace(image,file)}
async function reorderImages(actor,id,ids){const item=await ownedItem(actor,id);return images.reorder(item,ids)}
async function removeImage(actor,id){const image=await getOwnedImage(actor,id);return images.remove(image)}
async function getImage(actor,id){const image=await images.repo.byId(id);if(!image||image.estado!=='ativa'||!await access.canViewItem(actor,image.item_id))fail(404,'NAO_ENCONTRADO','Imagem não encontrada.');return {bytes:await images.file(image),mime:image.tipo_mime}}
async function finishItem(item){await images.cleanupImages(await images.repo.allByItem(item._id));await repo.finishItemDeletion(item)}
async function deleteItem(actor,id){const item=await ownedItem(actor,id);const marked=await repo.markItemDeleting(id,actor);if(!marked)fail(409,'EM_EXCLUSAO','Item em exclusão.');SearchRepository.invalidate();await finishItem(marked)}
async function finishCollection(collection){await images.cleanupImages(await images.repo.byCollection(collection._id));await repo.finishCollectionDeletion(collection)}
async function deleteCollection(actor,id){await ownedCollection(actor,id);const marked=await repo.markCollectionDeleting(id,actor);if(!marked)fail(409,'EM_EXCLUSAO','Coleção em exclusão.');SearchRepository.invalidate();await finishCollection(marked)}
async function resumeDeletions(){for(const c of await repo.deletingCollections()){try{await finishCollection(c)}catch(error){console.error('Falha na cascata da coleção',error)}}for(const item of await repo.deletingItems()){try{await finishItem(item)}catch(error){console.error('Falha na cascata do item',error)}}await images.resume()}
module.exports={myCollections,suggestTags,createCollection,updateCollection,deleteCollection,collectionItems,createItem,getItem,updateItem,deleteItem,addImages,replaceImage,reorderImages,removeImage,getImage,resumeDeletions,repo,access};
