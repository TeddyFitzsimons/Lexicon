import {Fragment,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {WordLibrary} from './components/WordLibrary';
import {ManageWords} from './components/ManageWords';
import {StudyView} from './components/StudyView';
import {Games,type GameId} from './components/Games';
import {TestView} from './components/TestView';
import {Profile} from './components/Profile';
import {Welcome} from './components/Welcome';
import {NavIcon} from './components/NavIcon';
import {Quote} from './components/Quote';
import {pageQuote} from './lib/quotes';
import {loadProfile,loadWords,saveProfile,saveWords} from './lib/storage';
import {emptyProfile,logBatch,record,type ActivityKind,type Profile as ProfileData} from './lib/activity';
import type {NavIconName} from './components/NavIcon';
import {withoutWord,type Word} from './lib/words';
import './style.css';
import './controls.css';
import './game.css';
import './polished.css';
import './components.css';
import './theme.css';

type Page='library'|'manage'|'study'|'game'|'test'|'profile';
const pages:{id:Page;label:string;icon:NavIconName}[]=[
 {id:'library',label:'My library',icon:'library'},{id:'manage',label:'Manage words',icon:'manage'},{id:'study',label:'Flashcards',icon:'study'},{id:'game',label:'Games',icon:'game'},{id:'test',label:'Tests',icon:'test'},{id:'profile',label:'Profile',icon:'profile'}];

function App(){
 const [words,setWords]=useState<Word[]>([]),[page,setPage]=useState<Page>('library');
 const [focusId,setFocusId]=useState<string|null>(null),[addOnOpen,setAddOnOpen]=useState(false);
 const [visit,setVisit]=useState(0),[game,setGame]=useState<GameId|null>(null);
 const [query,setQuery]=useState(''),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false);
 const [deleteId,setDeleteId]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [profile,setProfile]=useState<ProfileData>(emptyProfile);
 const profileRef=useRef(profile);
 useEffect(()=>{loadWords().then(data=>{setWords(data);setLoaded(true)}).catch(e=>setError(`Couldn’t load your words: ${String(e)}`))},[]);
 useEffect(()=>{loadProfile().then(p=>{profileRef.current=p;setProfile(p)}).catch(e=>setError(`Couldn’t load your profile: ${String(e)}`))},[]);
 /** Applies a change to the profile and writes it to data/profile.json. Uses a ref so rapid events never drop each other. */
 function updateProfile(change:(p:ProfileData)=>ProfileData){
  const next=change(profileRef.current);if(next===profileRef.current)return;
  profileRef.current=next;setProfile(next);
  saveProfile(next).catch(e=>setError(`Couldn’t save your profile: ${String(e)}`));
 }
 const track=(kind:ActivityKind,amount=1)=>updateProfile(p=>record(p,kind,amount));
 useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(''),3000);return()=>window.clearTimeout(timer)},[notice]);
 /** Saves the library; new ids count as words added today, other saves as edits. */
 async function persist(next:Word[],imported=false,from=''){setBusy(true);setError('');try{await saveWords(next);
  const before=new Set(words.map(w=>w.id)),newTerms=next.filter(w=>!before.has(w.id)).map(w=>w.term.trim()),added=newTerms.length;
  setWords(next);setNotice(imported?`Added ${added} ${added===1?'word':'words'}`:'Saved');
  if(added)updateProfile(p=>logBatch(p,imported?'imported':'added',newTerms,from));else if(!imported)track('edited');
  return true}catch(e){setError(`Save failed: ${String(e)}`);return false}finally{setBusy(false)}}
 /** Every navigation is a fresh visit: pages remount, so the banner and quotes change. */
 function navigate(next:Page,options:{game?:GameId}={}){setPage(next);setGame(options.game??null);setFocusId(null);setAddOnOpen(false);setVisit(v=>v+1);window.scrollTo({top:0,behavior:'instant'})}
 function openManage(id:string|null=null,add=false){navigate('manage');setFocusId(id);setAddOnOpen(add)}
 const home=()=>navigate('library');
 return <div className="app-shell">
  <header className="site-header"><div className="brand" onClick={home} role="button" tabIndex={0} aria-label="Lexicon, back to library" onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();home()}}}><img src="/lexicon-mark.png" className="brand-logo" alt=""/><div className="brand-name">Lexicon</div></div><div className="header-right"><span className="local-status"><span className="status-dot"/>Saved on this device</span></div></header>
  <main className="page">
   <nav className="workspace-nav" aria-label="Main navigation"><div className="workspace-tabs">{pages.map(item=><Fragment key={item.id}>{item.id==='profile'&&<span className="nav-divider" role="separator" aria-orientation="horizontal"/>}<button className={page===item.id?'selected':''} aria-current={page===item.id?'page':undefined} onClick={()=>navigate(item.id)}><NavIcon name={item.icon}/>{item.label}</button></Fragment>)}</div><Quote quote={pageQuote()} className="sidebar-quote workspace-caption"/></nav>
   {error&&<div className="error" role="alert">{error}</div>}{!loaded&&!error&&<div className="panel loading">Loading your words…</div>}
   {loaded&&page==='library'&&<div key={visit}><Welcome words={words} onGame={g=>navigate('game',{game:g})} onTest={()=>navigate('test')} onStudy={()=>navigate('study')} onAdd={()=>openManage(null,true)}/><WordLibrary words={words} query={query} setQuery={setQuery} onEdit={w=>openManage(w.id)} onDelete={setDeleteId} onFavorite={id=>void persist(words.map(w=>w.id===id?{...w,favorite:!w.favorite}:w))} onStudy={()=>navigate('study')} onAdd={()=>openManage(null,true)} busy={busy}/></div>}
   {loaded&&page==='manage'&&<ManageWords key={`${visit}-${focusId||'all'}-${addOnOpen}`} words={words} focusId={focusId} addOnOpen={addOnOpen} busy={busy} onSave={persist} onCancel={home}/>}
   {loaded&&page==='study'&&<StudyView key={visit} words={words} onStart={()=>track('studied')}/>}
   {loaded&&page==='game'&&<Games key={visit} initial={game} words={words} onAdd={()=>openManage(null,true)} onFinish={()=>track('practiced')}/>}
   {loaded&&page==='test'&&<TestView key={visit} words={words} onAdd={()=>openManage(null,true)} onSubmit={()=>track('tested')}/>}
   {loaded&&page==='profile'&&<Profile key={visit} words={words} profile={profile} onRename={name=>updateProfile(p=>({...p,name}))} onShared={()=>track('shared')} onImport={(incoming,from)=>persist([...words,...incoming],true,from)}/>}
   {deleteId&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDeleteId(null)}} onKeyDown={e=>{if(e.key==='Escape')setDeleteId(null)}}><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Delete {words.find(w=>w.id===deleteId)?.term||'this word'}?</h2><p>This removes it from your library for good.</p><div className="dialog-actions"><button autoFocus className="quiet-button" onClick={()=>setDeleteId(null)}>Keep it</button><button className="delete-confirm" disabled={busy} onClick={()=>void persist(withoutWord(words,deleteId)).then(ok=>{if(ok)setDeleteId(null)})}>Delete</button></div></div></div>}
   <div role="status" aria-live="polite">{notice&&<div className="save-toast">{notice}</div>}</div>
  </main>
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
