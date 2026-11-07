// Exemplos do contrato HTTP para desenvolvimento visual sem API.
const image={id:'imagem_01',item_id:'item_01',ordem:0,tipo_mime:'image/png',tamanho_bytes:96,url:'/api/v1/imagens/imagem_01/arquivo'};
const item={id:'item_01',colecao_id:'colecao_01',usuario_id:'usuario_01',nome:'Selo comemorativo',colecao_nome:'Objetos curiosos',dono_nome:'Ana',descricao:'Miniatura de 1980',visibilidade:'publica',estado:'ativo',atributos:[{chave:'ano',rotulo:'Ano',tipo:'numero',valor:1980}],etiquetas:['selo'],favorito:false,imagens:[image]};
const collection={id:'colecao_01',usuario_id:'usuario_01',nome:'Objetos curiosos',dono_nome:'Ana',descricao:'Acervo público',visibilidade:'publica',estado:'ativa',quantidade_itens:1};
const paged=data=>({data,meta:{pagina:1,tamanho:20,total:data.length}});
export const responses={
  'POST /auth/cadastro':{data:{id:'usuario_01',nome:'Ana',email:'ana@example.test'}},
  'POST /auth/login':{data:{token:'jwt-de-exemplo',usuario:{id:'usuario_01',nome:'Ana',email:'ana@example.test'}}},
  'GET /auth/me':{data:{id:'usuario_01',nome:'Ana',email:'ana@example.test'}},
  'GET /colecoes/minhas':paged([collection]),
  'GET /etiquetas/minhas':{data:['Brasil','C++']},
  'POST /colecoes':{data:collection},'PATCH /colecoes/:id':{data:collection},'DELETE /colecoes/:id':null,
  'GET /colecoes/:id/itens':paged([item]),'POST /colecoes/:id/itens':{data:item},
  'GET /itens/:id':{data:item},'PATCH /itens/:id':{data:item},'DELETE /itens/:id':null,
  'POST /itens/:id/imagens':{data:[image]},'PUT /imagens/:id':{data:image},
  'PATCH /itens/:id/imagens/ordem':{data:[image]},'DELETE /imagens/:id':{data:[image]},
  'GET /imagens/:id/arquivo':{status:200,headers:{'Content-Type':'image/png','Cache-Control':'private, no-store'},body:'bytes PNG'},
  'GET /itens/filtros':{data:[{chave:'ano',tipo:'numero'}]},
  'POST /itens/busca':paged([item]),
  'GET /itens/:id/avaliacoes/resumo':{data:{media:4,quantidade:1}},
  'GET /itens/:id/avaliacao/minha':{data:{id:'avaliacao_01',item_id:item.id,nota:4}},
  'PUT /itens/:id/avaliacao/minha':{data:{id:'avaliacao_01',item_id:item.id,nota:4}},
  'DELETE /itens/:id/avaliacao/minha':null,
  'GET /itens/:id/comentarios':paged([{id:'comentario_01',item_id:item.id,usuario_id:'usuario_02',texto:'Bonito selo.'}]),
  'POST /itens/:id/comentarios':{data:{id:'comentario_01',item_id:item.id,texto:'Bonito selo.'}},
  'PATCH /comentarios/:id':{data:{id:'comentario_01',texto:'Selo raro.'}},
  'DELETE /comentarios/:id':null,'GET /interacoes/minhas':paged([]),
  'GET /health/live':{data:{status:'ok'}},'GET /health/ready':{data:{status:'ok'}},
  'ERROR ULTIMA_IMAGEM':{error:{code:'ULTIMA_IMAGEM',message:'O item precisa manter pelo menos uma imagem.',details:{}}}
};
