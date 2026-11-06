import React,{useEffect,useRef,useState} from 'react';
import {catalogApi} from '../api/catalogApi';

const sameTag=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');

export default function TagInput({tags,draft,onTagsChange,onDraftChange}){
  const [suggestions,setSuggestions]=useState([]);
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(0);
  const wrapper=useRef(null);

  useEffect(()=>{
    const query=draft.trim();
    if(!query||tags.length>=20){setSuggestions([]);return}
    let current=true;
    const timer=setTimeout(()=>{
      catalogApi.sugerirEtiquetas(query).then(result=>{
        if(current){setSuggestions(result.data);setActive(0)}
      }).catch(()=>{if(current)setSuggestions([])});
    },200);
    return ()=>{current=false;clearTimeout(timer)};
  },[draft,tags.length]);

  const available=suggestions.filter(tag=>!tags.some(chosen=>sameTag(chosen)===sameTag(tag)));
  const showOptions=open&&draft.trim()&&available.length>0;

  function addTag(value){
    const tag=value.trim();
    if(tag&&tag.length<=50&&tags.length<20&&!tags.some(chosen=>sameTag(chosen)===sameTag(tag)))onTagsChange([...tags,tag]);
    onDraftChange('');
    setSuggestions([]);
  }

  function change(value){
    const parts=value.split(',');
    if(parts.length===1){onDraftChange(value);setSuggestions([]);setOpen(true);return}
    const next=[...tags];
    for(const part of parts.slice(0,-1)){
      const tag=part.trim();
      if(tag&&tag.length<=50&&next.length<20&&!next.some(chosen=>sameTag(chosen)===sameTag(tag)))next.push(tag);
    }
    onTagsChange(next);
    onDraftChange(parts.at(-1));
    setSuggestions([]);
    setOpen(true);
  }

  function keyDown(event){
    if(event.key==='ArrowDown'&&showOptions){event.preventDefault();setActive(index=>(index+1)%available.length)}
    else if(event.key==='ArrowUp'&&showOptions){event.preventDefault();setActive(index=>(index-1+available.length)%available.length)}
    else if(event.key==='Enter'&&draft.trim()){
      event.preventDefault();addTag(showOptions?available[active]:draft);
    }else if(event.key==='Escape'){setOpen(false)}
    else if(event.key==='Backspace'&&!draft&&tags.length){onTagsChange(tags.slice(0,-1))}
  }

  return <div className="tag-field" ref={wrapper} onBlur={event=>{
    if(!wrapper.current?.contains(event.relatedTarget))setOpen(false);
  }}>
    <label htmlFor="item-tags">Etiquetas</label>
    <div className="tag-entry">
      {tags.map((tag,index)=><span className="tag-pill" key={`${tag}-${index}`}>{tag}<button type="button" aria-label={`Remover etiqueta ${tag}`} onClick={()=>onTagsChange(tags.filter((_,i)=>i!==index))}>×</button></span>)}
      <input id="item-tags" value={draft} maxLength={50} disabled={tags.length>=20}
        placeholder={tags.length?'Adicionar etiqueta':'Digite uma etiqueta'} autoComplete="off"
        role="combobox" aria-autocomplete="list" aria-expanded={Boolean(showOptions)}
        aria-controls="tag-suggestions" aria-activedescendant={showOptions?`tag-option-${active}`:undefined}
        onFocus={()=>setOpen(true)} onChange={event=>change(event.target.value)} onKeyDown={keyDown}/>
    </div>
    {showOptions&&<ul id="tag-suggestions" className="tag-suggestions" role="listbox" aria-label="Etiquetas sugeridas">
      {available.map((tag,index)=><li key={tag} id={`tag-option-${index}`} role="option" aria-selected={index===active}>
        <button type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>addTag(tag)}>{tag}</button>
      </li>)}
    </ul>}
    <small>Separe por vírgula ou pressione Enter. Até 20 etiquetas.</small>
  </div>
}
