import {request,qs} from './http';
export const searchApi={explorar:(pagina=1)=>request(`/explorar/colecoes?${qs({pagina})}`),filtros:escopo=>request(`/itens/filtros?${qs({escopo})}`),busca:(body)=>request('/itens/busca',{method:'POST',body})};
