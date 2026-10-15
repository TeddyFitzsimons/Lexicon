import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {WordLibrary} from './components/WordLibrary';
import {ManageWords} from './components/ManageWords';
import {StudyView} from './components/StudyView';
import {loadWords,saveWords} from './lib/storage';
import {withoutWord,type Word} from './lib/words';
import './style.css';

type Page='library'|'manage'|'study';
function App(){
  const [words,setWords]=useState<Word[]>([]);
  const [page,setPage]=useState<Page>('library');
  const [focusId,setFocusId]=useState<string|null>(null);
  const [addOnOpen,setAddOnOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [deleteId,setDeleteId]=useState<string|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{loadWords().then(data=>{setWords(data);setLoaded(true)}).catch(e=>setError(`Unable to load vocabulary: ${String(e)}`))},[]);
  /** All mutations write the local JSON file before updating visible state. */
  async function persist(next:Word[]){setBusy(true);setError('');try{await saveWords(next);setWords(next);return true}catch(e){setError(`Save failed: ${String(e)}`);return false}finally{setBusy(false)}}
  function openManage(id:string|null=null,add=false){setFocusId(id);setAddOnOpen(add);setPage('manage');window.scrollTo({top:0,behavior:'instant'})}
  function leaveManage(){setPage('library');setFocusId(null);setAddOnOpen(false);window.scrollTo({top:0,behavior:'instant'})}
  async function toggleFavorite(id:string){await persist(words.map(w=>w.id===id?{...w,favorite:!w.favorite}:w))}
  return <div className="app-shell"><header className="site-header"><div className="brand" onClick={leaveManage} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')leaveManage()}}><img src="/lexicon-mark.png" className="brand-logo" alt=""/><div className="brand-name">Lexicon<span className="brand-period">.</span></div></div><div className="header-right"><span className="local-status"><span className="status-dot"/> On this device</span><span className="word-counter">{words.length} {words.length===1?'word':'words'}</span></div></header>
  <main className="page"><nav className="workspace-nav" aria-label="Main navigation"><div className="workspace-tabs"><button className={page==='library'?'selected':''} onClick={leaveManage}>Library</button><button className={page==='manage'?'selected':''} onClick={()=>openManage()}>Manage words</button><button className={page==='study'?'selected':''} onClick={()=>setPage('study')}>Study</button></div><span className="workspace-caption">Your personal vocabulary, kept on this device</span></nav>
  {error&&<div className="error" role="alert">{error}</div>}{!loaded&&!error&&<div className="panel loading">Loading vocabulary…</div>}
  {loaded&&page==='library'&&<WordLibrary words={words} query={query} setQuery={setQuery} onEdit={w=>openManage(w.id)} onDelete={id=>setDeleteId(id)} onFavorite={id=>void toggleFavorite(id)} onStudy={()=>setPage('study')} onAdd={()=>openManage(null,true)} busy={busy}/>}
  {loaded&&page==='manage'&&<ManageWords key={`${focusId||'all'}-${addOnOpen}`} words={words} focusId={focusId} addOnOpen={addOnOpen} busy={busy} onSave={persist} onCancel={leaveManage}/>}
  {loaded&&page==='study'&&<StudyView words={words}/>}
  {deleteId&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDeleteId(null)}}><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Delete this word?</h2><p>This removes the vocabulary entry from your library. You cannot undo it after saving.</p><div className="dialog-actions"><button className="quiet-button" onClick={()=>setDeleteId(null)}>Cancel</button><button className="delete-confirm" disabled={busy} onClick={()=>{void persist(withoutWord(words,deleteId)).then(ok=>{if(ok)setDeleteId(null)})}}>Delete word</button></div></div></div>}
  <footer>Lexicon <span>·</span> Saved to <code>data/vocabulary.json</code> on this computer</footer></main></div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
