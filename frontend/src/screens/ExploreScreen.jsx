import React,{useEffect,useState}from'react';
import{searchApi,compileFilters}from'../api/searchApi';
import SearchFilters from'../components/SearchFilters';
import ImageGallery from'../components/ImageGallery';

export default function ExploreScreen({navigate,onError}){
  const[collections,setCollections]=useState([]),[collectionPage,setCollectionPage]=useState(1),[collectionTotal,setCollectionTotal]=useState(0);
  const[items,setItems]=useState([]),[available,setAvailable]=useState([]),[filters,setFilters]=useState([]),[page,setPage]=useState(1),[total,setTotal]=useState(0);
  async function loadCollections(p=1){try{const r=await searchApi.explorar(p);setCollections(r.data);setCollectionTotal(r.meta.total);setCollectionPage(p)}catch(error){onError(error)}}
  async function load(p=1,next=[]){try{const r=await searchApi.busca({escopo:'global',pagina:p,filtros:compileFilters(next)});setItems(r.data);setTotal(r.meta.total);setPage(p)}catch(error){onError(error)}}
  useEffect(()=>{loadCollections();searchApi.filtros('global').then(r=>setAvailable(r.data)).catch(onError);load()},[]);
  return <>
    <div className="explore-hero"><p className="eyebrow">Descubra outros acervos</p><h1>Peças com histórias.<br/>Detalhes que conectam.</h1><p>Explore coleções públicas e encontre itens por características criadas por seus donos.</p></div>
    <div className="section-head"><h2>Coleções públicas</h2><span className="muted">{collectionTotal} no total</span></div>
    <div className="collection-strip">{collections.length?collections.map(c=><div className="collection-chip" key={c.id}><strong>{c.nome}</strong><small>{c.quantidade_itens} itens públicos</small></div>):<p className="muted">Ainda não há coleções públicas.</p>}</div>
    {collectionTotal>20&&<div className="pagination"><button disabled={collectionPage<=1} onClick={()=>loadCollections(collectionPage-1)}>Anterior</button><span>Página {collectionPage}</span><button disabled={collectionPage*20>=collectionTotal} onClick={()=>loadCollections(collectionPage+1)}>Próxima</button></div>}
    <div className="section-head"><h2>Itens para explorar</h2><span className="muted">{total} encontrados</span></div>
    <SearchFilters available={available} filters={filters} onChange={setFilters} onSubmit={next=>load(1,next||filters)}/>
    {items.length?<div className="item-grid">{items.map(item=><article className="item-card" key={item.id}><div className="card-cover">{item.imagens?.[0]&&<ImageGallery images={[item.imagens[0]]} name={item.nome}/>}</div><div className="card-body"><small>{item.atributos?.length||0} atributos</small><h3>{item.nome}</h3><p>{item.descricao}</p><button className="subtle" onClick={()=>navigate('detalhe',{id:item.id})}>Ver detalhes →</button></div></article>)}</div>:<p className="empty">Nenhum item público encontrado.</p>}
    {total>20&&<div className="pagination"><button disabled={page<=1} onClick={()=>load(page-1,filters)}>Anterior</button><span>Página {page}</span><button disabled={page*20>=total} onClick={()=>load(page+1,filters)}>Próxima</button></div>}
  </>
}
