const CatalogRepository=require('./Repositories/CatalogRepository');
class AccessControlService {
  constructor(repo=new CatalogRepository()){this.repo=repo}
  async context(itemId){const item=await this.repo.item(itemId);if(!item||item.estado!=='ativo')return null;const collection=await this.repo.collection(item.colecao_id);if(!collection||collection.estado!=='ativa')return null;return {item,collection}}
  async canViewItem(actorId,itemId){const ctx=await this.context(itemId);if(!ctx)return false;return !!(actorId&&String(ctx.item.usuario_id)===String(actorId))||(ctx.collection.visibilidade==='publica'&&ctx.item.visibilidade==='publica')}
  async viewableItemIds(actorId,items,scope='global'){if(!items.length)return new Set();const ids=items.map(x=>x._id);if(scope==='minhas'){const current=await this.repo.activeItemsByIds(ids,{usuario_id:require('./Repositories/mongoClient').oid(actorId)});return new Set(current.map(x=>String(x._id)))}const [current,collections]=await Promise.all([this.repo.activeItemsByIds(ids,{visibilidade:'publica'}),this.repo.publicCollectionsByIds([...new Map(items.map(x=>[String(x.colecao_id),x.colecao_id])).values()])]);const allowedCollections=new Set(collections.map(x=>String(x._id)));return new Set(current.filter(x=>allowedCollections.has(String(x.colecao_id))).map(x=>String(x._id)))}
  async canInteract(actorId,itemId,kind){if(!actorId)return false;const ctx=await this.context(itemId);if(!ctx||ctx.collection.visibilidade!=='publica'||ctx.item.visibilidade!=='publica')return false;return kind==='comentario'||String(ctx.item.usuario_id)!==String(actorId)}
  async canEdit(actorId,resource){return !!actorId&&!!resource&&resource.estado!=='em_exclusao'&&String(resource.usuario_id)===String(actorId)}
}
module.exports=AccessControlService;
