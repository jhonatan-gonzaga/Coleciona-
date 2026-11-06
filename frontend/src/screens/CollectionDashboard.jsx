import React,{useEffect,useRef,useState} from 'react';
import {catalogApi} from '../api/catalogApi';
import {searchApi,compileFilters} from '../api/searchApi';
import CollectionForm from '../components/CollectionForm';
import SearchFilters from '../components/SearchFilters';
import ImageGallery from '../components/ImageGallery';

export default function CollectionDashboard({navigate,onError}){
  const [collections,setCollections]=useState([]);
  const [collectionPage,setCollectionPage]=useState(1);
  const [collectionTotal,setCollectionTotal]=useState(0);
  const [selected,setSelected]=useState(null);
  const [items,setItems]=useState([]);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [form,setForm]=useState(undefined);
  const [busy,setBusy]=useState(false);
  const [available,setAvailable]=useState([]);
  const [filters,setFilters]=useState([]);
  const [appliedFilters,setAppliedFilters]=useState([]);
  const [query,setQuery]=useState('');
  const [appliedQuery,setAppliedQuery]=useState('');
  const collectionRequest=useRef(0);
  const itemRequest=useRef(0);

  async function loadCollections(text=appliedQuery,nextPage=1){
    const current=++collectionRequest.current;
    try{
      const result=await catalogApi.minhas(nextPage,text);
      if(current!==collectionRequest.current)return;
      setCollections(result.data);
      setCollectionTotal(result.meta.total);
      setCollectionPage(nextPage);
    }catch(error){if(current===collectionRequest.current)onError(error)}
  }

  async function loadItems(collectionId,nextPage=1){
    const current=++itemRequest.current;
    try{
      const result=await catalogApi.itens(collectionId,nextPage);
      if(current!==itemRequest.current)return;
      setItems(result.data);
      setTotal(result.meta.total);
      setPage(nextPage);
    }catch(error){if(current===itemRequest.current)onError(error)}
  }

  async function searchItems(nextFilters=appliedFilters,nextPage=1,text=appliedQuery,collection=selected){
    if(collection&&!nextFilters.length&&!text)return loadItems(collection.id,nextPage);
    const current=++itemRequest.current;
    try{
      const result=await searchApi.busca({escopo:'minhas',pagina:nextPage,colecao_id:collection?.id,texto:text,filtros:compileFilters(nextFilters)});
      if(current!==itemRequest.current)return;
      setItems(result.data);
      setTotal(result.meta.total);
      setPage(nextPage);
    }catch(error){if(current===itemRequest.current)onError(error)}
  }

  useEffect(()=>{
    loadCollections('',1);
    searchApi.filtros('minhas').then(result=>setAvailable(result.data)).catch(onError);
    searchItems([],1,'',null);
  },[]);

  function searchByName(value){
    const text=value.trim();
    setQuery(text);
    setAppliedQuery(text);
    setSelected(null);
    loadCollections(text,1);
    searchItems(appliedFilters,1,text,null);
  }

  function selectCollection(collection){
    setSelected(collection);
    setQuery('');
    setAppliedQuery('');
    setFilters([]);
    setAppliedFilters([]);
    loadCollections('',1);
    loadItems(collection.id,1);
  }

  async function save(body){
    setBusy(true);
    try{
      const result=form?.id?await catalogApi.editar(form.id,body):await catalogApi.criar(body);
      setForm(undefined);
      await loadCollections(appliedQuery,1);
      if(selected?.id===form?.id){setSelected({...selected,...result.data});await loadItems(selected.id,1)}
    }catch(error){onError(error)}finally{setBusy(false)}
  }

  async function removeCollection(collection){
    if(!window.confirm(`Excluir "${collection.nome}" e todos os itens, fotos e interações?`))return;
    try{
      await catalogApi.excluir(collection.id);
      setSelected(null);
      loadCollections(appliedQuery,1);
      await searchItems(appliedFilters,1,appliedQuery,null);
    }catch(error){onError(error)}
  }

  async function removeItem(item){
    if(!window.confirm(`Excluir o item "${item.nome}" e seus dados?`))return;
    try{
      await catalogApi.excluirItem(item.id);
      await searchItems(appliedFilters,1,appliedQuery,selected);
    }catch(error){onError(error)}
  }

  function applyFilters(next=filters){
    setAppliedFilters(next);
    searchItems(next,1,appliedQuery,selected);
  }

  return <>
    <div className="page-title"><div><p className="eyebrow">Acervo pessoal</p><h1>Minhas coleções</h1></div><button onClick={()=>setForm(null)}>+ Nova coleção</button></div>
    <form className="name-search panel" role="search" onSubmit={event=>{event.preventDefault();searchByName(query)}}>
      <label htmlFor="my-name-search">Coleção, item, atributo ou valor</label>
      <div className="name-search-controls">
        <input id="my-name-search" type="search" maxLength="100" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Ex.: moedas, país, Brasil, 1980"/>
        <button type="submit">Buscar</button>
        {appliedQuery&&<button type="button" className="subtle" onClick={()=>searchByName('')}>Limpar</button>}
      </div>
    </form>
    {form!==undefined&&<CollectionForm value={form} onSave={save} onCancel={()=>setForm(undefined)} busy={busy}/>}
    <div className="dashboard-layout">
      <aside className="collection-list">
        <h2>Coleções</h2>
        {collections.length===0?<p className="muted">{appliedQuery?'Nenhuma coleção com esse nome.':'Crie sua primeira coleção.'}</p>:collections.map(collection=><article className={`collection-row ${selected?.id===collection.id?'selected':''}`} key={collection.id}>
          <button className="row-main" onClick={()=>selectCollection(collection)}><strong>{collection.nome}</strong><small>{collection.quantidade_itens} itens · {collection.visibilidade}</small></button>
          <div className="actions"><button className="subtle" onClick={()=>setForm(collection)}>Editar</button><button className="danger-link" onClick={()=>removeCollection(collection)}>Excluir</button></div>
        </article>)}
        {collectionTotal>20&&<div className="pagination"><button disabled={collectionPage<=1} onClick={()=>loadCollections(appliedQuery,collectionPage-1)}>Anterior</button><span>Página {collectionPage}</span><button disabled={collectionPage*20>=collectionTotal} onClick={()=>loadCollections(appliedQuery,collectionPage+1)}>Próxima</button></div>}
      </aside>
      <section className="items-section">
        <div className="section-head"><div><p className="eyebrow">{selected?.visibilidade||'Seu acervo'}</p><h2>{selected?.nome||'Todos os itens'}</h2></div>{selected&&<button onClick={()=>navigate('editor',{collection:selected})}>+ Novo item</button>}</div>
        <SearchFilters available={available} filters={filters} onChange={setFilters} onSubmit={applyFilters}/>
        {items.length===0?<p className="empty">{selected?'Nenhum item nesta coleção.':appliedQuery?'Nenhum item encontrado.':'Selecione uma coleção ou use os filtros.'}</p>:<div className="item-grid">{items.map(item=><article className="item-card" key={item.id}>
          <div className="card-cover">{item.imagens?.[0]&&<ImageGallery images={[item.imagens[0]]} name={item.nome}/>}</div>
          <div className="card-body"><small>{item.colecao_nome||selected?.nome||'Coleção'} · {item.visibilidade} · {item.favorito?'favorito':'item'}</small><h3>{item.nome}</h3><p>{item.descricao}</p><div className="actions"><button className="subtle" onClick={()=>navigate('detalhe',{id:item.id})}>Abrir</button><button className="subtle" onClick={()=>navigate('editor',{collection:selected,itemId:item.id})}>Editar</button><button className="danger-link" onClick={()=>removeItem(item)}>Excluir</button></div></div>
        </article>)}</div>}
        {total>20&&<div className="pagination"><button disabled={page<=1} onClick={()=>searchItems(appliedFilters,page-1,appliedQuery,selected)}>Anterior</button><span>Página {page}</span><button disabled={page*20>=total} onClick={()=>searchItems(appliedFilters,page+1,appliedQuery,selected)}>Próxima</button></div>}
      </section>
    </div>
  </>
}
