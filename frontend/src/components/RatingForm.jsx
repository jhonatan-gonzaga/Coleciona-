import React,{useEffect,useState} from 'react';

export default function RatingForm({onSave,busy,currentRating}){
  const[nota,setNota]=useState(currentRating??0);
  const[preview,setPreview]=useState(0);
  useEffect(()=>setNota(currentRating??0),[currentRating]);

  return <form className="rating-form" onSubmit={event=>{event.preventDefault();if(nota)onSave(nota)}}>
    <span className="rating-form-label">Sua avaliação</span>
    <div className="rating-form-controls">
      <div className="rating-picker" aria-label="Escolha uma nota de 1 a 5 estrelas">
        {[1,2,3,4,5].map(star=><button key={star} type="button" className={star<=(preview||nota)?'selected':''}
          aria-label={`${star} ${star===1?'estrela':'estrelas'}`} aria-pressed={nota===star}
          disabled={busy} onClick={()=>setNota(star)} onMouseEnter={()=>setPreview(star)} onMouseLeave={()=>setPreview(0)}
          onFocus={()=>setPreview(star)} onBlur={()=>setPreview(0)}>★</button>)}
      </div>
      <span className="rating-selection" aria-live="polite">{nota?`${nota} de 5 estrelas`:'Selecione uma nota'}</span>
      <button type="submit" disabled={busy||!nota}>{currentRating?'Atualizar avaliação':'Avaliar item'}</button>
    </div>
  </form>;
}
