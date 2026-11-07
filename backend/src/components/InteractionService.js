const {fail}=require('../middleware/errorHandler');
const {page}=require('./validation');
const {serialize}=require('./Repositories/mongoClient');
const AccessControlService=require('./AccessControlService');
const InteractionRepository=require('./Repositories/InteractionRepository');
const access=new AccessControlService(),repo=new InteractionRepository();
async function visible(actor,id){const ctx=await access.context(id);if(!ctx||!await access.canViewItem(actor,id))fail(404,'NAO_ENCONTRADO','Item não encontrado.');return ctx.item}
async function interactable(actor,id,kind){const item=await visible(actor,id);if(!actor)fail(401,'NAO_AUTENTICADO','Autenticação necessária.');if(!await access.canInteract(actor,id,kind))fail(403,'INTERACAO_PROIBIDA','Interação não permitida neste item.');return item}
async function resumo(actor,id){await visible(actor,id);const {media,quantidade}=await repo.ratingSummary(id);return {media,quantidade}}
async function minhaAvaliacao(actor,id){await visible(actor,id);return serialize(await repo.rating(id,actor))}
async function avaliar(actor,id,body){const item=await interactable(actor,id,'avaliacao');const nota=body?.nota;if(!Number.isInteger(nota)||nota<1||nota>5)fail(422,'NOTA_INVALIDA','Nota deve ser inteira de 1 a 5.');return serialize(await repo.upsertRating(item,actor,nota))}
async function removerAvaliacao(actor,id){const mine=await repo.rating(id,actor);if(!mine)fail(404,'NAO_ENCONTRADO','Avaliação não encontrada.');await repo.deleteRating(id,actor)}
async function comentarios(actor,id,query){await visible(actor,id);const pg=page(query),result=await repo.comments(id,pg.skip,pg.tamanho);return {data:serialize(result.rows),meta:{pagina:pg.pagina,tamanho:pg.tamanho,total:result.total}}}
async function comentar(actor,id,body){const item=await interactable(actor,id,'comentario');const texto=body?.texto;if(typeof texto!=='string'||!texto.trim()||texto.length>1000)fail(422,'COMENTARIO_INVALIDO','Comentário deve ter 1 a 1000 caracteres.');return serialize(await repo.createComment(item,actor,texto.trim()))}
async function editarComentario(actor,id,body){const comment=await repo.comment(id);if(!comment)fail(404,'NAO_ENCONTRADO','Comentário não encontrado.');if(String(comment.usuario_id)!==actor)fail(403,'SEM_PERMISSAO','Comentário de outro usuário.');await visible(actor,comment.item_id);const texto=body?.texto;if(typeof texto!=='string'||!texto.trim()||texto.length>1000)fail(422,'COMENTARIO_INVALIDO','Comentário deve ter 1 a 1000 caracteres.');return serialize(await repo.updateComment(id,actor,texto.trim()))}
async function removerComentario(actor,id){const comment=await repo.comment(id);if(!comment)fail(404,'NAO_ENCONTRADO','Comentário não encontrado.');if(String(comment.usuario_id)!==actor)fail(403,'SEM_PERMISSAO','Comentário de outro usuário.');await repo.deleteComment(id,actor)}
async function minhas(actor,query){const pg=page(query),result=await repo.mine(actor,pg.skip,pg.tamanho);return {data:serialize(result.rows),meta:{pagina:pg.pagina,tamanho:pg.tamanho,total:result.total}}}
module.exports={resumo,minhaAvaliacao,avaliar,removerAvaliacao,comentarios,comentar,editarComentario,removerComentario,minhas};
