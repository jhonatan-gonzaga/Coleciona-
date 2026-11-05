const CatalogRepository=require('./Repositories/CatalogRepository');
const repo=new CatalogRepository();
class AccessControlService {
  async context(itemId){const item=await repo.item(itemId);if(!item||item.estado!=='ativo')return null;const collection=await repo.collection(item.colecao_id);if(!collection||collection.estado!=='ativa')return null;return {item,collection}}
  async canViewItem(actorId,itemId){const ctx=await this.context(itemId);if(!ctx)return false;return !!(actorId&&String(ctx.item.usuario_id)===String(actorId))||(ctx.collection.visibilidade==='publica'&&ctx.item.visibilidade==='publica')}
  async canInteract(actorId,itemId,kind){if(!actorId)return false;const ctx=await this.context(itemId);if(!ctx||ctx.collection.visibilidade!=='publica'||ctx.item.visibilidade!=='publica')return false;return kind==='comentario'||String(ctx.item.usuario_id)!==String(actorId)}
  async canEdit(actorId,resource){return !!actorId&&!!resource&&resource.estado!=='em_exclusao'&&String(resource.usuario_id)===String(actorId)}
}
module.exports=AccessControlService;
