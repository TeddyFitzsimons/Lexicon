import {useEffect,useState,type FormEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {WordEditor} from './components/WordEditor';
import {WordLibrary} from './components/WordLibrary';
import {StudyView} from './components/StudyView';
import {cleaned,emptyDraft,withoutWord,labels,type Draft,type Relation,type Word} from './lib/words';
import {loadWords,saveWords} from './lib/storage';
import './style.css';

function App(){
  const [words,setWords]=useState<Word[]>([]);
  const [draft,setDraft]=useState<Draft>(emptyDraft());
  const [editingId,setEditingId]=useState<string|null>(null);
  const [pending,setPending]=useState<{source:string;relation:Relation}|null>(null);
  const [tab,setTab]=useState<'library'|'study'>('library');
  const [deleteTarget,setDeleteTarget]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [editorOpen,setEditorOpen]=useState(false);
  const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');

  useEffect(()=>{loadWords().then(data=>{setWords(data);setLoaded(true)}).catch(e=>setError(`Unable to load vocabulary: ${String(e)}`))},[]);
  /** Update UI only after disk persistence succeeds. */
  async function persist(next:Word[]){setBusy(true);setError('');try{await saveWords(next);setWords(next);return true}catch(e){setError(`Save failed: ${String(e)}`);return false}finally{setBusy(false)}}
  function reset(){setDraft(emptyDraft());setEditingId(null);setPending(null);setEditorOpen(false)}
  function scrollToEditor(){setTab('library');setEditorOpen(true)}
  function edit(word:Word){setDraft({...word,examples:[...word.examples],synonyms:[...word.synonyms],antonyms:[...word.antonyms],relatedForms:[...word.relatedForms]});setEditingId(word.id);setPending(null);scrollToEditor()}
  function createLinked(source:string,relation:Relation){reset();setPending({source,relation});scrollToEditor()}
  async function save(event:FormEvent){event.preventDefault();if(!draft.term.trim()||!draft.senses.some(s=>s.definition.trim()))return;
    const id=editingId||crypto.randomUUID();const word=cleaned(draft,id);
    let next=editingId?words.map(w=>w.id===id?word:w):[...words,word];
    // Creating a linked card also updates the source card atomically in one file write.
    if(pending)next=next.map(w=>w.id===pending.source?{...w,[pending.relation]:[...new Set([...w[pending.relation],id])]}:w);
    if(await persist(next))reset();
  }
  async function remove(id:string){if(await persist(withoutWord(words,id))&&editingId===id)reset();setDeleteTarget(null)}
  async function toggleFavorite(id:string){await persist(words.map(w=>w.id===id?{...w,favorite:!w.favorite}:w))}
  const pendingLabel=pending?`This card will be linked to “${words.find(w=>w.id===pending.source)?.term||'word'}” under ${labels[pending.relation].toLowerCase()}.`:undefined;
  return <div className="app-shell">
    <header className="site-header">
      <div className="brand">
        <img src="/lexicon-mark.png" className="brand-logo" alt="" />
        <div className="brand-name">Lexicon<span className="brand-period">.</span></div>
      </div>
      <div className="header-right">
        <span className="local-status"><span className="status-dot"/> On this device</span>
        <span className="word-counter">{words.length} {words.length===1?'word':'words'}</span>
      </div>
    </header>
    <main className="page">
      <nav className="workspace-nav" aria-label="Main navigation">
        <div className="workspace-tabs" role="tablist" aria-label="Sections">
          <button role="tab" aria-selected={tab==='library'} className={tab==='library'?'selected':''} onClick={()=>setTab('library')}>Library</button>
          <button role="tab" aria-selected={tab==='study'} className={tab==='study'?'selected':''} onClick={()=>setTab('study')}>Study</button>
        </div>
        <span className="workspace-caption">Your personal vocabulary, kept on this device</span>
      </nav>
            {error&&<div className="error" role="alert">{error}</div>}{!loaded&&!error&&<div className="panel loading">Loading vocabulary…</div>}{loaded&&(tab==='library'?<WordLibrary words={words} query={query} setQuery={setQuery} onEdit={edit} onDelete={setDeleteTarget} onFavorite={id=>void toggleFavorite(id)} onLink={createLinked} onStudy={()=>setTab('study')} onAdd={()=>{reset();setEditorOpen(true)}} busy={busy}/>:<StudyView words={words}/>)}
      {editorOpen&&<div className="modal-backdrop editor-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)reset()}}><div className="editor-dialog" role="dialog" aria-modal="true" aria-label={editingId?'Edit word':'Add a word'}><button className="close-editor" aria-label="Close editor" onClick={reset}>×</button><WordEditor draft={draft} onChange={setDraft} onSave={save} onCancel={reset} editing={!!editingId} busy={busy} words={words} editingId={editingId} pendingLabel={pendingLabel}/></div></div>}
      {deleteTarget&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDeleteTarget(null)}}><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Delete this word?</h2><p>“{words.find(w=>w.id===deleteTarget)?.term}” will be removed from your library and from any linked cards.</p><div className="dialog-actions"><button className="quiet-button" onClick={()=>setDeleteTarget(null)}>Cancel</button><button className="delete-confirm" disabled={busy} onClick={()=>void remove(deleteTarget)}>Delete word</button></div></div></div>}<footer>Lexicon <span>·</span> Saved to <code>data/vocabulary.json</code> on this computer</footer></main></div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
