import React,{useEffect,useState} from 'react';
import {catalogApi} from '../api/catalogApi';
import {interactionApi} from '../api/interactionApi';
import ImageGallery from '../components/ImageGallery';
import RatingForm from '../components/RatingForm';
import RatingStars from '../components/RatingStars';
import CommentList from '../components/CommentList';

function attributeValue(attribute){
  if(attribute.tipo==='opcao'){
    const values=Array.isArray(attribute.valor)?attribute.valor:[attribute.valor];
    return <span className="attribute-values">{values.map((value,index)=><span key={`${value}-${index}`}>{value}</span>)}</span>;
  }
  if(attribute.tipo==='booleano')return attribute.valor?'Sim':'Não';
  if(attribute.tipo==='data')return new Date(attribute.valor).toLocaleDateString('pt-BR');
  return String(attribute.valor);
}

function ratingText(summary){
  if(!summary?.quantidade)return 'Ainda sem avaliações';
  const average=summary.media.toFixed(1).replace('.',',');
  const count=summary.quantidade;
  return `${average} de 5 · ${count} ${count===1?'avaliação':'avaliações'}`;
}

export default function ItemDetails({id,user,navigate,onError}){
  const[item,setItem]=useState(null);
  const[summary,setSummary]=useState(null);
  const[myRating,setMyRating]=useState(null);
  const[comments,setComments]=useState([]);
  const[commentPage,setCommentPage]=useState(1);
  const[commentTotal,setCommentTotal]=useState(0);
  const[text,setText]=useState('');
  const[busy,setBusy]=useState(false);

  async function load(){
    try{
      const [itemResponse,summaryResponse,commentsResponse,ownResponse]=await Promise.all([
        catalogApi.item(id),interactionApi.resumo(id),interactionApi.comentarios(id,commentPage),
        user?interactionApi.minhaAvaliacao(id):Promise.resolve(null)
      ]);
      setItem(itemResponse.data);
      setSummary(summaryResponse.data);
      setComments(commentsResponse.data);
      setCommentTotal(commentsResponse.meta.total);
      setMyRating(ownResponse?.data?.nota??null);
    }catch(error){onError(error)}
  }

  useEffect(()=>{load()},[id,commentPage,user?.id]);

  async function rate(nota){
    setBusy(true);
    try{
      const response=await interactionApi.avaliar(id,nota);
      setMyRating(response.data.nota);
      setSummary((await interactionApi.resumo(id)).data);
    }catch(error){onError(error)}finally{setBusy(false)}
  }

  async function comment(event){
    event.preventDefault();setBusy(true);
    try{await interactionApi.comentar(id,text);setText('');setCommentPage(1);await load()}
    catch(error){onError(error)}finally{setBusy(false)}
  }

  async function editComment(commentId,content){
    try{await interactionApi.editarComentario(commentId,content);await load()}
    catch(error){onError(error);throw error}
  }

  async function deleteComment(commentId){
    if(!confirm('Excluir este comentário?'))return;
    try{await interactionApi.removerComentario(commentId);await load()}
    catch(error){onError(error)}
  }

  if(!item)return <p>Carregando item...</p>;
  const owner=user?.id===item.usuario_id;

  return <>
    <button className="subtle back" onClick={()=>navigate(owner?'minhas':'explorar')}>← Voltar</button>
    <div className="detail-layout">
      <div>
        <ImageGallery images={item.imagens} name={item.nome}/>
        {item.imagens?.some(image=>image.origem_url)&&<div className="image-credits">Fonte das imagens: {item.imagens.map((image,index)=>image.origem_url&&<a key={image.id} href={image.origem_url} target="_blank" rel="noopener noreferrer">{image.origem_autor||`Foto ${index+1}`} ({image.origem_licenca?.toUpperCase()||'fonte'})</a>)}</div>}
      </div>
      <div className="detail-info">
        <p className="eyebrow">{item.colecao_nome||'Coleção'}{item.dono_nome&&` · por ${item.dono_nome}`} · {item.visibilidade}{item.favorito?' · favorito':''}</p>
        <h1>{item.nome}</h1>
        <div className="item-rating-summary"><RatingStars value={summary?.media}/><span>{ratingText(summary)}</span></div>
        <p>{item.descricao}</p>
        {item.etiquetas?.length>0&&<div className="tags">{item.etiquetas.map(tag=><span key={tag}>{tag}</span>)}</div>}
        <h2>Características</h2>
        {item.atributos?.length?<dl className="attribute-list">{item.atributos.map(attribute=><div key={attribute.chave}><dt>{attribute.rotulo}</dt><dd>{attributeValue(attribute)}</dd></div>)}</dl>:<p className="muted">Sem atributos personalizados.</p>}
        {owner&&<button onClick={()=>navigate('editor',{itemId:item.id,collection:{id:item.colecao_id}})}>Editar item</button>}
      </div>
    </div>
    <section className="interaction-section">
      <div className="section-head"><h2>Avaliações e comentários</h2></div>
      {user&&!owner&&item.visibilidade==='publica'&&<RatingForm key={id} onSave={rate} busy={busy} currentRating={myRating}/>}
      <h3>Comentários</h3>
      <CommentList comments={comments} actorId={user?.id} onEdit={editComment} onDelete={deleteComment}/>
      {commentTotal>20&&<div className="pagination"><button disabled={commentPage<=1} onClick={()=>setCommentPage(commentPage-1)}>Anterior</button><span>Página {commentPage}</span><button disabled={commentPage*20>=commentTotal} onClick={()=>setCommentPage(commentPage+1)}>Próxima</button></div>}
      {user&&item.visibilidade==='publica'&&<form className="panel form" onSubmit={comment}><label>Escrever comentário<textarea required maxLength="1000" value={text} onChange={event=>setText(event.target.value)}/></label><button disabled={busy}>Publicar comentário</button></form>}
      {!user&&<p className="muted">Entre na sua conta para interagir.</p>}
    </section>
  </>;
}
