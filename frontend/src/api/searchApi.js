import {request,qs} from './http';
export const searchApi={explorar:(pagina=1,q='',filtros=[])=>request(`/explorar/colecoes?${qs({pagina,q,...(filtros.length?{filtros:JSON.stringify(filtros)}:{})})}`),filtros:escopo=>request(`/itens/filtros?${qs({escopo})}`),busca:(body)=>request('/itens/busca',{method:'POST',body})};
export function compileFilters(filters){return filters.map(f=>{const parse=value=>f.tipo==='numero'?Number(value):f.tipo==='booleano'?value===true||value==='true':value;return {...f,valor:f.operador==='in'?String(f.valor).split(',').map(x=>parse(x.trim())):parse(f.valor)}})}
