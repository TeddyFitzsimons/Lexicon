import {useEffect,useMemo,useRef,useState} from 'react';
import {Select} from './Select';
import {RelatedTerms,MW_LINK} from './RelatedTerms';
import {PronunciationFields} from './PronunciationFields';
import {allDefinitionText,cleaned,emptyDraft,firstDefinition,hasDefinition,letterFor,labels,newSense,newSubdefinition,parts,relations,type Draft,type Relation,type Sense,type Subdefinition,type Word} from '../lib/words';
import '../editor.css';

type Props={words:Word[];focusId:string|null;addOnOpen:boolean;busy:boolean;onSave:(words:Word[])=>Promise<boolean>;onCancel:()=>void};
type EditableWord=Draft&{id:string};
const singular:Record<Relation,string>={synonyms:'synonym',antonyms:'antonym',relatedForms:'related form'};
const copyWord=(word:Word):EditableWord=>({...word,senses:word.senses.map(s=>({...s,examples:[...s.examples],subdefinitions:s.subdefinitions.map(sub=>({...sub,examples:[...sub.examples]}))})),examples:[...word.examples],synonyms:word.synonyms.map(x=>({...x})),antonyms:word.antonyms.map(x=>({...x})),relatedForms:word.relatedForms.map(x=>({...x}))});
const Icon={
 chevron:<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>,
 trash:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 4h4m-8 3 1 13h10l1-13M10 11v6m4-6v6"/></svg>,
 plus:<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>,
 close:<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>,
 search:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>,
};

/** Each node owns its own examples. Their arrays move with the node and its stable ID. */
function ExamplesEditor({examples,onChange,label,numbering='numeric'}:{examples:string[];onChange:(values:string[])=>void;label:string;numbering?:'numeric'|'alpha'}){
 return <div className="ed-examples"><span className="ed-field-label">Examples</span>
  {examples.map((example,i)=><div className="ed-example" key={i}>
   <span className="ed-example-number">{numbering==='alpha'?letterFor(i):i+1}.</span><input aria-label={`Example ${i+1} for ${label}`} placeholder="Use the word in a sentence" value={example} onChange={e=>onChange(examples.map((x,j)=>j===i?e.target.value:x))}/>
   <button type="button" className="ed-icon-button" aria-label={`Remove example ${i+1} for ${label}`} onClick={()=>onChange(examples.filter((_,j)=>j!==i))}>{Icon.close}</button>
  </div>)}
  <button type="button" className="ed-text-button" onClick={()=>onChange([...examples,''])}>{Icon.plus}Add example</button>
 </div>;
}
function OrderButtons({name,index,count,onMove}:{name:string;index:number;count:number;onMove:(direction:number)=>void}){
 return <div className="ed-reorder" role="group" aria-label={`Reorder ${name}`}>
  <button type="button" className="ed-mini-button" aria-label={`Move ${name} up`} title={`Move ${name} up`} disabled={index===0} onClick={()=>onMove(-1)}>↑</button>
  <button type="button" className="ed-mini-button" aria-label={`Move ${name} down`} title={`Move ${name} down`} disabled={index===count-1} onClick={()=>onMove(1)}>↓</button>
 </div>;
}
const moveItem=<T,>(items:T[],index:number,direction:number):T[]=>{
 const target=index+direction;if(target<0||target>=items.length)return items;
 const copy=[...items];[copy[index],copy[target]]=[copy[target],copy[index]];return copy;
};

/**
 * Editing workspace. Every change is staged locally and written in one batch by
 * Save changes; Cancel discards everything.
 */
