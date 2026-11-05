import {request} from './http';
export const authApi={cadastro:body=>request('/auth/cadastro',{method:'POST',body}),login:body=>request('/auth/login',{method:'POST',body}),me:()=>request('/auth/me')};
