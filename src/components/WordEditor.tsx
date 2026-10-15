import {useState, type FormEvent} from 'react';
import {SearchPicker, ChoicePicker} from './SearchPicker';
import {parts,relations,labels,type Draft,type Relation,type Word} from '../lib/words';

type Props={draft:Draft;onChange:(d:Draft)=>void;onSave:(e:FormEvent)=>void;onCancel:()=>void;editing:boolean;busy:boolean;words:Word[];editingId:string|null;pendingLabel?:string};
export function WordEditor({draft,onChange,onSave,onCancel,editing,busy,words,editingId,pendingLabel}:Props){
  const [expanded,setExpanded]=useState(true);
  const update=(patch:Partial<Draft>)=>onChange({...draft,...patch});
  function updateRelation(key:Relation,id:string){if(!id)return;update({[key]:[...new Set([...draft[key],id])]} as Partial<Draft>)}
  return <section className="panel editor" id="word-editor">
    <div className="panel-heading"><div><div className="eyebrow">WORD EDITOR</div><h2>{editing?'Edit vocabulary':'Add a word'}</h2><p className="subtle">{pendingLabel||'Build your personal vocabulary, one word at a time.'}</p></div></div>
    <form onSubmit={onSave}>
      <div className="form-grid"><label>Term <span className="required">*</span><input autoFocus required placeholder="e.g. Incredulous" value={draft.term} onChange={e=>update({term:e.target.value})}/></label><div className="field-stack"><span className="field-label">Part of speech</span><ChoicePicker value={draft.partOfSpeech} options={parts} onChange={partOfSpeech=>update({partOfSpeech})}/></div></div>
      <label className="favorite-toggle"><input type="checkbox" checked={draft.favorite} onChange={e=>update({favorite:e.target.checked})}/> ★ Add to favorites</label>
      <label>Definition <span className="required">*</span><textarea rows={3} required placeholder="What does this word mean?" value={draft.definition} onChange={e=>update({definition:e.target.value})}/></label>
      <div className="optional-head"><div><h3>Additional details</h3><p className="subtle">Everything below is optional. Add only what helps you remember.</p></div><button type="button" className="text-button" onClick={()=>setExpanded(!expanded)}>{expanded?'Hide':'Show'} details {expanded?'−':'+'}</button></div>
      {expanded&&<div className="optional-fields">
        <label>Pronunciation <span className="optional">Optional</span><input placeholder="e.g. /ɪnˈkrɛdʒələs/" value={draft.pronunciation} onChange={e=>update({pronunciation:e.target.value})}/></label>
        <div className="field-label">Example sentences <span className="optional">Optional</span></div>
        {draft.examples.map((example,i)=><div className="example-line" key={i}><textarea rows={2} aria-label={`Example sentence ${i+1}`} placeholder="Use the word in a sentence" value={example} onChange={e=>update({examples:draft.examples.map((v,j)=>i===j?e.target.value:v)})}/><button className="icon-button" type="button" aria-label={`Remove example ${i+1}`} title="Remove example" onClick={()=>update({examples:draft.examples.filter((_,j)=>i!==j)})}>×</button></div>)}
        <button className="quiet-button add-inline" type="button" onClick={()=>update({examples:[...draft.examples,'']})}>+ Add example sentence</button>
        <div className="relations-editor">{relations.map(key=><div className="relation-group" key={key}><div className="field-label">{labels[key]} <span className="optional">Optional</span></div><div className="pill-row">{draft[key].map(id=>{const word=words.find(w=>w.id===id);return <button className="pill" key={id} type="button" onClick={()=>update({[key]:draft[key].filter(x=>x!==id)} as Partial<Draft>)} title="Remove link">{word?.term||'Missing card'} <span aria-hidden="true">×</span></button>})}</div><SearchPicker label={`Add ${labels[key].toLowerCase()}`} options={words.filter(w=>w.id!==editingId&&!draft[key].includes(w.id)).map(w=>({id:w.id,label:w.term,detail:w.definition}))} onSelect={id=>updateRelation(key,id)}/></div>)}</div>
        <p className="hint">Each linked word is a complete, editable card. Save this word first, then use “Create linked card” in the library to add new ones.</p>
      </div>}
      <div className="editor-actions"><button type="submit" className="primary-button" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Save word'} <span aria-hidden="true">→</span></button>{(editing||pendingLabel)&&<button type="button" className="quiet-button" onClick={onCancel}>Cancel</button>}</div>
    </form>
  </section>;
}
