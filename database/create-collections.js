const dbi = db.getSiblingDB('coleciona');
const oid = {bsonType:'objectId'};
const str = {bsonType:'string'};
const date = {bsonType:'date'};
const vis = {enum:['publica','privada']};
const base = {criado_em:date,atualizado_em:date};
const specs = {
  usuarios:{required:['nome','email','senha_hash','tentativas_login','criado_em'],properties:{...base,nome:str,email:str,senha_hash:str,tentativas_login:{bsonType:'int'}}},
  colecoes:{required:['usuario_id','nome','visibilidade','estado','criado_em'],properties:{...base,usuario_id:oid,nome:str,descricao:str,visibilidade:vis,estado:{enum:['ativa','em_exclusao']}}},
  itens:{required:['colecao_id','usuario_id','nome','visibilidade','estado','atributos','criado_em'],properties:{...base,colecao_id:oid,usuario_id:oid,nome:str,descricao:str,visibilidade:vis,estado:{enum:['ativo','em_exclusao']},atributos:{bsonType:'array',maxItems:50,items:{bsonType:'object',required:['chave','rotulo','tipo','valor'],properties:{chave:str,rotulo:str,tipo:{enum:['texto','numero','data','booleano','opcao']}}}},etiquetas:{bsonType:'array'},favorito:{bsonType:'bool'}}},
  imagens:{required:['colecao_id','item_id','usuario_id','caminho','ordem','tipo_mime','tamanho_bytes','estado','criado_em'],properties:{...base,colecao_id:oid,item_id:oid,usuario_id:oid,caminho:str,ordem:{bsonType:'int'},tipo_mime:{enum:['image/jpeg','image/png','image/webp']},tamanho_bytes:{bsonType:['int','long']},estado:{enum:['ativa','em_remocao']},remocoes_pendentes:{bsonType:'array'}}},
  avaliacoes:{required:['colecao_id','item_id','usuario_id','nota','criado_em'],properties:{...base,colecao_id:oid,item_id:oid,usuario_id:oid,nota:{bsonType:'int',minimum:1,maximum:5}}},
  comentarios:{required:['colecao_id','item_id','usuario_id','texto','criado_em'],properties:{...base,colecao_id:oid,item_id:oid,usuario_id:oid,texto:{bsonType:'string',maxLength:1000}}}
};
for (const [name,schema] of Object.entries(specs)) {
  const validator={$jsonSchema:{bsonType:'object',...schema}};
  if (!dbi.getCollectionNames().includes(name)) dbi.createCollection(name,{validator});
  else dbi.runCommand({collMod:name,validator});
  print(`Validado: ${name}`);
}
