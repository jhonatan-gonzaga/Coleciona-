import React from 'react';

export default function RatingStars({value,small=false}){
  const rating=Number.isFinite(value)?Math.max(0,Math.min(5,value)):0;
  const label=rating?`${rating.toFixed(1).replace('.',',')} de 5 estrelas`:'Sem avaliações';

  return <span className={`rating-stars${small?' rating-stars-small':''}`} role="img" aria-label={label}>
    <span className="rating-stars-back" aria-hidden="true">★★★★★</span>
    <span className="rating-stars-front" aria-hidden="true" style={{width:`${rating*20}%`}}>★★★★★</span>
  </span>;
}
