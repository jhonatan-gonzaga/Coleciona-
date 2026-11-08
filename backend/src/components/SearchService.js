const {fail}=require('../middleware/errorHandler');
const {page}=require('./validation');
const {oid,serialize}=require('./Repositories/mongoClient');
const SearchRepository=require('./Repositories/SearchRepository');
const CatalogRepository=require('./Repositories/CatalogRepository');
const AuthRepository=require('./Repositories/AuthRepository');
const AccessControlService=require('./AccessControlService');
const images=require('./ImageService');
const repo=new SearchRepository(),catalog=new CatalogRepository(),access=new AccessControlService(),users=new AuthRepository();
function scope(value,actor){if(!['global','minhas'].includes(value))fail(400,'ESCOPO_INVALIDO','Escopo deve ser global ou minhas.');if(value==='minhas'&&!actor)fail(401,'NAO_AUTENTICADO','Autenticação necessária.');return value}
function searchTerm(value){if(value===undefined)return '';if(typeof value!=='string'||value.trim().length>100)fail(400,'BUSCA_INVALIDA','A busca deve ter até 100 caracteres.');return value.trim()}
function namePattern(value){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function attributeValueMatch(pattern){return {$expr:{$anyElementTrue:{$map:{input:{$ifNull:['$atributos',[]]},as:'attribute',in:{$regexMatch:{input:{$convert:{input:'$$attribute.valor',to:'string',onError:'',onNull:''}},regex:pattern,options:'i'}}}}}}}
function textConditions(term,collectionIds){
  const pattern=namePattern(term),conditions=[
    {nome:{$regex:pattern,$options:'i'}},
    {colecao_id:{$in:collectionIds}},
    {'atributos.rotulo':{$regex:pattern,$options:'i'}},
    {'atributos.chave':{$regex:pattern,$options:'i'}},
    {'atributos.valor':{$regex:pattern,$options:'i'}},
    attributeValueMatch(pattern)
  ];
  const booleanTerm=term.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(booleanTerm==='sim'||booleanTerm==='nao')conditions.push({'atributos.valor':booleanTerm==='sim'});
  return {$or:conditions}
}
async function baseFilter(escopo,actor){if(escopo==='minhas')return {usuario_id:oid(actor),estado:'ativo'};return {estado:'ativo',visibilidade:'publica',colecao_id:{$in:await repo.publicCollectionIds()}}}
function validatedFilters(filters){if(!Array.isArray(filters)||filters.length>3)fail(400,'FILTROS_INVALIDOS','Envie até três filtros.');return filters.map(f=>{if(!f||typeof f!=='object'||Array.isArray(f)||typeof f.chave!=='string'||! /^[a-z0-9_]{1,50}$/.test(f.chave)||!['texto','numero','data','booleano','opcao'].includes(f.tipo))fail(400,'FILTROS_INVALIDOS','Chave ou tipo inválido.');const allowed=f.tipo==='numero'||f.tipo==='data'?['eq','in','gte','lte']:['eq','in'];if(!allowed.includes(f.operador))fail(400,'FILTROS_INVALIDOS','Operador inválido.');let values=f.operador==='in'?f.valor:[f.valor];if(!Array.isArray(values)||!values.length||values.length>50)fail(400,'FILTROS_INVALIDOS','Valor inválido.');values=values.map(v=>{if(f.tipo==='numero'){if(typeof v!=='number'||!Number.isFinite(v))fail(400,'FILTROS_INVALIDOS','Número inválido.');return v}if(f.tipo==='booleano'){if(typeof v!=='boolean')fail(400,'FILTROS_INVALIDOS','Booleano inválido.');return v}if(f.tipo==='data'){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v)))fail(400,'FILTROS_INVALIDOS','Data inválida.');return new Date(`${v}T00:00:00.000Z`)}if(typeof v!=='string'||v.length>500)fail(400,'FILTROS_INVALIDOS','Texto inválido.');return v});return {atributos:{$elemMatch:{chave:f.chave,tipo:f.tipo,valor:f.operador==='in'?{$in:values}:f.operador==='eq'?values[0]:{[`$${f.operador}`]:values[0]}}}}})}
async function explorar(query){
  const pg=page(query),term=searchTerm(query.q);
  let requestedFilters=[];
  if(query.filtros!==undefined){
    try{requestedFilters=JSON.parse(query.filtros)}catch{fail(400,'FILTROS_INVALIDOS','Filtros inválidos.');}
  }
  const conditions=validatedFilters(requestedFilters);
  let matchingIds=null;
  if(term||conditions.length){
    const publicIds=await repo.publicCollectionIds();
    const base={estado:'ativo',visibilidade:'publica',colecao_id:{$in:publicIds}};
    const [nameIds,itemIds,filteredIds]=await Promise.all([
      term?repo.collectionIdsByName('global',null,namePattern(term)):Promise.resolve([]),
      term?repo.matchingItemCollectionIds({...base,$and:[textConditions(term,[]),...conditions]}):Promise.resolve([]),
      conditions.length?repo.matchingItemCollectionIds({...base,$and:conditions}):Promise.resolve([])
    ]);
    const allowedByFilter=new Set(filteredIds.map(String));
    matchingIds=[...new Map([...nameIds.filter(id=>!conditions.length||allowedByFilter.has(String(id))),...itemIds,...(!term?filteredIds:[])].map(id=>[String(id),id])).values()];
  }
  const result=await repo.publicCollections(pg.skip,pg.tamanho,matchingIds);
  const current=await Promise.all(result.rows.map(collection=>catalog.collection(collection._id)));
  const publicRows=result.rows.filter((collection,index)=>current[index]?.estado==='ativa'&&current[index]?.visibilidade==='publica');
  const ids=publicRows.map(collection=>collection._id);
  const [owners,previews,counts]=await Promise.all([
    users.byIds([...new Map(publicRows.map(collection=>[String(collection.usuario_id),collection.usuario_id])).values()]),
    repo.publicCollectionPreviews(ids),
    Promise.all(ids.map(id=>repo.countPublicItems(id)))
  ]);
  const covers=await images.byItems(previews.map(preview=>preview.item_id));
  const ownerNames=new Map(owners.map(user=>[String(user._id),user.nome]));
  const previewItems=new Map(previews.map(preview=>[String(preview._id),preview.item_id]));
  const rows=publicRows.map((collection,index)=>({
    ...serialize(collection),dono_nome:ownerNames.get(String(collection.usuario_id)),
    quantidade_itens:counts[index],capa:covers.get(String(previewItems.get(String(collection._id))))?.[0]||null
  }));
  return {data:rows,meta:{pagina:pg.pagina,tamanho:pg.tamanho,total:result.total}}
}
async function filtros(escopo,actor){scope(escopo,actor);const rows=await repo.discover(await baseFilter(escopo,actor));return {data:rows.map(row=>({chave:row._id.chave,tipo:row._id.tipo,...(['texto','opcao','booleano'].includes(row._id.tipo)?{valores:row.valores.slice(0,100)}:{})}))}}
async function busca(body,actor){
  const escopo=scope(body?.escopo,actor),pg=page(body||{}),filter=await baseFilter(escopo,actor);
  const conditions=validatedFilters(body.filtros||[]),term=searchTerm(body.texto);
  if(body.colecao_id!==undefined){
    const id=typeof body.colecao_id==='string'?oid(body.colecao_id):null;
    if(!id)fail(400,'BUSCA_INVALIDA','Coleção inválida para esta busca.');
    filter.colecao_id=escopo==='minhas'?id:{$in:filter.colecao_id.$in.filter(publicId=>String(publicId)===String(id))};
  }
  if(term){
    const collectionIds=await repo.collectionIdsByName(escopo,actor,namePattern(term));
    conditions.push(textConditions(term,collectionIds));
  }
  if(conditions.length)filter.$and=conditions;
  const result=await repo.search(filter,pg.skip,pg.tamanho);
  const visible=await access.viewableItemIds(actor,result.rows,escopo);
  const allowed=result.rows.filter(item=>visible.has(String(item._id)));
  const [galleries,collections]=await Promise.all([
    images.byItems(allowed.map(item=>item._id)),
    repo.collectionNames([...new Map(allowed.map(item=>[String(item.colecao_id),item.colecao_id])).values()])
  ]);
  const owners=await users.byIds([...new Map(collections.map(collection=>[String(collection.usuario_id),collection.usuario_id])).values()]);
  const names=new Map(collections.map(collection=>[String(collection._id),collection]));
  const ownerNames=new Map(owners.map(user=>[String(user._id),user.nome]));
  const rows=allowed.map(item=>{const collection=names.get(String(item.colecao_id));return {...serialize(item),colecao_nome:collection?.nome,dono_nome:ownerNames.get(String(collection?.usuario_id)),imagens:galleries.get(String(item._id))||[]}});
  return {data:rows,meta:{pagina:pg.pagina,tamanho:pg.tamanho,total:result.total}}
}
module.exports={explorar,filtros,busca,validatedFilters};
