import React,{useEffect,useRef,useState} from 'react';

const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');

function AttributePicker({available,filter,onSelect,index}){
  const [query,setQuery]=useState(filter.chave.replace(/_/g,' '));
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(0);
  const wrapper=useRef(null);
  const input=useRef(null);
  const term=normalize(query.trim());
  const matches=available.filter(attribute=>normalize(`${attribute.chave.replace(/_/g,' ')} ${attribute.tipo}`).includes(term)).slice(0,8);
  const listId=`attribute-suggestions-${index}`;
  const showOptions=open&&matches.length>0;
  const highlighted=matches.length?active%matches.length:0;

  useEffect(()=>{input.current?.setCustomValidity(filter.chave?'':'Selecione um atributo da lista de sugestões.')},[filter.chave]);

  function select(attribute){
    onSelect(attribute);
    setQuery(attribute.chave.replace(/_/g,' '));
    setOpen(false);
    setActive(0);
    input.current?.setCustomValidity('');
  }

  function change(value){
    setQuery(value);
    setActive(0);
    setOpen(true);
    if(filter.chave)onSelect(null);
  }

  function keyDown(event){
    if(event.key==='ArrowDown'&&showOptions){event.preventDefault();setActive(current=>(current+1)%matches.length)}
    else if(event.key==='ArrowDown'){event.preventDefault();setOpen(true)}
    else if(event.key==='ArrowUp'&&showOptions){event.preventDefault();setActive(current=>(current-1+matches.length)%matches.length)}
    else if(event.key==='Enter'){
      if(showOptions){event.preventDefault();select(matches[highlighted])}
      else if(!filter.chave)event.preventDefault();
    }else if(event.key==='Escape')setOpen(false);
  }

  return <div className="attribute-picker" ref={wrapper} onBlur={event=>{
    if(!wrapper.current?.contains(event.relatedTarget))setOpen(false);
  }}>
    <label>Atributo
      <input ref={input} required type="search" role="combobox" value={query} autoComplete="off"
        placeholder="Digite para buscar um atributo" aria-autocomplete="list"
        aria-expanded={showOptions} aria-controls={listId}
        aria-activedescendant={showOptions?`${listId}-${highlighted}`:undefined}
        onFocus={()=>setOpen(true)} onChange={event=>change(event.target.value)} onKeyDown={keyDown}/>
    </label>
    {showOptions&&<ul id={listId} className="attribute-suggestions" role="listbox" aria-label="Atributos existentes">
      {matches.map((attribute,optionIndex)=><li key={`${attribute.chave}|${attribute.tipo}`} id={`${listId}-${optionIndex}`} role="option" aria-selected={optionIndex===highlighted}>
        <button type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>select(attribute)}>{attribute.chave.replace(/_/g,' ')} <small>· {attribute.tipo}</small></button>
      </li>)}
    </ul>}
    {open&&term&&!matches.length&&<small className="muted" role="status">Nenhum atributo encontrado.</small>}
  </div>
}

export default function SearchFilters({available,filters,onChange,onSubmit}){
  const [rowsVersion,setRowsVersion]=useState(0);
  const add=()=>onChange([...filters,{chave:'',tipo:'texto',operador:'eq',valor:''}]);
  const set=(index,patch)=>onChange(filters.map((filter,i)=>i===index?{...filter,...patch}:filter));

  return <form className="panel filters" onSubmit={event=>{event.preventDefault();onSubmit()}}>
    <div className="section-head"><h3>Filtrar por atributos</h3><button type="button" className="subtle" disabled={filters.length>=3||!available.length} onClick={add}>+ Filtro</button></div>
    {filters.map((filter,index)=>{
      const attribute=available.find(item=>item.chave===filter.chave&&item.tipo===filter.tipo);
      return <div className="filter-row" key={`${rowsVersion}-${index}`}>
        <AttributePicker available={available} filter={filter} index={index} onSelect={item=>set(index,{chave:item?.chave||'',tipo:item?.tipo||'texto',operador:'eq',valor:''})}/>
        <label>Operador
          <select value={filter.operador} onChange={event=>set(index,{operador:event.target.value,valor:''})}>
            <option value="eq">Igual</option><option value="in">Um de</option>
            {['numero','data'].includes(filter.tipo)&&<><option value="gte">A partir de</option><option value="lte">Até</option></>}
          </select>
        </label>
        <label>Valor
          {filter.tipo==='booleano'?<select value={String(filter.valor)} onChange={event=>set(index,{valor:event.target.value==='true'})}><option value="">Selecione</option><option value="true">Sim</option><option value="false">Não</option></select>
          :filter.operador==='eq'&&attribute?.valores?<select value={filter.valor} onChange={event=>set(index,{valor:event.target.value})}><option value="">Selecione</option>{attribute.valores.map(value=><option key={String(value)} value={String(value)}>{String(value)}</option>)}</select>
          :<input required type={filter.operador==='in'?'text':filter.tipo==='numero'?'number':filter.tipo==='data'?'date':'text'} step={filter.tipo==='numero'?'any':undefined} value={filter.valor} onChange={event=>set(index,{valor:event.target.value})} placeholder={filter.operador==='in'?'Separe valores por vírgula':''}/>}
        </label>
        <button type="button" className="danger-link" onClick={()=>{setRowsVersion(version=>version+1);onChange(filters.filter((_,i)=>i!==index))}}>Remover</button>
      </div>
    })}
    <div className="actions"><button type="submit">Buscar</button>{filters.length>0&&<button type="button" className="subtle" onClick={()=>{onChange([]);onSubmit([])}}>Limpar</button>}</div>
  </form>
}
