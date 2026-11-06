import React,{useState} from 'react';

const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');

function AttributePicker({available,filter,onSelect}){
  const [query,setQuery]=useState('');
  const selectedValue=filter.chave?`${filter.chave}|${filter.tipo}`:'';
  const term=normalize(query.trim());
  const matches=available.filter(attribute=>normalize(`${attribute.chave.replace(/_/g,' ')} ${attribute.tipo}`).includes(term));
  const selected=available.find(attribute=>`${attribute.chave}|${attribute.tipo}`===selectedValue);
  const options=selected&&!matches.includes(selected)?[selected,...matches]:matches;

  return <div className="attribute-picker">
    <label>Buscar atributo
      <input type="search" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{
        if(event.key==='Enter'&&term){event.preventDefault();if(matches.length){onSelect(matches[0]);setQuery('')}}
      }} placeholder="Digite o nome do atributo" autoComplete="off"/>
    </label>
    <label>Atributo
      <select required value={selectedValue} onChange={event=>{
        onSelect(available.find(attribute=>`${attribute.chave}|${attribute.tipo}`===event.target.value));
        setQuery('');
      }}>
        <option value="">Escolha um atributo</option>
        {options.map(attribute=><option key={`${attribute.chave}|${attribute.tipo}`} value={`${attribute.chave}|${attribute.tipo}`}>{attribute.chave.replace(/_/g,' ')} · {attribute.tipo}</option>)}
      </select>
    </label>
    {term&&!matches.length&&<small className="muted" role="status">Nenhum atributo encontrado.</small>}
  </div>
}

export default function SearchFilters({available,filters,onChange,onSubmit}){
  const add=()=>onChange([...filters,{chave:'',tipo:'texto',operador:'eq',valor:''}]);
  const set=(index,patch)=>onChange(filters.map((filter,i)=>i===index?{...filter,...patch}:filter));

  return <form className="panel filters" onSubmit={event=>{event.preventDefault();onSubmit()}}>
    <div className="section-head"><h3>Filtrar por atributos</h3><button type="button" className="subtle" disabled={filters.length>=3||!available.length} onClick={add}>+ Filtro</button></div>
    {filters.map((filter,index)=>{
      const attribute=available.find(item=>item.chave===filter.chave&&item.tipo===filter.tipo);
      return <div className="filter-row" key={`${filter.chave}|${filter.tipo}|${index}`}>
        <AttributePicker available={available} filter={filter} onSelect={item=>set(index,{chave:item?.chave||'',tipo:item?.tipo||'texto',operador:'eq',valor:''})}/>
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
        <button type="button" className="danger-link" onClick={()=>onChange(filters.filter((_,i)=>i!==index))}>Remover</button>
      </div>
    })}
    <div className="actions"><button type="submit">Buscar</button>{filters.length>0&&<button type="button" className="subtle" onClick={()=>{onChange([]);onSubmit([])}}>Limpar</button>}</div>
  </form>
}
