import {useState, type FormEvent} from 'react';
import {ChoicePicker} from './SearchPicker';
import {RelatedTerms} from './RelatedTerms';
import {PronunciationFields} from './PronunciationFields';
import {parts,relations,labels,type Draft,type Word} from '../lib/words';

type Props={draft:Draft;onChange:(d:Draft)=>void;onSave:(e:FormEvent)=>void;onCancel:()=>void;editing:boolean;busy:boolean;words:Word[];editingId:string|null;pendingLabel?:string};
export function WordEditor({draft,onChange,onSave,onCancel,editing,busy,words,editingId,pendingLabel}:Props){
  const [expanded,setExpanded]=useState(true);
  const update=(patch:Partial<Draft>)=>onChange({...draft,...patch});
  return <section className="panel editor" id="word-editor">
    <div className="panel-heading"><div><div className="eyebrow">WORD EDITOR</div><h2>{editing?'Edit vocabulary':'Add a word'}</h2><p className="subtle">{pendingLabel||'Build your personal vocabulary, one word at a time.'}</p></div></div>
    <form onSubmit={onSave}>
      <div className="form-grid"><label>Term <span className="required">*</span><input autoFocus required placeholder="e.g. Incredulous" value={draft.term} onChange={e=>update({term:e.target.value})}/></label><div className="field-stack"><span className="field-label">Part of speech</span><ChoicePicker value={draft.partOfSpeech} options={parts} onChange={partOfSpeech=>update({partOfSpeech})}/></div></div>
      <div className="sense-editor"><div className="section-label">Definitions <span className="required">*</span></div><p className="subtle">Add a separate meaning for each sense of the word.</p>{draft.senses.map((sense,i)=><div className="sense-block" key={sense.id}><div className="sense-heading"><strong>Meaning {i+1}</strong>{draft.senses.length>1&&<button className="text-button" type="button" onClick={()=>update({senses:draft.senses.filter(x=>x.id!==sense.id)})}>Remove</button>}</div><textarea rows={2} required placeholder="Enter a definition" value={sense.definition} onChange={e=>update({senses:draft.senses.map(x=>x.id===sense.id?{...x,definition:e.target.value}:x)})}/><div className="sense-examples">{sense.examples.map((example,j)=><div className="example-line" key={j}><input aria-label={`Example ${j+1} for meaning ${i+1}`} value={example} placeholder="Example sentence (optional)" onChange={e=>update({senses:draft.senses.map(x=>x.id===sense.id?{...x,examples:x.examples.map((v,k)=>k===j?e.target.value:v)}:x)})}/><button type="button" className="icon-button" onClick={()=>update({senses:draft.senses.map(x=>x.id===sense.id?{...x,examples:x.examples.filter((_,k)=>k!==j)}:x)})}>×</button></div>)}<button className="text-button" type="button" onClick={()=>update({senses:draft.senses.map(x=>x.id===sense.id?{...x,examples:[...x.examples,'']}:x)})}>+ Example for this meaning</button></div></div>)}<button className="quiet-button add-inline" type="button" onClick={()=>update({senses:[...draft.senses,{id:crypto.randomUUID(),definition:'',examples:[]}]})}>+ Add another definition</button></div>
      <div className="optional-head"><div><h3>Additional details</h3><p className="subtle">Everything below is optional. Add only what helps you remember.</p></div><button type="button" className="text-button" onClick={()=>setExpanded(!expanded)}>{expanded?'Hide':'Show'} details {expanded?'−':'+'}</button></div>
      {expanded&&<div className="optional-fields">
        <PronunciationFields term={draft.term} value={{ipa:draft.pronunciation,readablePronunciation:draft.readablePronunciation,readableManuallyEdited:draft.readableManuallyEdited}} onChange={value=>update({pronunciation:value.ipa,readablePronunciation:value.readablePronunciation,readableManuallyEdited:value.readableManuallyEdited})}/>
        <div className="relations-editor">{relations.map(key=><RelatedTerms key={key} label={labels[key]} items={draft[key]} onChange={items=>update({[key]:items})}/>)}</div>
      </div>}
      <div className="editor-actions"><button type="submit" className="primary-button" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Save word'} <span aria-hidden="true">→</span></button>{(editing||pendingLabel)&&<button type="button" className="quiet-button" onClick={onCancel}>Cancel</button>}</div>
    </form>
  </section>;
}
