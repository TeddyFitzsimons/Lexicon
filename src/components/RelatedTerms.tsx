import {useState} from 'react';
import {type RelatedTerm} from '../lib/words';

const article=(word:string)=>/^[aeiou]/i.test(word)?'an':'a';
export const MW_LINK=/^https:\/\/(www\.)?merriam-webster\.com\/dictionary\/\S+$/i;
type Props={label:string;singular:string;items:RelatedTerm[];onChange:(items:RelatedTerm[])=>void};

/** Related words as chips. Type and press Enter to add; the link button attaches an optional Merriam-Webster URL. */
export function RelatedTerms({label,singular,items,onChange}:Props){
 const [draft,setDraft]=useState(''),[linking,setLinking]=useState<number|null>(null);
 function add(){
  const term=draft.trim();if(!term)return;
  if(!items.some(i=>i.term.trim().toLowerCase()===term.toLowerCase()))onChange([...items,{term,url:''}]);
  setDraft('');
 }
 function remove(index:number){onChange(items.filter((_,i)=>i!==index));if(linking===index)setLinking(null)}
 const linked=linking!==null?items[linking]:null;
 const badLink=!!linked?.url.trim()&&!MW_LINK.test(linked.url.trim());
 return <section className="ed-related">
  <h4>{label}</h4>
  {items.length>0&&<ul className="ed-chips">{items.map((item,i)=><li key={i} className={`ed-chip ${linking===i?'is-linking':''}`}>
   <span>{item.term||'Untitled'}</span>
   <button type="button" className={`ed-chip-link ${item.url?'has-link':''}`} aria-pressed={linking===i} aria-label={`${item.url?'Edit':'Add'} dictionary link for ${item.term}`} data-tip={item.url?'Edit dictionary link':'Add a dictionary link'} onClick={()=>setLinking(linking===i?null:i)}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg></button>
   <button type="button" className="ed-chip-remove" aria-label={`Remove ${item.term}`} onClick={()=>remove(i)}>
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg></button>
  </li>)}</ul>}
  {linked&&<label className="ed-link-editor"><span>Merriam-Webster link for <b>{linked.term}</b></span>
   <input autoFocus type="url" spellCheck={false} placeholder="https://www.merriam-webster.com/dictionary/…" value={linked.url} aria-invalid={badLink} onChange={e=>onChange(items.map((x,i)=>i===linking?{...x,url:e.target.value}:x))} onKeyDown={e=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();setLinking(null)}}}/>
   {badLink&&<small className="ed-field-error">Use a merriam-webster.com/dictionary link, or leave it empty.</small>}</label>}
  <div className="ed-chip-add"><input aria-label={`Add ${article(singular)} ${singular}`} placeholder={`Add ${article(singular)} ${singular}`} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();add()}}}/>{draft.trim()&&<button type="button" className="ed-mini-button" onClick={add}>Add</button>}</div>
 </section>;
}
