import {useEffect,useLayoutEffect,useRef,type TextareaHTMLAttributes} from 'react';
import {definedMeanings,letterFor,moved,newSense,newSubsense,type Sense,type Subsense} from '../lib/senses';
import {cleanRelated,labels,pickRelations,relations,singular,type Relation,type Relations} from '../lib/relations';
import {RelatedTerms} from './RelatedTerms';
import {Disclosure,Select} from './Select';

const Icon={
 plus:<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>,
 close:<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>,
 up:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 10 4-4 4 4"/></svg>,
 down:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>,
};

type Props={senses:Sense[];onChange:(senses:Sense[])=>void};

/**
 * Numbered definitions (1, 2, 3) with optional lettered subdefinitions (2a, 2b).
 * Labels come from positions, so moving or removing anything renumbers the rest.
 */
export function DefinitionEditor({senses,onChange}:Props){
 // Newly added definitions get the cursor once they exist in the DOM.
 const focusNext=useRef<string|null>(null);
 useEffect(()=>{const id=focusNext.current;if(!id)return;focusNext.current=null;document.getElementById('def-'+id)?.focus()},[senses]);

 const setSense=(id:string,update:Partial<Sense>)=>onChange(senses.map(s=>s.id===id?{...s,...update}:s));
 const setSub=(sense:Sense,id:string,update:Partial<Subsense>)=>setSense(sense.id,{subsenses:sense.subsenses.map(x=>x.id===id?{...x,...update}:x)});
 function addSense(){const s=newSense();focusNext.current=s.id;onChange([...senses,s])}
 function addSub(sense:Sense){const x=newSubsense();focusNext.current=x.id;setSense(sense.id,{subsenses:[...sense.subsenses,x]})}

 return <div className="ed-meanings">
  {senses.map((sense,i)=>{
   const n=i+1,hasSubs=sense.subsenses.length>0;
   return <div className="ed-meaning" key={sense.id}>
    <span className="ed-meaning-number" aria-hidden="true">{n}</span>
    <div className="ed-meaning-fields">
     <label className="ed-field"><span>Definition {n}{hasSubs&&<em>optional with subdefinitions</em>}</span>
      <GrowingText id={'def-'+sense.id} placeholder={hasSubs?'A general meaning that covers the ones below':'What does it mean?'} value={sense.definition} onChange={e=>setSense(sense.id,{definition:e.target.value})}/></label>
     <Examples label={`${n}`} examples={sense.examples} onChange={examples=>setSense(sense.id,{examples})}/>
     <DefinitionRelations label={`${n}`} value={sense} onChange={update=>setSense(sense.id,update)}/>
     {hasSubs&&<div className="ed-subsenses">{sense.subsenses.map((sub,j)=>{
      const label=`${n}${letterFor(j)}`;
      return <div className="ed-subsense" key={sub.id}>
       <span className="ed-subsense-letter" aria-hidden="true">{letterFor(j)}</span>
       <div className="ed-meaning-fields">
        <label className="ed-field"><span>Definition {label}</span>
         <GrowingText id={'def-'+sub.id} placeholder="A narrower meaning" value={sub.definition} onChange={e=>setSub(sense,sub.id,{definition:e.target.value})}/></label>
        <Examples label={label} examples={sub.examples} onChange={examples=>setSub(sense,sub.id,{examples})}/>
        <DefinitionRelations label={label} value={sub} onChange={update=>setSub(sense,sub.id,update)}/>
       </div>
       <Order what={`definition ${label}`} index={j} count={sense.subsenses.length}
        onMove={d=>setSense(sense.id,{subsenses:moved(sense.subsenses,j,d)})}
        onRemove={()=>setSense(sense.id,{subsenses:sense.subsenses.filter(x=>x.id!==sub.id)})}/>
      </div>})}</div>}
     <button type="button" className="ed-text-button ed-add-sub" onClick={()=>addSub(sense)}>{Icon.plus}Add subdefinition {n}{letterFor(sense.subsenses.length)}</button>
    </div>
    <Order what={`definition ${n}`} index={i} count={senses.length} removable={senses.length>1}
     onMove={d=>onChange(moved(senses,i,d))}
     onRemove={()=>onChange(senses.filter(s=>s.id!==sense.id))}/>
   </div>})}
  <button type="button" className="ed-add-meaning" onClick={addSense}>{Icon.plus}Add definition {senses.length+1}</button>
 </div>;
}

function Examples({label,examples,onChange}:{label:string;examples:string[];onChange:(examples:string[])=>void}){
 return <div className="ed-examples"><span className="ed-field-label">Examples for {label}</span>
  {examples.map((example,i)=><div className="ed-example" key={i}>
   <span className="example-label" aria-hidden="true">{label}</span>
   <GrowingText single aria-label={`Example ${i+1} for definition ${label}`} placeholder="Use the word in a sentence" value={example} onChange={e=>onChange(examples.map((x,j)=>j===i?e.target.value:x))}/>
   <button type="button" className="ed-icon-button" aria-label={`Remove example ${i+1} for definition ${label}`} onClick={()=>onChange(examples.filter((_,j)=>j!==i))}>{Icon.close}</button>
  </div>)}
  <button type="button" className="ed-text-button" onClick={()=>onChange([...examples,''])}>{Icon.plus}Add example</button>
 </div>;
}

