export const base=import.meta.env.VITE_API_URL||'/api/v1';
export const token=()=>localStorage.getItem('coleciona_token');
export class ApiError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}
export async function request(path,{method='GET',body,headers={},raw=false}={}){
  const auth=token();const response=await fetch(`${base}${path}`,{method,headers:{...(auth?{Authorization:`Bearer ${auth}`}:{}) ,...(body instanceof FormData?{}:body===undefined?{}:{'Content-Type':'application/json'}),...headers},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok){let error;try{error=(await response.json()).error}catch{}throw new ApiError(response.status,error?.code||'ERRO_HTTP',error?.message||'Falha na requisição.');}
  if(raw)return response;
  if(response.status===204)return null;
  return response.json();
}
export const qs=params=>new URLSearchParams(Object.entries(params).filter(([,v])=>v!==undefined&&v!==null)).toString();
