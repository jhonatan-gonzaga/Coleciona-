const test=require('node:test');const assert=require('node:assert/strict');const {itemFields,page}=require('./validation');
test('atributos são tipados e chaves não duplicam',()=>{const item=itemFields({nome:'Selo',atributos:[{rotulo:'País',tipo:'texto',valor:'Brasil'}]});assert.equal(item.atributos[0].chave,'pais');assert.throws(()=>itemFields({nome:'Selo',atributos:[{rotulo:'País',tipo:'texto',valor:'Brasil'},{rotulo:'Pais',tipo:'texto',valor:'Chile'}]}),{code:'ATRIBUTOS_INVALIDOS'})});
test('opções aceitam vários valores e mantêm itens antigos',()=>{
  const item=itemFields({nome:'Peça',atributos:[{rotulo:'Cores',tipo:'opcao',valor:['Azul','Verde']} ]});
  assert.deepEqual(item.atributos[0].valor,['Azul','Verde']);
  assert.deepEqual(itemFields({nome:'Peça',atributos:[{rotulo:'Cor',tipo:'opcao',valor:'Azul'}]}).atributos[0].valor,['Azul']);
  for(const values of [[],['Azul','azul'],Array(21).fill('Azul'),['']]){
    assert.throws(()=>itemFields({nome:'Peça',atributos:[{rotulo:'Cores',tipo:'opcao',valor:values}]}));
  }
});
test('limites de paginação e documento',()=>{assert.throws(()=>page({tamanho:51}),{code:'PAGINACAO_INVALIDA'});assert.throws(()=>itemFields({nome:'Selo',descricao:'x'.repeat(501)}),{code:'DADOS_INVALIDOS'})});
