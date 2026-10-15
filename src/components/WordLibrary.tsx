import {useState} from 'react';
import {type Relation,type Word} from '../lib/words';

type Props={words:Word[];query:string;setQuery:(q:string)=>void;onEdit:(w:Word)=>void;onDelete:(id:string)=>void;onLink:(source:string,relation:Relation)=>void;onStudy:()=>void;onAdd:()=>void;onFavorite:(id:string)=>void;busy:boolean};

/** Browser speech is optional and requires no remote pronunciation service. */
export function pronounce(term:string){
  if(!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(term);
  utterance.lang='en-US';
  window.speechSynthesis.speak(utterance);
}

export function WordLibrary({words,query,setQuery,onEdit,onDelete,onStudy,onAdd,onFavorite,busy}:Props){
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  const [sort,setSort]=useState<'az'|'za'>('az');
  const [speechFilter,setSpeechFilter]=useState('all');
  const [speechOpen,setSpeechOpen]=useState(false);
  const [speechQuery,setSpeechQuery]=useState('');
  const availableParts=[...new Set(words.map(w=>w.partOfSpeech).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const filtered=words.filter(w=>{
    const searchable=[w.term,w.partOfSpeech,w.pronunciation,...w.senses.flatMap(s=>[s.definition,...s.examples])].join(' ').toLowerCase();
    return searchable.includes(query.toLowerCase())&&(!favoritesOnly||w.favorite)&&(speechFilter==='all'||w.partOfSpeech===speechFilter);
  }).sort((a,b)=>sort==='az'?a.term.localeCompare(b.term):b.term.localeCompare(a.term));
  return <section className="library-home">
    <div className="library-topline"><div><div className="eyebrow">YOUR COLLECTION</div><h2>{favoritesOnly?'Favorites':'My library'} <span className="heading-count">{words.length}</span></h2><p>Browse, revisit, and organize your words.</p></div><button className="primary-button add-word-button" onClick={onAdd}><span aria-hidden="true">＋</span> Add word</button></div>
    <div className="library-toolbar"><div className="search-wrap"><span aria-hidden="true">⌕</span><input aria-label="Search vocabulary" placeholder="Search your words, meanings, and examples…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="collection-switch" role="group" aria-label="Library collection"><button className={!favoritesOnly?'collection-active':''} aria-pressed={!favoritesOnly} onClick={()=>setFavoritesOnly(false)}>All words <span>{words.length}</span></button><button className={favoritesOnly?'collection-active':''} aria-pressed={favoritesOnly} onClick={()=>setFavoritesOnly(true)}>★ Favorites <span>{words.filter(w=>w.favorite).length}</span></button></div><div className="speech-filter"><button className={'filter-button '+(speechFilter!=='all'?'filter-active':'')} aria-expanded={speechOpen} aria-label="Filter by part of speech" onClick={()=>{setSpeechOpen(!speechOpen);setSpeechQuery('')}}>{speechFilter==='all'?'Part of speech':speechFilter} ⌄</button>{speechOpen&&<div className="speech-menu"><input autoFocus aria-label="Search part of speech filters" placeholder="Search parts of speech…" value={speechQuery} onChange={e=>setSpeechQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setSpeechOpen(false)}}/><div className="speech-options">{['all',...availableParts].filter(part=>part==='all'||part.toLowerCase().includes(speechQuery.toLowerCase())).map(part=><button key={part} className={speechFilter===part?'speech-selected':''} onClick={()=>{setSpeechFilter(part);setSpeechOpen(false)}}>{part==='all'?'All parts of speech':part}{speechFilter===part?' ✓':''}</button>)}</div></div>}</div><button className="filter-button" onClick={()=>setSort(sort==='az'?'za':'az')}>Sort {sort==='az'?'A–Z':'Z–A'}</button><button className="filter-button" disabled={!words.length} onClick={onStudy}>Study ↗</button></div>
    <div className="table-shell"><table className="words-table"><thead><tr><th>WORD</th><th>PART OF SPEECH</th><th>DEFINITIONS</th><th>EXAMPLES</th><th aria-label="Actions"></th></tr></thead><tbody>{filtered.map(w=><tr key={w.id}><td><div className="table-word"><button className="term-button" onClick={()=>onEdit(w)} title={`Open ${w.term} in the editor`}>{w.term}</button><button className={'favorite-star favorite-animated '+(w.favorite?'is-favorite':'')} aria-label={w.favorite?`Remove ${w.term} from favorites`:`Add ${w.term} to favorites`} aria-pressed={w.favorite} title={w.favorite?'Remove from favorites':'Add to favorites'} onClick={()=>onFavorite(w.id)} disabled={busy}><svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true"><path d="m12 2.8 2.85 5.78 6.38.93-4.61 4.49 1.09 6.36L12 17.35l-5.71 3.01 1.09-6.36-4.61-4.49 6.38-.93Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill={w.favorite?'currentColor':'none'}/></svg></button><button className="sound-button" onClick={()=>pronounce(w.term)} aria-label={`Hear ${w.term}`}>◖))</button></div>{w.pronunciation&&<small className="pronunciation">{w.pronunciation}</small>}</td><td><span className="speech-chip">{w.partOfSpeech}</span></td><td><div className="definition-cell">{w.senses.slice(0,2).map((s,i)=><div key={s.id}><span className="sense-number">{i+1}.</span> {s.definition}</div>)}{w.senses.length>2&&<small>+{w.senses.length-2} more meanings</small>}</div></td><td className="example-count">{w.senses.reduce((n,s)=>n+s.examples.filter(Boolean).length,0)} sentences</td><td><div className="row-actions"><button onClick={()=>onEdit(w)} aria-label={`Edit ${w.term}`}>Edit</button><button className="delete-action" onClick={()=>onDelete(w.id)} aria-label={`Manage or delete ${w.term}`} disabled={busy}>Delete</button></div></td></tr>)}</tbody></table>{!filtered.length&&<div className="empty-state"><img className="mascot-empty" src="/lexicon-cardinal.png" alt="Lexicon’s green cardinal mascot" /><h3>{words.length?'No words found':'A library begins with one word.'}</h3><p>{words.length?'Try a different search or filter.':'Add a word to start your collection.'}</p><button className="primary-button" onClick={onAdd}>+ Add your first word</button></div>}</div>
    <div className="library-footer">Showing {filtered.length} of {favoritesOnly?words.filter(w=>w.favorite).length:words.length} words</div>
  </section>;
}
