import {useEffect,useMemo,useRef,useState,type DragEvent} from 'react';
import type {Word} from '../lib/words';
import {MAX_NAME,batchStats,calendarWeeks,level,milestones,streaks,wordBatches,type Metric,type Milestone,type Profile as ProfileData} from '../lib/activity';
import {MAX_FILE_BYTES,buildShareFile,parseImport,shareFileName,toLibraryWords,type ParsedImport} from '../lib/share';
import {fromDayKey} from '../lib/dates';
import {Disclosure,Segmented} from './Select';
import {backupFileName,buildBackup,parseRestore,MAX_RESTORE_BYTES,type Restore} from '../lib/backup';
import {isDesktop,saveTextFile} from '../lib/platform';
import {showDataFolder} from '../lib/storage';
import '../profile.css';

export type RestoreData={words?:Word[];profile?:ProfileData};
type Props={words:Word[];profile:ProfileData;onRename:(name:string)=>void;onShared:()=>void;onImport:(words:Word[],from:string)=>Promise<boolean>;onRestore:(data:RestoreData)=>Promise<boolean>};
const WEEKS=52;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const longDate=(key:string)=>fromDayKey(key).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});

function NameField({name,onRename}:{name:string;onRename:(n:string)=>void}){
 // Shown as text (wraps, never clips); becomes a text box only while editing.
 const [editing,setEditing]=useState(false),[value,setValue]=useState(name);
 const input=useRef<HTMLInputElement>(null),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>setValue(name),[name]);
 useEffect(()=>{if(editing){input.current?.focus();input.current?.select()}},[editing]);
 function finish(save:boolean){
  const next=value.trim().slice(0,MAX_NAME);
  if(save&&next!==name)onRename(next);
  setValue(save?next:name);setEditing(false);requestAnimationFrame(()=>button.current?.focus());
 }
 if(editing)return <label className="pf-name is-editing"><span className="sr-only">Your name</span>
  <input ref={input} value={value} maxLength={MAX_NAME} placeholder="Your name" spellCheck={false} onChange={e=>setValue(e.target.value)} onBlur={()=>finish(true)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();finish(true)}if(e.key==='Escape'){e.preventDefault();finish(false)}}}/>
 </label>;
 return <h1 className="pf-name"><button ref={button} type="button" className={name?'':'is-empty'} onClick={()=>setEditing(true)} aria-label={name?`${name}, edit your name`:'Add your name'}>
  <span>{name||'Add your name'}</span>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4"/></svg>
 </button></h1>;
}

function ActivityCalendar({profile}:{profile:ProfileData}){
 const [metric,setMetric]=useState<Metric>('active');
 const weeks=useMemo(()=>calendarWeeks(profile,metric,WEEKS),[profile,metric]);
 // A month label goes on the week its first day falls in, skipped if it would crowd the previous label.
 const monthLabels=useMemo(()=>{let last=-9;return weeks.map((w,i)=>{const first=w.find(c=>c.key.endsWith('-01'));if(!first||i-last<3)return '';last=i;return MONTHS[first.month]})},[weeks]);
 const scroller=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=scroller.current;if(el)el.scrollLeft=el.scrollWidth},[]);
 const s=streaks(profile,metric);
 const [tip,setTip]=useState<{text:string;x:number;y:number}|null>(null);
 const card=useRef<HTMLElement>(null);
 function showTip(e:React.PointerEvent<HTMLSpanElement>,text:string){
  const box=card.current?.getBoundingClientRect(),cell=e.currentTarget.getBoundingClientRect();
  if(box)setTip({text,x:cell.left+cell.width/2-box.left,y:cell.top-box.top});
 }
 const noun=metric==='active'?'things done':'words added';
 return <section className="pf-card pf-activity" aria-labelledby="activity-title" ref={card}>
  <div className="pf-card-head"><h2 id="activity-title">Activity</h2><Segmented label="Calendar shows" value={metric} onChange={setMetric} options={[{value:'active',label:'Active days'},{value:'added',label:'Words added'}]}/></div>
  <p className="pf-summary">Past year. {metric==='active'?`Active on ${s.days} ${s.days===1?'day':'days'}`:`Added words on ${s.days} ${s.days===1?'day':'days'}`}. Current run {s.current}, best {s.longest}.</p>
  <div className="pf-cal-scroll" ref={scroller}><div className={`pf-cal is-${metric}`} aria-hidden="true" style={{gridTemplateColumns:`28px repeat(${weeks.length},minmax(var(--cell),1fr))`}}>
   <span/>{monthLabels.map((m,i)=><span key={i} className="pf-month">{m}</span>)}
   {[0,1,2,3,4,5,6].map(d=><div key={d} style={{display:'contents'}}><span className="pf-weekday">{d===1?'Mon':d===3?'Wed':d===5?'Fri':''}</span>
    {weeks.map(w=>{const c=w[d];const label=`${longDate(c.key)}: ${c.value?`${c.value} ${noun}`:metric==='active'?'no activity':'no words added'}`;return <span key={c.key} className={`pf-cell l${c.future?'x':level(c.value)}`} onPointerEnter={c.future?undefined:e=>showTip(e,label)} onPointerLeave={()=>setTip(null)}/>})}</div>)}
  </div></div>
  {tip&&<div className="pf-tip" style={{left:tip.x,top:tip.y}} aria-hidden="true">{tip.text}</div>}
  <div className="pf-legend" aria-hidden="true"><span>Less</span>{[0,1,2,3,4].map(l=><span key={l} className={`pf-cell l${l} is-${metric}`}/>)}<span>More</span></div>
 </section>;
}

