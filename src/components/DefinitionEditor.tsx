import {useEffect,useLayoutEffect,useRef,type TextareaHTMLAttributes} from 'react';
import {letterFor,moved,newSense,newSubsense,type Sense,type Subsense} from '../lib/senses';

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
     {hasSubs&&<div className="ed-subsenses">{sense.subsenses.map((sub,j)=>{
      const label=`${n}${letterFor(j)}`;
      return <div className="ed-subsense" key={sub.id}>
       <span className="ed-subsense-letter" aria-hidden="true">{letterFor(j)}</span>
       <div className="ed-meaning-fields">
        <label className="ed-field"><span>Definition {label}</span>
         <GrowingText id={'def-'+sub.id} placeholder="A narrower meaning" value={sub.definition} onChange={e=>setSub(sense,sub.id,{definition:e.target.value})}/></label>
        <Examples label={label} examples={sub.examples} onChange={examples=>setSub(sense,sub.id,{examples})}/>
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
