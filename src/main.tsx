import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {WordLibrary} from './components/WordLibrary';
import {ManageWords} from './components/ManageWords';
import {StudyView} from './components/StudyView';
import {SentenceGame} from './components/SentenceGame';
import {Welcome} from './components/Welcome';
import {NavIcon} from './components/NavIcon';
import {loadWords,saveWords} from './lib/storage';
import {withoutWord,type Word} from './lib/words';
import './style.css';
import './controls.css';
import './game.css';
import './polished.css';
type Page='library'|'manage'|'study'|'game';
const pages:{id:Page;label:string}[]=[{id:'library',label:'My library'},{id:'manage',label:'Manage words'},{id:'study',label:'Flashcards'},{id:'game',label:'Sentence game'}];
function App(){
 const [words,setWords]=useState<Word[]>([]),[page,setPage]=useState<Page>('library');
 const [focusId,setFocusId]=useState<string|null>(null),[addOnOpen,setAddOnOpen]=useState(false);
 const [query,setQuery]=useState(''),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false);
 const [deleteId,setDeleteId]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{loadWords().then(data=>{setWords(data);setLoaded(true)}).catch(e=>setError(`Unable to load vocabulary: ${String(e)}`))},[]);
 useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(''),3000);return()=>window.clearTimeout(timer)},[notice]);
 async function persist(next:Word[]){setBusy(true);setError('');try{await saveWords(next);setWords(next);setNotice('Your collection is saved.');return true}catch(e){setError(`Save failed: ${String(e)}`);return false}finally{setBusy(false)}}
 function navigate(next:Page){setPage(next);setFocusId(null);setAddOnOpen(false);window.scrollTo({top:0,behavior:'instant'})}
 function openManage(id:string|null=null,add=false){setFocusId(id);setAddOnOpen(add);setPage('manage');window.scrollTo({top:0,behavior:'instant'})}
 function leaveManage(){navigate('library')}
 return <div className="app-shell"><header className="site-header"><div className="brand" onClick={leaveManage} role="button" tabIndex={0} aria-label="Lexicon, back to library" onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();leaveManage()}}}><img src="/lexicon-mark.png" className="brand-logo" alt=""/><div className="brand-name">Lexicon<span className="brand-period">.</span></div></div><div className="header-right"><span className="local-status"><span className="status-dot"/> Your personal collection</span></div></header>
 <main className="page"><nav className="workspace-nav" aria-label="Main navigation"><div className="workspace-tabs">{pages.map(item=><button key={item.id} className={page===item.id?'selected':''} aria-current={page===item.id?'page':undefined} onClick={()=>navigate(item.id)}><NavIcon name={item.id}/>{item.label}</button>)}</div><div className="workspace-caption"><strong>A word at a time.</strong><span>A little collection, entirely yours.</span></div></nav>
 {error&&<div className="error" role="alert">{error}</div>}{!loaded&&!error&&<div className="panel loading">Getting your words ready…</div>}
 {loaded&&page==='library'&&<><Welcome words={words} onGame={()=>navigate('game')} onStudy={()=>navigate('study')}/><WordLibrary words={words} query={query} setQuery={setQuery} onEdit={w=>openManage(w.id)} onDelete={setDeleteId} onFavorite={id=>void persist(words.map(w=>w.id===id?{...w,favorite:!w.favorite}:w))} onStudy={()=>navigate('study')} onAdd={()=>openManage(null,true)} busy={busy}/></>}
 {loaded&&page==='manage'&&<ManageWords key={`${focusId||'all'}-${addOnOpen}`} words={words} focusId={focusId} addOnOpen={addOnOpen} busy={busy} onSave={persist} onCancel={leaveManage}/>}
 {loaded&&page==='study'&&<StudyView words={words}/>}
 {loaded&&page==='game'&&<SentenceGame words={words} onAdd={()=>openManage()}/>}
 {deleteId&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDeleteId(null)}} onKeyDown={e=>{if(e.key==='Escape')setDeleteId(null)}}><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Delete this word?</h2><p>This removes the entry from your collection. You cannot undo it after saving.</p><div className="dialog-actions"><button autoFocus className="quiet-button" onClick={()=>setDeleteId(null)}>Keep word</button><button className="delete-confirm" disabled={busy} onClick={()=>void persist(withoutWord(words,deleteId)).then(ok=>{if(ok)setDeleteId(null)})}>Delete word</button></div></div></div>}
 <div role="status" aria-live="polite">{notice&&<div className="save-toast">{notice}</div>}</div><footer><span>Lexicon. Keep your curiosity close.</span><span>Saved on this device</span></footer></main></div>
}
createRoot(document.getElementById('root')!).render(<App/>);