export function ManageWords({words,focusId,addOnOpen,busy,onSave,onCancel}:Props){
 const [rows,setRows]=useState<EditableWord[]>(()=>words.map(copyWord));
 const [removed,setRemoved]=useState(0);
 const [newIds,setNewIds]=useState<string[]>([]);
 const [expanded,setExpanded]=useState<string[]>(focusId?[focusId]:[]);
 const [search,setSearch]=useState('');
 const [message,setMessage]=useState('');
 const [confirmDelete,setConfirmDelete]=useState<string|null>(null);
 const [dirty,setDirty]=useState(false);
 const focusTerm=useRef<string|null>(null);

 function addRow(){
  const id=crypto.randomUUID();
  setRows(prev=>[...prev,{...emptyDraft(),id}]);setExpanded(prev=>[...prev,id]);setNewIds(prev=>[...prev,id]);
  setSearch('');setDirty(true);focusTerm.current=id;
 }
 useEffect(()=>{if(addOnOpen)addRow()},[]);
 useEffect(()=>{if(focusId)document.getElementById('word-'+focusId)?.scrollIntoView({block:'center'})},[]);
 useEffect(()=>{const id=focusTerm.current;if(!id)return;focusTerm.current=null;const el=document.getElementById('term-'+id) as HTMLInputElement|null;el?.scrollIntoView({behavior:'smooth',block:'center'});el?.focus({preventScroll:true})},[rows]);

 const visible=useMemo(()=>rows.filter(row=>newIds.includes(row.id)||[row.term,row.partOfSpeech,...allDefinitionText(row)].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[rows,search,newIds]);
 function patch(id:string,update:Partial<EditableWord>){setRows(prev=>prev.map(w=>w.id===id?{...w,...update}:w));setDirty(true);setMessage('')}
 function changeSense(row:EditableWord,senseId:string,update:Partial<Sense>){patch(row.id,{senses:row.senses.map(s=>s.id===senseId?{...s,...update}:s)})}
 function changeSubdefinition(row:EditableWord,senseId:string,subId:string,update:Partial<Subdefinition>){patch(row.id,{senses:row.senses.map(s=>s.id===senseId?{...s,subdefinitions:s.subdefinitions.map(sub=>sub.id===subId?{...sub,...update}:sub)}:s)})}
 function removeRow(id:string){setRows(prev=>prev.filter(w=>w.id!==id));if(!newIds.includes(id))setRemoved(n=>n+1);setConfirmDelete(null);setDirty(true)}
 function toggle(id:string){setExpanded(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])}
 async function save(){
  const incomplete=rows.find(w=>!w.term.trim()||!w.senses.length||w.senses.some(s=>(!s.definition.trim()&&!s.subdefinitions.some(sub=>sub.definition.trim()))||s.subdefinitions.some(sub=>!sub.definition.trim()))||!hasDefinition(w));
  if(incomplete){setExpanded(prev=>[...new Set([...prev,incomplete.id])]);setSearch('');setMessage(incomplete.term.trim()?`“${incomplete.term.trim()}” has an empty definition or subdefinition. Complete it or remove it before saving.`:'One of your words is missing its spelling.');requestAnimationFrame(()=>document.getElementById('word-'+incomplete.id)?.scrollIntoView({behavior:'smooth',block:'center'}));return}
  const badLink=rows.find(w=>relations.some(key=>w[key].some(item=>item.url.trim()&&!MW_LINK.test(item.url.trim()))));
  if(badLink){setExpanded(prev=>[...new Set([...prev,badLink.id])]);setMessage(`A dictionary link on “${badLink.term}” isn’t a Merriam-Webster dictionary URL.`);return}
  if(await onSave(rows.map(w=>cleaned(w,w.id))))onCancel();
 }
 const added=newIds.filter(id=>rows.some(r=>r.id===id)).length;
 const status=!dirty?'No changes':[added&&`${added} new`,removed&&`${removed} removed`].filter(Boolean).join(', ')||'Unsaved edits';

 return <section className="ed-page">
  <header className="ed-head"><div><h1>Manage words</h1><p>Edits stay here until you save. Cancel throws them away.</p></div><button className="primary-button" onClick={addRow}>{Icon.plus}Add a word</button></header>
  <div className="ed-toolbar">{rows.length>0&&<label className="ed-search">{Icon.search}<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a word" aria-label="Find a word to edit"/></label>}{rows.length>0&&<span className="ed-count">{rows.length} {rows.length===1?'word':'words'}</span>}</div>

  <div className="ed-list">{visible.map(row=>{
   const open=expanded.includes(row.id),first=firstDefinition(row);
   return <article className={`ed-card ${open?'is-open':''} ${newIds.includes(row.id)?'is-new':''}`} id={'word-'+row.id} key={row.id}>
    <div className="ed-card-head">
     <input id={'term-'+row.id} className="ed-term" aria-label="Word" placeholder="New word" value={row.term} onChange={e=>patch(row.id,{term:e.target.value})}/>
     <Select label="Part of speech" value={row.partOfSpeech||'Noun'} options={(parts.includes(row.partOfSpeech)||!row.partOfSpeech?parts:[row.partOfSpeech,...parts]).map(p=>({value:p,label:p}))} onChange={partOfSpeech=>patch(row.id,{partOfSpeech})} className="ed-pos"/>
     <button type="button" className="ed-summary" onClick={()=>toggle(row.id)} aria-expanded={open} aria-controls={'detail-'+row.id}>
      <span className="ed-summary-text">{open?'':first||'No definition yet'}</span>
      <span className="ed-summary-meta">{row.senses.length} {row.senses.length===1?'definition':'definitions'}</span>
      <span className="ed-chevron">{Icon.chevron}</span>
     </button>
     <button type="button" className="ed-icon-button is-danger" onClick={()=>setConfirmDelete(row.id)} aria-label={`Delete ${row.term||'this word'}`} data-tip="Delete word">{Icon.trash}</button>
    </div>
    {open&&<div className="ed-body" id={'detail-'+row.id}>
     <div className="ed-meanings">
      {row.senses.map((sense,index)=><div className="ed-meaning" key={sense.id}>
       <span className="ed-meaning-number" aria-label={`Definition ${index+1}`}>{index+1}</span>
       <div className="ed-meaning-fields">
        <div className="ed-node-head"><span className="ed-node-title">Definition {index+1}</span>
         <div className="ed-node-actions"><OrderButtons name={`definition ${index+1}`} index={index} count={row.senses.length} onMove={direction=>patch(row.id,{senses:moveItem(row.senses,index,direction)})}/>
          <button type="button" className="ed-icon-button ed-meaning-remove" aria-label={`Remove definition ${index+1}`} title="Remove definition" onClick={()=>patch(row.id,{senses:row.senses.filter(s=>s.id!==sense.id)})}>{Icon.trash}</button>
         </div></div>
        <label className="ed-field"><span>Meaning {sense.subdefinitions.length>0?'(optional when lettered definitions are used)':''}</span>
         <textarea rows={2} placeholder={sense.subdefinitions.length?'Optional general definition':'What does it mean?'} value={sense.definition} onChange={e=>changeSense(row,sense.id,{definition:e.target.value})}/></label>
        <ExamplesEditor examples={sense.examples} label={`definition ${index+1}`} onChange={examples=>changeSense(row,sense.id,{examples})}/>
        {sense.subdefinitions.length>0&&<div className="ed-subdefinitions">
         {sense.subdefinitions.map((sub,j)=><div className="ed-subdefinition" key={sub.id}>
          <span className="ed-sub-letter" aria-label={`Subdefinition ${index+1}${letterFor(j)}`}>{letterFor(j)}.</span>
          <div className="ed-sub-fields"><div className="ed-node-head"><span className="ed-node-title">Subdefinition {index+1}{letterFor(j)}</span>
            <div className="ed-node-actions"><OrderButtons name={`subdefinition ${index+1}${letterFor(j)}`} index={j} count={sense.subdefinitions.length} onMove={direction=>changeSense(row,sense.id,{subdefinitions:moveItem(sense.subdefinitions,j,direction)})}/>
             <button type="button" className="ed-icon-button" aria-label={`Remove subdefinition ${index+1}${letterFor(j)}`} title="Remove subdefinition" onClick={()=>changeSense(row,sense.id,{subdefinitions:sense.subdefinitions.filter(item=>item.id!==sub.id)})}>{Icon.trash}</button>
            </div></div>
           <label className="ed-field"><span>Meaning</span><textarea rows={2} placeholder="What does this usage mean?" value={sub.definition} onChange={e=>changeSubdefinition(row,sense.id,sub.id,{definition:e.target.value})}/></label>
           <ExamplesEditor numbering="alpha" examples={sub.examples} label={`subdefinition ${index+1}${letterFor(j)}`} onChange={examples=>changeSubdefinition(row,sense.id,sub.id,{examples})}/>
          </div>
         </div>)}
        </div>}
        <button type="button" className="ed-text-button ed-add-subdefinition" onClick={()=>changeSense(row,sense.id,{subdefinitions:[...sense.subdefinitions,{...newSubdefinition(),position:sense.subdefinitions.length}]})}>{Icon.plus}Add subdefinition</button>
       </div>
      </div>)}
      <button type="button" className="ed-add-meaning" onClick={()=>patch(row.id,{senses:[...row.senses,{...newSense(),position:row.senses.length}]})}>{Icon.plus}Add definition</button>
     </div>
     <aside className="ed-side">
      <PronunciationFields term={row.term} value={{ipa:row.pronunciation,readablePronunciation:row.readablePronunciation,readableManuallyEdited:row.readableManuallyEdited}} onChange={v=>patch(row.id,{pronunciation:v.ipa,readablePronunciation:v.readablePronunciation,readableManuallyEdited:v.readableManuallyEdited})}/>
      {relations.map(key=><RelatedTerms key={key} label={labels[key]} singular={singular[key]} items={row[key]} onChange={items=>patch(row.id,{[key]:items})}/>)}
     </aside>
    </div>}
   </article>})}
   {rows.length===0?<div className="ed-empty"><strong>No words yet.</strong><span>Add your first word to start your library.</span><button type="button" className="primary-button" onClick={addRow}>{Icon.plus}Add your first word</button></div>
    :visible.length===0&&search.trim()?<div className="ed-empty"><strong>No words match “{search.trim()}”.</strong><button type="button" className="ed-text-button" onClick={()=>setSearch('')}>Clear search</button></div>:null}
   {rows.length>0&&<button type="button" className="ed-add-word" onClick={addRow}>{Icon.plus}Add a word</button>}
  </div>

  {message&&<div className="error" role="alert">{message}</div>}
  <div className="ed-savebar"><span className={dirty?'is-dirty':''}>{status}</span><div><button className="quiet-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={busy||!dirty} onClick={()=>void save()}>{busy?'Saving…':'Save changes'}</button></div></div>

  {confirmDelete&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirmDelete(null)}} onKeyDown={e=>{if(e.key==='Escape')setConfirmDelete(null)}}><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Delete {rows.find(r=>r.id===confirmDelete)?.term.trim()||'this word'}?</h2><p>It disappears when you save. Cancel brings it back.</p><div className="dialog-actions"><button autoFocus className="quiet-button" onClick={()=>setConfirmDelete(null)}>Keep it</button><button className="delete-confirm" onClick={()=>removeRow(confirmDelete)}>Delete</button></div></div></div>}
 </section>;
}