/** Up, down and remove for one definition. Buttons that can't act are invisible but keep their space, so nothing shifts under the pointer. */
function Order({what,index,count,removable=true,onMove,onRemove}:{what:string;index:number;count:number;removable?:boolean;onMove:(delta:number)=>void;onRemove:()=>void}){
 return <div className="ed-order">
  <button type="button" className={`ed-icon-button${index===0?' is-idle':''}`} disabled={index===0} aria-label={`Move ${what} up`} data-tip="Move up" onClick={()=>onMove(-1)}>{Icon.up}</button>
  <button type="button" className={`ed-icon-button${index===count-1?' is-idle':''}`} disabled={index===count-1} aria-label={`Move ${what} down`} data-tip="Move down" onClick={()=>onMove(1)}>{Icon.down}</button>
  {removable&&<button type="button" className="ed-icon-button is-danger" aria-label={`Remove ${what}`} data-tip="Remove" onClick={onRemove}>{Icon.close}</button>}
 </div>;
}

/**
 * A text box that grows with its content, so long definitions and examples are always fully visible.
 * `single` keeps it to one paragraph: Enter doesn't add a line break (an example is one sentence).
 */
function GrowingText({single,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>&{value:string;single?:boolean}){
 const ref=useRef<HTMLTextAreaElement>(null);
 const fit=()=>{const el=ref.current;if(!el)return;el.style.height='auto';el.style.height=`${el.scrollHeight+2}px`};
 useLayoutEffect(fit,[props.value]);
 // Re-measure when the column width changes and the text rewraps.
 useEffect(()=>{const el=ref.current;if(!el||typeof ResizeObserver==='undefined')return;let width=el.clientWidth;const observer=new ResizeObserver(()=>{if(el.clientWidth!==width){width=el.clientWidth;fit()}});observer.observe(el);return()=>observer.disconnect()},[]);
 return <textarea ref={ref} rows={1} {...props} className={`ed-grow ${props.className||''}`.trim()} onKeyDown={single?e=>{if(e.key==='Enter')e.preventDefault()}:props.onKeyDown}/>;
}

/**
 * One definition's synonyms, antonyms and related forms. Folded away while empty so a new
 * word stays a short form; open whenever the definition already has some.
 */
function DefinitionRelations({label,value,onChange}:{label:string;value:Relations;onChange:(update:Partial<Relations>)=>void}){
 const count=relations.reduce((n,k)=>n+value[k].length,0);
 return <Disclosure className="ed-def-relations" defaultOpen={count>0} count={count}
  label={<>Synonyms, antonyms &amp; related forms<span className="sr-only"> for definition {label}</span></>}>
  <div className="ed-def-relations-grid">{relations.map(k=><RelatedTerms key={k} label={labels[k]} singular={singular[k]} items={value[k]} onChange={items=>onChange({[k]:items})}/>)}</div>
 </Disclosure>;
}

const shorten=(text:string,max=46)=>text.length>max?`${text.slice(0,max-1).trimEnd()}…`:text;

/**
 * Relationships from older files, when they belonged to the whole word. Lexicon never guesses
 * which meaning they fit; this panel lets the person place each one, or remove it.
 */
export function UnassignedRelations({senses,value:given,onChange}:{senses:Sense[];value:Relations;onChange:(next:{senses:Sense[];unassigned:Relations})=>void}){
 // Only the three lists: callers may pass a whole word, and nothing else may travel back out.
 const value=pickRelations(given);
 const count=relations.reduce((n,k)=>n+value[k].length,0);
 if(!count)return null;
 const targets=definedMeanings(senses);
 function assign(kind:Relation,index:number,targetId:string){
  const item=value[kind][index];
  const add=<T extends Relations>(node:T):T=>({...node,[kind]:cleanRelated([...node[kind],item])});
  const next=senses.map(s=>s.id===targetId?add(s):{...s,subsenses:s.subsenses.map(x=>x.id===targetId?add(x):x)});
  onChange({senses:next,unassigned:{...value,[kind]:value[kind].filter((_,i)=>i!==index)}});
 }
 const remove=(kind:Relation,index:number)=>onChange({senses,unassigned:{...value,[kind]:value[kind].filter((_,i)=>i!==index)}});
 return <section className="ed-unassigned" aria-labelledby="unassigned-title">
  <h4 id="unassigned-title">Not yet assigned</h4>
  <p>These came from an older Lexicon, when related words belonged to the whole word. Choose the definition each one belongs to.</p>
  {relations.filter(k=>value[k].length).map(kind=><div className="ed-unassigned-group" key={kind}>
   <span className="ed-field-label">{labels[kind]}</span>
   <ul>{value[kind].map((item,i)=><li key={`${item.term}-${i}`}>
    <span className="ed-unassigned-term">{item.term}</span>
    {targets.length
     ?<Select label={`Assign ${item.term} to a definition`} value="" className="ed-assign"
       options={[{value:'',label:'Assign to…'},...targets.map(m=>({value:m.id,label:`${m.label}. ${shorten(m.definition)}`}))]}
       onChange={id=>{if(id)assign(kind,i,id)}}/>
     :<small>Add a definition first</small>}
    <button type="button" className="ed-icon-button" aria-label={`Remove ${item.term}`} data-tip="Remove" onClick={()=>remove(kind,i)}>{Icon.close}</button>
   </li>)}</ul>
  </div>)}
 </section>;
}
