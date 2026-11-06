import React,{useEffect,useRef,useState} from 'react';
import {searchApi,compileFilters} from '../api/searchApi';
import SearchFilters from '../components/SearchFilters';
import ImageGallery from '../components/ImageGallery';

export default function ExploreScreen({navigate,onError}){
  const [collections,setCollections]=useState([]);
  const [collectionPage,setCollectionPage]=useState(1);
  const [collectionTotal,setCollectionTotal]=useState(0);
  const [items,setItems]=useState([]);
  const [available,setAvailable]=useState([]);
  const [filters,setFilters]=useState([]);
  const [appliedFilters,setAppliedFilters]=useState([]);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [query,setQuery]=useState('');
  const [appliedQuery,setAppliedQuery]=useState('');
  const collectionRequest=useRef(0);
  const itemRequest=useRef(0);

  async function loadCollections(nextPage=1,text=appliedQuery){
    const current=++collectionRequest.current;
    try{
      const result=await searchApi.explorar(nextPage,text);
      if(current!==collectionRequest.current)return;
      setCollections(result.data);
      setCollectionTotal(result.meta.total);
      setCollectionPage(nextPage);
    }catch(error){if(current===collectionRequest.current)onError(error)}
  }

  async function load(nextPage=1,nextFilters=appliedFilters,text=appliedQuery){
    const current=++itemRequest.current;
    try{
      const result=await searchApi.busca({escopo:'global',pagina:nextPage,texto:text,filtros:compileFilters(nextFilters)});
      if(current!==itemRequest.current)return;
      setItems(result.data);
      setTotal(result.meta.total);
      setPage(nextPage);
    }catch(error){if(current===itemRequest.current)onError(error)}
  }

  useEffect(()=>{
    loadCollections(1,'');
    searchApi.filtros('global').then(result=>setAvailable(result.data)).catch(onError);
    load(1,[],'');
  },[]);

  function search(text){
    const term=text.trim();
    setAppliedQuery(term);
    setQuery(term);
    loadCollections(1,term);
    load(1,appliedFilters,term);
  }

  return <>
    <div className="explore-hero">
      <p className="eyebrow">Descubra outros acervos</p>
      <h1>Peças com histórias.<br/>Detalhes que conectam.</h1>
      <p>Explore coleções públicas e encontre itens por nome ou por características criadas por seus donos.</p>
      <form className="name-search" role="search" onSubmit={event=>{event.preventDefault();search(query)}}>
        <label htmlFor="explore-name">Coleção, item, atributo ou valor</label>
        <div className="name-search-controls">
          <input id="explore-name" type="search" maxLength="100" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Ex.: selos, ano, Brasil, 1980"/>
          <button type="submit">Buscar</button>
          {appliedQuery&&<button type="button" className="subtle" onClick={()=>search('')}>Limpar</button>}
        </div>
      </form>
    </div>
    <div className="section-head"><h2>Coleções públicas</h2><span className="muted">{collectionTotal} no total</span></div>
    <div className="collection-strip">{collections.length?collections.map(collection=><div className="collection-chip" key={collection.id}><strong>{collection.nome}</strong><small>{collection.quantidade_itens} itens públicos</small></div>):<p className="muted">{appliedQuery?'Nenhuma coleção com esse nome.':'Ainda não há coleções públicas.'}</p>}</div>
    {collectionTotal>20&&<div className="pagination"><button disabled={collectionPage<=1} onClick={()=>loadCollections(collectionPage-1)}>Anterior</button><span>Página {collectionPage}</span><button disabled={collectionPage*20>=collectionTotal} onClick={()=>loadCollections(collectionPage+1)}>Próxima</button></div>}
    <div className="section-head"><h2>Itens para explorar</h2><span className="muted">{total} encontrados</span></div>
    <SearchFilters available={available} filters={filters} onChange={setFilters} onSubmit={next=>{const chosen=next||filters;setAppliedFilters(chosen);load(1,chosen,appliedQuery)}}/>
    {items.length?<div className="item-grid">{items.map(item=><article className="item-card" key={item.id}><div className="card-cover">{item.imagens?.[0]&&<ImageGallery images={[item.imagens[0]]} name={item.nome}/>}</div><div className="card-body"><small>{item.colecao_nome||'Coleção'} · {item.atributos?.length||0} atributos</small><h3>{item.nome}</h3><p>{item.descricao}</p><button className="subtle" onClick={()=>navigate('detalhe',{id:item.id})}>Ver detalhes →</button></div></article>)}</div>:<p className="empty">Nenhum item público encontrado.</p>}
    {total>20&&<div className="pagination"><button disabled={page<=1} onClick={()=>load(page-1,appliedFilters,appliedQuery)}>Anterior</button><span>Página {page}</span><button disabled={page*20>=total} onClick={()=>load(page+1,appliedFilters,appliedQuery)}>Próxima</button></div>}
  </>
}
