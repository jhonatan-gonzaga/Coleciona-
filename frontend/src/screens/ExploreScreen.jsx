import React,{useEffect,useRef,useState} from 'react';
import {searchApi,compileFilters} from '../api/searchApi';
import SearchFilters from '../components/SearchFilters';
import ImageGallery from '../components/ImageGallery';

export default function ExploreScreen({navigate,onError,collection}){
  const[collections,setCollections]=useState([]);
  const[collectionPage,setCollectionPage]=useState(1);
  const[collectionTotal,setCollectionTotal]=useState(0);
  const[collectionQuery,setCollectionQuery]=useState('');
  const[appliedCollectionQuery,setAppliedCollectionQuery]=useState('');
  const[items,setItems]=useState([]);
  const[available,setAvailable]=useState([]);
  const[filters,setFilters]=useState([]);
  const[appliedFilters,setAppliedFilters]=useState([]);
  const[itemPage,setItemPage]=useState(1);
  const[itemTotal,setItemTotal]=useState(0);
  const[itemQuery,setItemQuery]=useState('');
  const[appliedItemQuery,setAppliedItemQuery]=useState('');
  const collectionRequest=useRef(0);
  const itemRequest=useRef(0);

  async function loadCollections(page=1,text=appliedCollectionQuery){
    const current=++collectionRequest.current;
    try{
      const result=await searchApi.explorar(page,text);
      if(current!==collectionRequest.current)return;
      setCollections(result.data);
      setCollectionTotal(result.meta.total);
      setCollectionPage(page);
    }catch(error){if(current===collectionRequest.current)onError(error)}
  }

  async function loadItems(target,page=1,nextFilters=appliedFilters,text=appliedItemQuery){
    if(!target)return;
    const current=++itemRequest.current;
    try{
      const result=await searchApi.busca({escopo:'global',colecao_id:target.id,pagina:page,texto:text,filtros:compileFilters(nextFilters)});
      if(current!==itemRequest.current)return;
      setItems(result.data);
      setItemTotal(result.meta.total);
      setItemPage(page);
    }catch(error){if(current===itemRequest.current)onError(error)}
  }

  useEffect(()=>{loadCollections(1,'')},[]);
  useEffect(()=>{
    itemRequest.current++;
    if(!collection)return;
    setFilters([]);setAppliedFilters([]);setItemQuery('');setAppliedItemQuery('');
    searchApi.filtros('global').then(result=>setAvailable(result.data)).catch(onError);
    loadItems(collection,1,[],'');
  },[collection?.id]);

  function searchCollections(text){
    const term=text.trim();
    setCollectionQuery(term);
    setAppliedCollectionQuery(term);
    loadCollections(1,term);
  }

  function searchItems(text){
    const term=text.trim();
    setItemQuery(term);
    setAppliedItemQuery(term);
    loadItems(collection,1,appliedFilters,term);
  }

  function applyFilters(next=filters){
    setAppliedFilters(next);
    loadItems(collection,1,next,appliedItemQuery);
  }

  if(collection)return <>
    <button className="subtle back" onClick={()=>navigate('explorar')}>← Todas as coleções</button>
    <div className="collection-detail-heading">
      <div><p className="eyebrow">{collection.dono_nome?`Acervo de ${collection.dono_nome}`:'Coleção pública'}</p><h1>{collection.nome}</h1><p>{collection.descricao}</p></div>
      <span>{collection.quantidade_itens} itens públicos</span>
    </div>
    <form className="name-search panel collection-item-search" role="search" onSubmit={event=>{event.preventDefault();searchItems(itemQuery)}}>
      <label htmlFor="collection-item-search">Buscar nesta coleção</label>
      <div className="name-search-controls">
        <input id="collection-item-search" type="search" maxLength="100" value={itemQuery} onChange={event=>setItemQuery(event.target.value)} placeholder="Item, atributo ou valor"/>
        <button type="submit">Buscar</button>
        {appliedItemQuery&&<button type="button" className="subtle" onClick={()=>searchItems('')}>Limpar</button>}
      </div>
    </form>
    <div className="section-head"><h2>Itens da coleção</h2><span className="muted">{itemTotal} encontrados</span></div>
    <SearchFilters available={available} filters={filters} onChange={setFilters} onSubmit={applyFilters}/>
    {items.length?<div className="item-grid">{items.map(item=><article className="item-card" key={item.id}>
      <div className="card-cover">{item.imagens?.[0]&&<ImageGallery images={[item.imagens[0]]} name={item.nome}/>}</div>
      <div className="card-body"><small>{item.atributos?.length||0} atributos</small><h3>{item.nome}</h3><p>{item.descricao}</p><button className="subtle" onClick={()=>navigate('detalhe',{id:item.id,fromCollection:collection})}>Ver detalhes →</button></div>
    </article>)}</div>:<p className="empty">Nenhum item encontrado nesta coleção.</p>}
    {itemTotal>20&&<div className="pagination"><button disabled={itemPage<=1} onClick={()=>loadItems(collection,itemPage-1)}>Anterior</button><span>Página {itemPage}</span><button disabled={itemPage*20>=itemTotal} onClick={()=>loadItems(collection,itemPage+1)}>Próxima</button></div>}
  </>;

  const featured=collections.find(entry=>entry.capa);
  return <>
    <div className="explore-hero">
      <div className="hero-copy">
        <p className="eyebrow">Acervos abertos</p>
        <h1>Peças guardadas.<br/>Histórias em circulação.</h1>
        <p>Explore coleções públicas pelo nome ou por um item e seus detalhes.</p>
        <form className="name-search" role="search" onSubmit={event=>{event.preventDefault();searchCollections(collectionQuery)}}>
          <label htmlFor="explore-name">O que você procura?</label>
          <div className="name-search-controls">
            <input id="explore-name" type="search" maxLength="100" value={collectionQuery} onChange={event=>setCollectionQuery(event.target.value)} placeholder="Coleção, item, atributo ou valor"/>
            <button type="submit">Buscar</button>
            {appliedCollectionQuery&&<button type="button" className="subtle" onClick={()=>searchCollections('')}>Limpar</button>}
          </div>
        </form>
      </div>
      <div className="hero-feature">
        {featured?<button type="button" className="hero-feature-link" onClick={()=>navigate('explorar',{collection:featured})}>
          <div className="hero-feature-photo"><ImageGallery images={[featured.capa]} name={featured.nome}/></div>
          <span>Coleção em destaque</span><strong>{featured.nome}</strong><small>{featured.dono_nome&&`Por ${featured.dono_nome} · `}{featured.quantidade_itens} itens</small>
        </button>:<div className="hero-feature-empty"><strong>Um lugar para cada descoberta.</strong><span>As coleções públicas aparecem aqui quando são cadastradas.</span></div>}
      </div>
    </div>
    <div className="section-head"><h2>Coleções para explorar</h2><span className="muted">{collectionTotal} encontradas</span></div>
    {collections.length?<div className="explore-collection-grid">{collections.map(entry=><article className="explore-collection-card" key={entry.id}>
      <div className="collection-card-cover">{entry.capa?<ImageGallery images={[entry.capa]} name={entry.nome}/>:<div className="image-placeholder">Sem foto</div>}</div>
      <div className="collection-card-body"><small>{entry.dono_nome?`Por ${entry.dono_nome}`:'Acervo público'} · {entry.quantidade_itens} itens</small><h3>{entry.nome}</h3><p>{entry.descricao}</p><button type="button" className="subtle" onClick={()=>navigate('explorar',{collection:entry})}>Ver coleção →</button></div>
    </article>)}</div>:<p className="empty">{appliedCollectionQuery?'Nenhuma coleção encontrada para esta busca.':'Ainda não há coleções públicas.'}</p>}
    {collectionTotal>20&&<div className="pagination"><button disabled={collectionPage<=1} onClick={()=>loadCollections(collectionPage-1)}>Anterior</button><span>Página {collectionPage}</span><button disabled={collectionPage*20>=collectionTotal} onClick={()=>loadCollections(collectionPage+1)}>Próxima</button></div>}
  </>;
}
