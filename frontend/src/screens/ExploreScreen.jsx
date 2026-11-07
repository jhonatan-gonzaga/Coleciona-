import React,{useEffect,useRef,useState} from 'react';
import {searchApi,compileFilters} from '../api/searchApi';
import SearchFilters from '../components/SearchFilters';
import ImageGallery from '../components/ImageGallery';

export default function ExploreScreen({navigate,onError}){
  const [items,setItems]=useState([]);
  const [available,setAvailable]=useState([]);
  const [filters,setFilters]=useState([]);
  const [appliedFilters,setAppliedFilters]=useState([]);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [query,setQuery]=useState('');
  const [appliedQuery,setAppliedQuery]=useState('');
  const itemRequest=useRef(0);

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
    searchApi.filtros('global').then(result=>setAvailable(result.data)).catch(onError);
    load(1,[],'');
  },[]);

  function search(text){
    const term=text.trim();
    setAppliedQuery(term);
    setQuery(term);
    load(1,appliedFilters,term);
  }

  const featured=items.find(item=>item.imagens?.[0]);

  return <>
    <div className="explore-hero">
      <div className="hero-copy">
        <p className="eyebrow">Acervos abertos</p>
        <h1>Peças guardadas.<br/>Histórias em circulação.</h1>
        <p>Encontre objetos por nome, coleção ou qualquer detalhe registrado por quem os guarda.</p>
        <form className="name-search" role="search" onSubmit={event=>{event.preventDefault();search(query)}}>
          <label htmlFor="explore-name">O que você procura?</label>
          <div className="name-search-controls">
            <input id="explore-name" type="search" maxLength="100" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Nome, coleção, atributo ou valor"/>
            <button type="submit">Buscar</button>
            {appliedQuery&&<button type="button" className="subtle" onClick={()=>search('')}>Limpar</button>}
          </div>
        </form>
      </div>
      <div className="hero-feature">
        {featured?<button type="button" className="hero-feature-link" onClick={()=>navigate('detalhe',{id:featured.id})}>
          <div className="hero-feature-photo"><ImageGallery images={[featured.imagens[0]]} name={featured.nome}/></div>
          <span>Uma peça do acervo</span><strong>{featured.nome}</strong><small>{featured.colecao_nome}{featured.dono_nome&&` · por ${featured.dono_nome}`}</small>
        </button>:<div className="hero-feature-empty"><strong>Um lugar para cada descoberta.</strong><span>Os itens públicos aparecem aqui quando são cadastrados.</span></div>}
      </div>
    </div>
    <div className="section-head"><h2>Itens para explorar</h2><span className="muted">{total} encontrados</span></div>
    <SearchFilters available={available} filters={filters} onChange={setFilters} onSubmit={next=>{const chosen=next||filters;setAppliedFilters(chosen);load(1,chosen,appliedQuery)}}/>
    {items.length?<div className="item-grid">{items.map(item=><article className="item-card" key={item.id}><div className="card-cover">{item.imagens?.[0]&&<ImageGallery images={[item.imagens[0]]} name={item.nome}/>}</div><div className="card-body"><small>{item.colecao_nome||'Coleção'}{item.dono_nome&&` · por ${item.dono_nome}`} · {item.atributos?.length||0} atributos</small><h3>{item.nome}</h3><p>{item.descricao}</p><button className="subtle" onClick={()=>navigate('detalhe',{id:item.id})}>Ver detalhes →</button></div></article>)}</div>:<p className="empty">Nenhum item público encontrado.</p>}
    {total>20&&<div className="pagination"><button disabled={page<=1} onClick={()=>load(page-1,appliedFilters,appliedQuery)}>Anterior</button><span>Página {page}</span><button disabled={page*20>=total} onClick={()=>load(page+1,appliedFilters,appliedQuery)}>Próxima</button></div>}
  </>
}
