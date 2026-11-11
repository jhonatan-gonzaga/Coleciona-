import React,{useEffect,useState}from'react';
import{interactionApi}from'../api/interactionApi';
import RatingStars from '../components/RatingStars';
import ConfirmDialog from '../components/ConfirmDialog';

export default function MyInteractionsScreen({onError,navigate}){
  const[rows,setRows]=useState([]),[page,setPage]=useState(1),[total,setTotal]=useState(0);
  const[editing,setEditing]=useState(null),[text,setText]=useState('');
  const[pendingDelete,setPendingDelete]=useState(null);
  async function load(p=page){try{const r=await interactionApi.minhas(p);setRows(r.data);setTotal(r.meta.total);setPage(p)}catch(error){onError(error)}}
  useEffect(()=>{load(1)},[]);
  function remove(row){setPendingDelete(row)}
  async function confirmDelete(){if(pendingDelete.tipo==='avaliacao')await interactionApi.removerNota(pendingDelete.item_id);else await interactionApi.removerComentario(pendingDelete.id);await load();setPendingDelete(null)}
  async function saveComment(event){event.preventDefault();try{await interactionApi.editarComentario(editing,text);setEditing(null);await load()}catch(error){onError(error)}}
  return <>
    {pendingDelete&&<ConfirmDialog title={pendingDelete.tipo==='avaliacao'?'Excluir avaliação?':'Excluir comentário?'} description="Esta interação será removida da sua lista." onCancel={()=>setPendingDelete(null)} onConfirm={confirmDelete}/>}
    <div className="page-title"><div><p className="eyebrow">Sua participação</p><h1>Minhas interações</h1></div></div>
    <p className="muted">Você pode excluir suas notas e comentários mesmo se o item ficar privado.</p>
    {rows.length?<div className="interaction-list">{rows.map(row=><article className="interaction-row" key={row.id}>
      <div><small>{row.tipo} · {new Date(row.criado_em).toLocaleDateString('pt-BR')}</small>
        {editing===row.id?<form onSubmit={saveComment}><textarea required maxLength="1000" value={text} onChange={e=>setText(e.target.value)}/><div className="actions"><button>Salvar</button><button type="button" className="subtle" onClick={()=>setEditing(null)}>Cancelar</button></div></form>:row.tipo==='avaliacao'?<div className="interaction-rating"><RatingStars value={row.nota} small/><span>{row.nota} de 5 estrelas</span></div>:<p>{row.texto}</p>}
      </div><div className="actions"><button className="subtle" onClick={()=>navigate('detalhe',{id:row.item_id})}>Abrir item</button>{row.tipo==='comentario'&&editing!==row.id&&<button className="subtle" onClick={()=>{setEditing(row.id);setText(row.texto)}}>Editar</button>}<button className="danger-link" onClick={()=>remove(row)}>Excluir</button></div>
    </article>)}</div>:<p className="empty">Você ainda não avaliou nem comentou itens.</p>}
    {total>20&&<div className="pagination"><button disabled={page<=1} onClick={()=>load(page-1)}>Anterior</button><span>Página {page}</span><button disabled={page*20>=total} onClick={()=>load(page+1)}>Próxima</button></div>}
  </>
}
