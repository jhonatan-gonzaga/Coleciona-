import React,{useEffect,useRef,useState} from 'react';

export default function ConfirmDialog({title,description,confirmLabel='Excluir',onConfirm,onCancel}){
  const dialog=useRef(null);
  const cancelButton=useRef(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    const previous=document.activeElement;
    dialog.current?.showModal();
    cancelButton.current?.focus();
    return ()=>{dialog.current?.close();previous?.focus?.()};
  },[]);
  async function confirm(){
    if(busy)return;
    setBusy(true);setError('');
    try{await onConfirm()}catch(cause){setError(cause?.message||'Não foi possível concluir a exclusão.');setBusy(false)}
  }
  return <dialog ref={dialog} className="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-description" onCancel={event=>{event.preventDefault();if(!busy)onCancel()}}>
    <h2 id="confirm-title">{title}</h2>
    <p id="confirm-description">{description}</p>
    {error&&<p className="confirm-error" role="alert">{error}</p>}
    <div className="actions"><button ref={cancelButton} type="button" className="subtle" disabled={busy} onClick={onCancel}>Cancelar</button><button type="button" className="confirm-danger" disabled={busy} onClick={confirm}>{busy?'Excluindo...':confirmLabel}</button></div>
  </dialog>;
}
