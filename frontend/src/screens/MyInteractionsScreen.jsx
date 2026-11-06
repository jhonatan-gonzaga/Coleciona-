import React,{useEffect,useState}from'react';
import{interactionApi}from'../api/interactionApi';

export default function MyInteractionsScreen({onError,navigate}){
  const[rows,setRows]=useState([]),[page,setPage]=useState(1),[total,setTotal]=useState(0);
  const[editing,setEditing]=useState(null),[text,setText]=useState('');
  async function load(p=page){try{const r=await interactionApi.minhas(p);setRows(r.data);setTotal(r.meta.total);setPage(p)}catch(error){onError(error)}}
  useEffect(()=>{load(1)},[]);
  async function remove(row){if(!confirm('Excluir esta interação?'))return;try{if(row.tipo==='avaliacao')await interactionApi.removerNota(row.item_id);else await interactionApi.removerComentario(row.id);await load()}catch(error){onError(error)}}
  async function saveComment(event){event.preventDefault();try{await interactionApi.editarComentario(editing,text);setEditing(null);await load()}catch(error){onError(error)}}
  return <>
    <div className="page-title"><div><p className="eyebrow">Sua participação</p><h1>Minhas interações</h1></div></div>
    <p className="muted">Você pode excluir suas notas e comentários mesmo se o item ficar privado.</p>
    {rows.length?<div className="interaction-list">{rows.map(row=><article className="interaction-row" key={row.id}>
      <div><small>{row.tipo} · {new Date(row.criado_em).toLocaleDateString('pt-BR')}</small>
        {editing===row.id?<form onSubmit={saveComment}><textarea required maxLength="1000" value={text} onChange={e=>setText(e.target.value)}/><div className="actions"><button>Salvar</button><button type="button" className="subtle" onClick={()=>setEditing(null)}>Cancelar</button></div></form>:<p>{row.tipo==='avaliacao'?`Nota ${row.nota} / 5`:row.texto}</p>}
      </div><div className="actions"><button className="subtle" onClick={()=>navigate('detalhe',{id:row.item_id})}>Abrir item</button>{row.tipo==='comentario'&&editing!==row.id&&<button className="subtle" onClick={()=>{setEditing(row.id);setText(row.texto)}}>Editar</button>}<button className="danger-link" onClick={()=>remove(row)}>Excluir</button></div>
    </article>)}</div>:<p className="empty">Você ainda não avaliou nem comentou itens.</p>}
    {total>20&&<div className="pagination"><button disabled={page<=1} onClick={()=>load(page-1)}>Anterior</button><span>Página {page}</span><button disabled={page*20>=total} onClick={()=>load(page+1)}>Próxima</button></div>}
  </>
}
