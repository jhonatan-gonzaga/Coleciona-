import {request} from './http';
export const imageApi={
  arquivo:async id=>URL.createObjectURL(await (await request(`/imagens/${id}/arquivo`,{raw:true})).blob()),
  adicionar:(id,files)=>{const body=new FormData();files.forEach(file=>body.append('imagens',file));return request(`/itens/${id}/imagens`,{method:'POST',body})},
  substituir:(id,file)=>{const body=new FormData();body.append('imagem',file);return request(`/imagens/${id}`,{method:'PUT',body})},
  ordenar:(id,ids)=>request(`/itens/${id}/imagens/ordem`,{method:'PATCH',body:{ids}}),
  remover:id=>request(`/imagens/${id}`,{method:'DELETE'})
};
