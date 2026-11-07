import React from 'react';

const types=[
  ['texto','Texto'],
  ['numero','Número'],
  ['data','Data'],
  ['booleano','Sim/Não'],
  ['opcao','Opções (vários valores)']
];

const hints={
  texto:'Use para informações como fabricante ou material.',
  numero:'Aceita números inteiros e decimais.',
  data:'Informe uma data no calendário.',
  booleano:'Escolha Sim ou Não.',
  opcao:'Adicione de 1 a 20 valores. O item poderá ser encontrado por qualquer um deles.'
};

function OptionValues({attribute,onChange}){
  const values=Array.isArray(attribute.valor)?attribute.valor:[attribute.valor??''];
  const setValue=(index,next)=>onChange(values.map((value,i)=>i===index?next:value));
  const removeValue=index=>onChange(values.filter((_,i)=>i!==index));

  return <div className="option-values">
    <span className="field-label">Valores da opção</span>
    {values.map((option,index)=><div className="option-value-row" key={index}>
      <input required maxLength="500" value={option} aria-label={`Valor ${index+1}`}
        placeholder={index===0?'Ex.: vermelho':'Outro valor'}
        onChange={event=>setValue(index,event.target.value)}/>
      <button type="button" className="text-button" disabled={values.length===1}
        aria-label={`Remover valor ${index+1}`} onClick={()=>removeValue(index)}>Remover</button>
    </div>)}
    <button type="button" className="inline-add" disabled={values.length>=20}
      onClick={()=>onChange([...values,''])}>+ Adicionar valor</button>
  </div>
}

export default function AttributeFields({value,onChange}){
  const set=(index,patch)=>onChange(value.map((attribute,i)=>i===index?{...attribute,...patch}:attribute));
  const remove=index=>onChange(value.filter((_,i)=>i!==index));
  const add=()=>onChange([...value,{rotulo:'',tipo:'texto',valor:''}]);

  return <section className="field-group attributes-editor" aria-labelledby="attributes-heading">
    <div className="attributes-heading">
      <div><h3 id="attributes-heading">Atributos personalizados</h3><p>Registre o que torna esta peça única.</p></div>
      <button type="button" className="subtle" disabled={value.length>=50} onClick={add}>+ Adicionar atributo</button>
    </div>
    {value.length===0?<div className="attributes-empty">Comece por uma característica como ano, país ou fabricante.</div>
      :<div className="attribute-stack">{value.map((attribute,index)=><div className="attribute-card" key={index}>
        <div className="attribute-card-head">
          <div><span className="attribute-position">Atributo {index+1}</span><strong>{attribute.rotulo.trim()||'Novo atributo'}</strong></div>
          <button type="button" className="text-button" onClick={()=>remove(index)}>Remover atributo</button>
        </div>
        <div className="attribute-card-fields">
          <label>Nome do atributo
            <input required maxLength="50" value={attribute.rotulo} placeholder="Ex.: Ano de fabricação"
              onChange={event=>set(index,{rotulo:event.target.value})}/>
          </label>
          <label>Tipo de valor
            <select value={attribute.tipo} onChange={event=>{
              const tipo=event.target.value;
              set(index,{tipo,valor:tipo==='booleano'?false:tipo==='opcao'?['']:''});
            }}>{types.map(([type,label])=><option key={type} value={type}>{label}</option>)}</select>
          </label>
          <div className="attribute-value-field">
            {attribute.tipo==='opcao'?<OptionValues attribute={attribute} onChange={valor=>set(index,{valor})}/>
              :<label>{attribute.tipo==='booleano'?'Resposta':'Valor'}
                {attribute.tipo==='booleano'?<select value={String(attribute.valor)} onChange={event=>set(index,{valor:event.target.value==='true'})}>
                  <option value="false">Não</option><option value="true">Sim</option>
                </select>:<input required type={attribute.tipo==='numero'?'number':attribute.tipo==='data'?'date':'text'}
                  step={attribute.tipo==='numero'?'any':undefined}
                  maxLength={attribute.tipo==='numero'||attribute.tipo==='data'?undefined:500}
                  value={attribute.tipo==='data'&&attribute.valor?.includes?.('T')?attribute.valor.slice(0,10):attribute.valor}
                  placeholder={attribute.tipo==='texto'?'Ex.: Brasil':undefined}
                  onChange={event=>set(index,{valor:attribute.tipo==='numero'?(event.target.value===''?'':Number(event.target.value)):event.target.value})}/>}</label>}
            <small>{hints[attribute.tipo]}</small>
          </div>
        </div>
      </div>)}</div>}
  </section>
}