function Share({words,name,onShared}:{words:Word[];name:string;onShared:()=>void}){
 const [scope,setScope]=useState<'all'|'favorites'>('all');
 const chosen=scope==='all'?words:words.filter(w=>w.favorite);
 const json=()=>JSON.stringify(buildShareFile(chosen,name),null,2);
 const make=()=>new File([json()],shareFileName(name),{type:'application/json'});
 const canNativeShare=!isDesktop()&&typeof navigator!=='undefined'&&!!navigator.canShare&&navigator.canShare({files:[new File(['{}'],'x.json',{type:'application/json'})]});
 const [error,setError]=useState('');
 async function download(){setError('');try{if(await saveTextFile(shareFileName(name),json()))onShared()}catch(e){setError(`Couldn’t save the file: ${e instanceof Error?e.message:String(e)}`)}}
 async function share(){try{await navigator.share({files:[make()],title:'My Lexicon'});onShared()}catch{/* closed the share sheet */}}
 return <section className="pf-card" aria-labelledby="share-title">
  <h2 id="share-title">Share your Lexicon</h2>
  <p className="pf-text">Send your words as a file. Whoever opens it in their Lexicon can add them to their library. Favorites and your activity stay private.</p>
  <Segmented label="Words to share" value={scope} onChange={setScope} options={[{value:'all',label:'All words',detail:words.length},{value:'favorites',label:'Favorites',detail:words.filter(w=>w.favorite).length}]}/>
  <div className="pf-actions"><button className="primary-button" disabled={!chosen.length} onClick={()=>void download()}>{isDesktop()?'Save share file…':'Download share file'}</button>{canNativeShare&&<button className="quiet-button" disabled={!chosen.length} onClick={()=>void share()}>Share…</button>}</div>
  {!name.trim()&&<p className="pf-note">Add your name above so friends know who it’s from.</p>}
  {error&&<p className="pf-error" role="alert">{error}</p>}
 </section>;
}

