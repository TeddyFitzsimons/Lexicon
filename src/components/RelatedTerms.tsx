import {type RelatedTerm} from '../lib/words';

type Props={label:string;items:RelatedTerm[];onChange:(items:RelatedTerm[])=>void};
/** Free-text related words; dictionary links are optional and never fabricated. */
export function RelatedTerms({label,items,onChange}:Props){
  function update(index:number,patch:Partial<RelatedTerm>){onChange(items.map((item,i)=>i===index?{...item,...patch}:item));}
  return <section className="related-terms"><div className="detail-label">{label} <span>· Optional</span></div>
    {items.map((item,index)=><div className="related-term-row" key={index}>
      <input aria-label={`${label} word ${index+1}`} placeholder="Word" value={item.term} onChange={e=>update(index,{term:e.target.value})}/>
      <input aria-label={`${label} dictionary URL ${index+1}`} placeholder="https://www.merriam-webster.com/dictionary/… (optional)" value={item.url} onChange={e=>update(index,{url:e.target.value})}/>
      <button type="button" className="icon-button" aria-label={`Remove ${label} ${index+1}`} onClick={()=>onChange(items.filter((_,i)=>i!==index))}>×</button>
    </div>)}
    <p className="hint">Optional link must point to Merriam-Webster. Leave blank for plain text.</p>
    <button type="button" className="quiet-button add-inline" onClick={()=>onChange([...items,{term:'',url:''}])}>+ Add {label.toLowerCase().replace(/s$/,'')}</button>
  </section>;
}
