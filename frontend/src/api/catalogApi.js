import {request,qs} from './http';
export const catalogApi={
  minhas:(pagina=1)=>request(`/colecoes/minhas?${qs({pagina})}`),
  sugerirEtiquetas:q=>request(`/etiquetas/minhas?${qs({q})}`),
  criar:body=>request('/colecoes',{method:'POST',body}),
  editar:(id,body)=>request(`/colecoes/${id}`,{method:'PATCH',body}),
  excluir:id=>request(`/colecoes/${id}`,{method:'DELETE'}),
  itens:(id,pagina=1)=>request(`/colecoes/${id}/itens?${qs({pagina})}`),
  criarItem:(id,dados,imagens)=>{const body=new FormData();body.append('dados',JSON.stringify(dados));imagens.forEach(file=>body.append('imagens',file));return request(`/colecoes/${id}/itens`,{method:'POST',body})},
  item:id=>request(`/itens/${id}`),
  editarItem:(id,body)=>request(`/itens/${id}`,{method:'PATCH',body}),
  excluirItem:id=>request(`/itens/${id}`,{method:'DELETE'})
};