function Import({words,onImport}:{words:Word[];onImport:(w:Word[],from:string)=>Promise<boolean>}){
 const [parsed,setParsed]=useState<ParsedImport|null>(null);
 const [picked,setPicked]=useState<Set<string>>(new Set());
 const [dragging,setDragging]=useState(false),[done,setDone]=useState('');
 const input=useRef<HTMLInputElement>(null);
 async function read(file:File|undefined){
  setDone('');if(!file)return;
  if(file.size>MAX_FILE_BYTES){setParsed({ok:false,error:'That file is over 2 MB. Lexicon share files are much smaller.'});return}
  const result=parseImport(await file.text(),words);
  setParsed(result);if(result.ok)setPicked(new Set(result.items.filter(i=>!i.duplicate).map(i=>i.word.term)));
 }
 function onDrop(e:DragEvent){e.preventDefault();setDragging(false);void read(e.dataTransfer.files[0])}
 async function accept(terms:Set<string>){
  if(!parsed?.ok)return;
  const chosen=parsed.items.filter(i=>!i.duplicate&&terms.has(i.word.term)).map(i=>i.word);
  if(chosen.length&&await onImport(toLibraryWords(chosen),parsed.from)){setDone(`Added ${chosen.length} ${chosen.length===1?'word':'words'}${parsed.from?` from ${parsed.from}`:''}.`);setParsed(null)}
 }
 const fresh=parsed?.ok?parsed.items.filter(i=>!i.duplicate):[];
 const toggle=(t:string)=>setPicked(p=>{const n=new Set(p);n.has(t)?n.delete(t):n.add(t);return n});
 return <section className="pf-card pf-import" aria-labelledby="import-title">
  <h2 id="import-title">Add words from a file</h2>
  {!parsed?.ok&&<>
   <div className={`pf-drop ${dragging?'is-dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}>
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V4m0 0L8 8m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/></svg>
    <p><b>Drop a Lexicon file here</b> or</p>
    <button type="button" className="quiet-button" onClick={()=>input.current?.click()}>Choose a file</button>
    <input ref={input} type="file" accept=".json,application/json" hidden onChange={e=>{void read(e.target.files?.[0]);e.target.value=''}}/>
   </div>
   {parsed&&!parsed.ok&&<p className="pf-error" role="alert">{parsed.error}</p>}
   {done&&<p className="pf-done" role="status">{done}</p>}
   <Disclosure label="Which files work?" className="pf-format">
    <p>Share files from Lexicon, or any JSON list of words. Each word needs a <code>term</code> and either a <code>definition</code> or <code>senses</code> (which may hold lettered <code>subsenses</code>). Words you already have are skipped.</p>
    <pre>{`[
  { "term": "placid", "partOfSpeech": "Adjective",
    "definition": "Calm and peaceful.",
    "examples": ["The placid lake reflected the hills."] }
]`}</pre></Disclosure>
  </>}
  {parsed?.ok&&<div className="pf-preview">
   <p className="pf-text">{parsed.from?<><b>{parsed.from}</b> shared</>:'This file has'} {parsed.items.length} {parsed.items.length===1?'word':'words'}. {fresh.length} {fresh.length===1?'is':'are'} new to you{parsed.rejected.length?`, ${parsed.rejected.length} couldn’t be read`:''}.</p>
   <ul className="pf-incoming">{parsed.items.map(({word,duplicate})=><li key={word.term}>
    <button type="button" role="checkbox" aria-checked={duplicate?false:picked.has(word.term)} disabled={duplicate} className="pf-check-row" onClick={()=>toggle(word.term)}>
     <span className="pf-check" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg></span>
     <span className="pf-incoming-text"><b>{word.term}</b><small>{word.senses.flatMap(s=>[s.definition,...(s.subsenses||[]).map(x=>x.definition)]).find(Boolean)}</small></span>
     {duplicate&&<span className="pf-tag">Already saved</span>}
    </button></li>)}</ul>
   {parsed.rejected.length>0&&<Disclosure label={`${parsed.rejected.length} skipped ${parsed.rejected.length===1?'entry':'entries'}`} className="pf-format"><ul>{parsed.rejected.slice(0,20).map((r,i)=><li key={i}>{r}</li>)}</ul></Disclosure>}
   <div className="pf-actions">
    <button className="primary-button" disabled={!fresh.length} onClick={()=>void accept(new Set(fresh.map(i=>i.word.term)))}>Accept all {fresh.length}</button>
    {picked.size>0&&picked.size<fresh.length&&<button className="quiet-button" onClick={()=>void accept(picked)}>Add {picked.size} selected</button>}
    <button className="ed-text-button" onClick={()=>setParsed(null)}>Cancel</button>
   </div>
  </div>}
 </section>;
}

const countWords=(n:number)=>`${n} ${n===1?'word':'words'}`;
const shortDate=(iso:string)=>new Date(iso).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});

/** Everything on this device in one file, and the way back. Restoring replaces; it never merges. */
function Backup({words,profile,onRestore}:{words:Word[];profile:ProfileData;onRestore:(data:RestoreData)=>Promise<boolean>}){
 const desktop=isDesktop();
 const [pending,setPending]=useState<Extract<Restore,{ok:true}>|null>(null);
 const [error,setError]=useState(''),[done,setDone]=useState(''),[working,setWorking]=useState(false);
 const input=useRef<HTMLInputElement>(null);
 const fail=(what:string,e:unknown)=>setError(`${what}: ${e instanceof Error?e.message:String(e)}`);
 async function backUp(){
  setError('');setDone('');
  try{if(await saveTextFile(backupFileName(),JSON.stringify(buildBackup(words,profile),null,2)))setDone(`Backed up ${countWords(words.length)} and your activity.`)}
  catch(e){fail('Couldn’t save the backup',e)}
 }
 async function choose(list:FileList|null){
  setError('');setDone('');
  const files=[...(list||[])];if(!files.length)return;
  if(files.reduce((n,f)=>n+f.size,0)>MAX_RESTORE_BYTES){setError('Those files are too large to be a Lexicon backup.');return}
  const result=parseRestore(await Promise.all(files.map(async f=>({name:f.name,text:await f.text()}))));
  if(result.ok)setPending(result);else setError(result.error);
 }
 async function confirm(){
  if(!pending)return;setWorking(true);
  const ok=await onRestore({words:pending.words,profile:pending.profile});
  setWorking(false);setPending(null);
  if(ok)setDone(pending.words?`Restored ${countWords(pending.words.length)}${pending.profile?' and your activity':''}.`:'Restored your activity.');
 }
 const incoming=pending?[pending.words&&countWords(pending.words.length),pending.profile&&`activity from ${Object.keys(pending.profile.days).length} ${Object.keys(pending.profile.days).length===1?'day':'days'}`].filter(Boolean).join(' and '):'';
 const replaced=pending?[pending.words&&`the ${countWords(words.length)}`,pending.profile&&'the activity and streaks'].filter(Boolean).join(' and '):'';
 return <section className="pf-card pf-backup" aria-labelledby="backup-title">
  <h2 id="backup-title">Back up and restore</h2>
  <p className="pf-text">A backup is one file with every word, your favorites, your activity and your streaks. Keep it somewhere safe. Restoring a backup replaces what’s on this device.</p>
  <div className="pf-actions">
   <button className="primary-button" onClick={()=>void backUp()}>{desktop?'Back up…':'Download backup'}</button>
   <button className="quiet-button" onClick={()=>input.current?.click()}>Restore from backup</button>
   {desktop&&<button className="ed-text-button" onClick={()=>void showDataFolder().catch(e=>fail('Couldn’t open the folder',e))}>Show data folder</button>}
   <input ref={input} type="file" multiple accept=".json,application/json" hidden onChange={e=>{void choose(e.target.files);e.target.value=''}}/>
  </div>
  <Disclosure label="Moving from the web version?" className="pf-format">
   <p>Choose <code>vocabulary.json</code> and <code>profile.json</code> together from the <code>data</code> folder of your old Lexicon. Your words keep their favorites and dates, and your streaks come with them.</p>
  </Disclosure>
  {error&&<p className="pf-error" role="alert">{error}</p>}
  {done&&<p className="pf-done" role="status">{done}</p>}
  {pending&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!working)setPending(null)}} onKeyDown={e=>{if(e.key==='Escape'&&!working)setPending(null)}}>
   <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="restore-title" aria-describedby="restore-body">
    <h2 id="restore-title">Replace what’s here?</h2>
    <p id="restore-body">This brings in {incoming}{pending.exportedAt?`, backed up ${shortDate(pending.exportedAt)}`:''}. It replaces {replaced} on this device.{pending.words&&!pending.profile?' Your activity stays as it is.':''}{!pending.words&&pending.profile?' Your words stay as they are.':''}{desktop?' A copy of what you have now is kept in the data folder.':''}</p>
    <div className="dialog-actions"><button autoFocus className="quiet-button" disabled={working} onClick={()=>setPending(null)}>Keep what I have</button><button className="primary-button" disabled={working} onClick={()=>void confirm()}>Replace</button></div>
   </div>
  </div>}
 </section>;
}

const timeOf=(iso:string)=>new Date(iso).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
const dayOf=(iso:string)=>{const d=new Date(iso),t=new Date(),y=new Date();y.setDate(t.getDate()-1);
 return d.toDateString()===t.toDateString()?'Today':d.toDateString()===y.toDateString()?'Yesterday':d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:d.getFullYear()===t.getFullYear()?undefined:'numeric'})};
const SHOWN_WORDS=8,PAGE=12;

function WordsAdded({profile,words}:{profile:ProfileData;words:Word[]}){
 const batches=useMemo(()=>wordBatches(profile,words),[profile,words]);
 const stats=batchStats(batches);
 const [limit,setLimit]=useState(PAGE),[open,setOpen]=useState<Set<string>>(new Set());
 const groups:{day:string;items:typeof batches}[]=[];
 for(const b of batches.slice(0,limit)){const day=dayOf(b.at);const g=groups[groups.length-1];if(g?.day===day)g.items.push(b);else groups.push({day,items:[b]})}
 return <section className="pf-card pf-feed" aria-labelledby="feed-title">
  <div className="pf-card-head"><h2 id="feed-title">Words added</h2></div>
  {stats?<dl className="pf-feed-stats">
   <div><dt>Times you added words</dt><dd>{stats.batches}</dd></div>
   <div><dt>Average per time</dt><dd>{stats.average}</dd></div>
   <div><dt>Most at once</dt><dd>{stats.biggest.count}<small>{dayOf(stats.biggest.at)}</small></dd></div>
  </dl>:<p className="pf-text">Each time you save new words, or accept them from a file, it shows up here with how many you added at once.</p>}
  {groups.map(g=><div className="pf-feed-day" key={g.day}><h3>{g.day}</h3><ol>{g.items.map(b=>{
   const id=b.at+b.kind,expanded=open.has(id),shown=expanded?b.words:b.words.slice(0,SHOWN_WORDS),hidden=b.count-shown.length;
   return <li key={id} className={`pf-batch is-${b.kind}`}>
    <span className="pf-batch-count"><b>{b.count}</b><small>{b.count===1?'word':'words'}</small></span>
    <div className="pf-batch-body">
     <p><span>{b.kind==='imported'?<>From <b>{b.from||'a shared file'}</b></>:'Added by you'}</span>{!b.approximate&&<span className="pf-batch-time">{timeOf(b.at)}</span>}</p>
     <ul className="pf-batch-words">{shown.map((w,i)=><li key={i}>{w}</li>)}
      {hidden>0&&(b.words.length>shown.length
       ?<li><button type="button" className="pf-more" onClick={()=>setOpen(o=>new Set(o).add(id))}>+{b.words.length-shown.length} more</button></li>
       :<li className="pf-more-static">+{hidden} more</li>)}
     </ul>
    </div>
   </li>})}</ol></div>)}
  {batches.length>limit&&<button type="button" className="quiet-button pf-feed-more" onClick={()=>setLimit(l=>l+PAGE)}>Show earlier</button>}
 </section>;
}

/** A trophy cup in the milestone's metal, engraved with its mark. */
export function Trophy({milestone,size=52}:{milestone:Milestone;size?:number}){
 const id=`cup-${milestone.id}`;
 return <svg className={`pf-trophy is-${milestone.tier}`} width={size} height={size*1.12} viewBox="0 0 50 56" aria-hidden="true">
  <defs><linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor="var(--t-dark)"/><stop offset=".35" stopColor="var(--t-light)"/><stop offset=".6" stopColor="var(--t-mid)"/><stop offset="1" stopColor="var(--t-dark)"/></linearGradient></defs>
  <path d="M12 9H5.5a1.5 1.5 0 0 0-1.5 1.6c.4 6.6 3.7 11.4 10.3 12.6M38 9h6.5a1.5 1.5 0 0 1 1.5 1.6c-.4 6.6-3.7 11.4-10.3 12.6" fill="none" stroke="var(--t-dark)" strokeWidth="2.6" strokeLinecap="round"/>
  <path d="M11 5h28v12c0 9-6.2 15.5-14 15.5S11 26 11 17Z" fill={`url(#${id})`} stroke="var(--t-dark)" strokeWidth="1.4"/>
  <path d="M15.5 8.5v8" stroke="#ffffff8c" strokeWidth="2.4" strokeLinecap="round"/>
  <path d="M21.5 32h7l1.5 9h-10Z" fill="var(--t-mid)" stroke="var(--t-dark)" strokeWidth="1.2"/>
  <rect x="13" y="41" width="24" height="9" rx="2" fill="#1A3A2C"/><rect x="16" y="43.6" width="18" height="3.8" rx="1" fill="var(--t-light)" opacity=".85"/>
  <text x="25" y="22.5" textAnchor="middle" fontFamily="Fraunces,Georgia,serif" fontWeight="700" fontSize={milestone.mark.length>2?9:11} fill="var(--t-ink)">{milestone.mark}</text>
 </svg>;
}

function TrophyShelf({earned}:{earned:Milestone[]}){
 if(!earned.length)return null;
 return <section className="pf-shelf" aria-labelledby="trophies-title">
  <h3 id="trophies-title">Trophies <span>{earned.length}</span></h3>
  <ul>{earned.map(m=><li key={m.id} data-tip={m.detail}><Trophy milestone={m}/><span>{m.title}</span></li>)}</ul>
 </section>;
}

/** Name, activity and sharing. The name is only used here and in files you share. */
export function Profile({words,profile,onRename,onShared,onImport,onRestore}:Props){
 const active=streaks(profile,'active'),added=streaks(profile,'added');
 const badges=milestones(profile,words.length);
 const earned=badges.filter(b=>b.earned).length;
 return <section className="pf-page">
  <header className="pf-hero">
   <div className="pf-hero-top"><div className="pf-hero-copy"><NameField name={profile.name} onRename={onRename}/><p>Your name only appears here and on files you share.</p></div><img className="pf-hero-bird" src="/lexicon-studying.png" alt=""/></div>
   <TrophyShelf earned={badges.filter(b=>b.earned)}/>
   <dl className="pf-stats">
    <div className="is-streak"><dt>Current streak</dt><dd>{active.current}<small>{active.current===1?'day':'days'}</small></dd></div>
    <div><dt>Longest streak</dt><dd>{active.longest}<small>{active.longest===1?'day':'days'}</small></dd></div>
    <div><dt>Active days</dt><dd>{active.days}</dd></div>
    <div><dt>Days adding words</dt><dd>{added.days}</dd></div>
    <div><dt>Words</dt><dd>{words.length}</dd></div>
   </dl>
  </header>
  <ActivityCalendar profile={profile}/>
  <WordsAdded profile={profile} words={words}/>
  <section className="pf-card" aria-labelledby="badges-title"><div className="pf-card-head"><h2 id="badges-title">Milestones</h2><span className="pf-count">{earned} of {badges.length}</span></div>
   <ul className="pf-badges">{badges.map(b=><li key={b.id} className={b.earned?'is-earned':''}><span className="pf-badge-mark" aria-hidden="true">{b.earned?<Trophy milestone={b} size={26}/>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>}</span><span><b>{b.title}</b><small>{b.detail}</small></span><span className="sr-only">{b.earned?'Earned':'Not yet'}</span></li>)}</ul>
  </section>
  <div className="pf-two"><Share words={words} name={profile.name} onShared={onShared}/><Import words={words} onImport={onImport}/></div>
  <Backup words={words} profile={profile} onRestore={onRestore}/>
 </section>;
}
