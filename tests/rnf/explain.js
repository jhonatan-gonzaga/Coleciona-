const d=db.getSiblingDB('coleciona');
const ids=d.colecoes.find({estado:'ativa',visibilidade:'publica'},{_id:1}).toArray().map(x=>x._id);
const query={estado:'ativo',visibilidade:'publica',colecao_id:{$in:ids},$and:[{atributos:{$elemMatch:{chave:'vram_gb',tipo:'numero',valor:{$gte:8}}}}]};
const plan=d.itens.find(query).limit(20).explain('executionStats');
function indexName(stage){if(!stage||typeof stage!=='object')return null;if(stage.indexName)return stage.indexName;for(const value of Object.values(stage)){const found=indexName(value);if(found)return found}return null}
print(JSON.stringify({publicCollectionIds:ids.length,index:indexName(plan.queryPlanner.winningPlan),nReturned:Number(plan.executionStats.nReturned),totalKeysExamined:Number(plan.executionStats.totalKeysExamined),totalDocsExamined:Number(plan.executionStats.totalDocsExamined),executionTimeMillis:Number(plan.executionStats.executionTimeMillis),serverVersion:plan.serverInfo.version}));
