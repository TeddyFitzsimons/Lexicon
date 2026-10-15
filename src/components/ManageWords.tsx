import {useEffect,useMemo,useState} from 'react';
import {ChoicePicker} from './SearchPicker';
import {RelatedTerms} from './RelatedTerms';
import {PronunciationFields} from './PronunciationFields';
import {cleaned,emptyDraft,labels,parts,relations,type Draft,type Sense,type Word} from '../lib/words';

type Props = {
  words: Word[];
  focusId: string | null;
  addOnOpen: boolean;
  busy: boolean;
  onSave: (words: Word[]) => Promise<boolean>;
  onCancel: () => void;
};

type EditableWord = Draft & {id:string};

/**
 * A dedicated editing workspace. Edits are staged locally and persisted together
 * only when Save changes is pressed. Cancel never writes to disk.
 */
export function ManageWords({words,focusId,addOnOpen,busy,onSave,onCancel}:Props){
  const [rows,setRows]=useState<EditableWord[]>(()=>words.map(copyWord));
  const [removed,setRemoved]=useState<string[]>([]);
  const [justAdded,setJustAdded]=useState<string|null>(null);
  const [expanded,setExpanded]=useState<string[]>(focusId?[focusId]:[]);
  const [search,setSearch]=useState('');
  const [message,setMessage]=useState('');
  const [confirmDelete,setConfirmDelete]=useState<string|null>(null);
  const [dirty,setDirty]=useState(false);

  function copyWord(word:Word):EditableWord {
    return {...word,senses:word.senses.map(s=>({...s,examples:[...s.examples]})),examples:[...word.examples],synonyms:word.synonyms.map(x=>({...x})),antonyms:word.antonyms.map(x=>({...x})),relatedForms:word.relatedForms.map(x=>({...x}))};
  }
  function addRow(){
    const id=crypto.randomUUID();
    setRows(prev=>[...prev,{...emptyDraft(),id}]);
    setExpanded(prev=>[...prev,id]);
    setSearch('');setDirty(true);setJustAdded(id);
    window.requestAnimationFrame(()=>document.getElementById('row-'+id)?.scrollIntoView({behavior:'smooth',block:'center'}));
  }
  useEffect(()=>{if(addOnOpen)addRow();},[]);
  const visible=useMemo(()=>rows.filter(row=>[row.term,row.partOfSpeech,...row.senses.map(s=>s.definition)].join(' ').toLowerCase().includes(search.toLowerCase())),[rows,search]);
  function patch(id:string,update:Partial<EditableWord>){setRows(prev=>prev.map(w=>w.id===id?{...w,...update}:w));setDirty(true);setMessage('')}
  function changeSense(row:EditableWord,senseId:string,update:Partial<Sense>){patch(row.id,{senses:row.senses.map(s=>s.id===senseId?{...s,...update}:s)})}
  function removeRow(id:string){
    setRows(prev=>prev.filter(w=>w.id!==id));
    setRemoved(prev=>[...prev,id]);setConfirmDelete(null);setDirty(true);
  }
  async function save(){
    const incomplete=rows.find(w=>!w.term.trim()||!w.senses.some(s=>s.definition.trim()));
    if(incomplete){setExpanded(prev=>[...new Set([...prev,incomplete.id])]);setMessage('Every word needs a term and at least one definition.');document.getElementById('row-'+incomplete.id)?.scrollIntoView({behavior:'smooth',block:'center'});return}
    const invalid=rows.flatMap(w=>relations.flatMap(key=>w[key].filter(item=>item.url.trim()&&!/^https:\/\/(www\.)?merriam-webster\.com\/dictionary\/[^\s]+$/i.test(item.url.trim()))));
    if(invalid.length){setMessage('Dictionary links must be Merriam-Webster dictionary URLs beginning with https://www.merriam-webster.com/dictionary/.');return;}
    const result=rows.map(w=>cleaned(w,w.id));
    if(await onSave(result))onCancel();
  }
  function toggleExpanded(id:string){setExpanded(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])}
  return <section className="manage-page">
    <div className="manage-heading"><div><button className="back-link" onClick={onCancel}>← Back to library</button><div className="eyebrow">YOUR VOCABULARY WORKSPACE</div><h1>Manage words</h1><p>Add words, revise meanings, or remove entries. Nothing changes on disk until you save.</p></div><button className="primary-button" onClick={addRow}>＋ Add new word</button></div>
    <div className="manage-search"><span aria-hidden="true">⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a word to edit…" aria-label="Find a word to edit"/><span>{rows.length} {rows.length===1?'word':'words'}</span></div>
    <div className="manage-table-header"><span>WORD</span><span>PART OF SPEECH</span><span>DEFINITIONS</span><span>ACTIONS</span></div>
    <div className="manage-rows">{visible.map(row=><article className="manage-row" id={'row-'+row.id} key={row.id}>
      <div className="manage-row-top"><input className="manage-term" aria-label="Word" placeholder="Enter a word" value={row.term} onChange={e=>patch(row.id,{term:e.target.value})}/><ChoicePicker value={row.partOfSpeech} options={parts} onChange={partOfSpeech=>patch(row.id,{partOfSpeech})}/><button className="meaning-toggle" onClick={()=>toggleExpanded(row.id)} aria-expanded={expanded.includes(row.id)}>{row.senses.length} {row.senses.length===1?'meaning':'meanings'} <span>{expanded.includes(row.id)?'⌃':'⌄'}</span></button><div className="manage-row-actions"><button className="row-edit" onClick={()=>toggleExpanded(row.id)} aria-label={'Toggle details for '+row.term}>{expanded.includes(row.id)?'Collapse':'Details'}</button><button className="trash-button" onClick={()=>setConfirmDelete(row.id)} title={'Delete '+(row.term||'word')} aria-label={'Delete '+(row.term||'word')}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 4h4m-8 3 1 13h10l1-13M10 11v6m4-6v6"/></svg></button></div></div>
      {expanded.includes(row.id)&&<div className="manage-detail">
        <div className="manage-senses"><div className="detail-label">Definitions <span>· At least one required</span></div>{row.senses.map((sense,index)=><div className="manage-sense" key={sense.id}><div className="sense-heading"><strong>Meaning {index+1}</strong>{row.senses.length>1&&<button className="text-button" onClick={()=>patch(row.id,{senses:row.senses.filter(s=>s.id!==sense.id)})}>Remove meaning</button>}</div><textarea aria-label={'Meaning '+(index+1)+' definition'} placeholder="What does this word mean?" rows={2} value={sense.definition} onChange={e=>changeSense(row,sense.id,{definition:e.target.value})}/>{sense.examples.map((example,i)=><div className="example-line" key={i}><input aria-label={'Example sentence '+(i+1)} placeholder="Example sentence (optional)" value={example} onChange={e=>changeSense(row,sense.id,{examples:sense.examples.map((x,j)=>j===i?e.target.value:x)})}/><button className="icon-button" onClick={()=>changeSense(row,sense.id,{examples:sense.examples.filter((_,j)=>j!==i)})} aria-label="Remove example">×</button></div>)}<button className="text-button" onClick={()=>changeSense(row,sense.id,{examples:[...sense.examples,'']})}>＋ Add example sentence</button></div>)}<button className="quiet-button add-inline" onClick={()=>patch(row.id,{senses:[...row.senses,{id:crypto.randomUUID(),definition:'',examples:[]}]})}>＋ Add another definition</button></div>
        <div className="manage-other"><PronunciationFields term={row.term} value={{ipa:row.pronunciation,readablePronunciation:row.readablePronunciation,readableManuallyEdited:row.readableManuallyEdited}} onChange={value=>patch(row.id,{pronunciation:value.ipa,readablePronunciation:value.readablePronunciation,readableManuallyEdited:value.readableManuallyEdited})}/>{relations.map(key=><RelatedTerms key={key} label={labels[key]} items={row[key]} onChange={items=>patch(row.id,{[key]:items})}/>)}</div>
      </div>}
    </article>)}<button className="quiet-button manage-add-another" onClick={addRow}>＋ Add another word</button>{visible.length===0&&<div className="manage-empty">No matching words. Try a different search.</div>}</div>
    {justAdded&&<div className="manage-added-hint" role="status">New word added to this editing session. Add another, or save everything together below.</div>}
    {message&&<div className="error" role="alert">{message}</div>}
    <div className="manage-savebar"><span>{dirty?`${removed.length?removed.length+' removed · ':''}Unsaved changes`:'No changes yet'}</span><div><button className="quiet-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={busy||!dirty} onClick={()=>void save()}>{busy?'Saving…':'Save changes'} <span aria-hidden="true">→</span></button></div></div>
    {confirmDelete&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirmDelete(null)}}><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Remove this word?</h2><p>It will be removed from the editing list. You can still cancel before saving.</p><div className="dialog-actions"><button className="quiet-button" onClick={()=>setConfirmDelete(null)}>Keep word</button><button className="delete-confirm" onClick={()=>removeRow(confirmDelete)}>Remove word</button></div></div></div>}
  </section>;
}
