import {useEffect,useMemo,useRef,useState} from 'react';
import type {Word} from '../lib/words';
import {answerKey,shuffle} from '../lib/gameText';
import {MAX_ATTEMPTS,hintsFor,letterCount,letterPattern,spellQuestions,type SpellQuestion} from '../lib/spellGame';
import {canSpeak,speakWord} from '../lib/speech';
import '../spellGame.css';

const ROUND_SIZE=10;
type Status='playing'|'solved'|'revealed';
type Outcome={q:SpellQuestion;misses:number;solved:boolean};

/** Hear a word, type its spelling. Each miss unlocks a clue; the fourth miss shows the answer. */
export function SpellGame({words,onAdd,onFinish}:{words:Word[];onAdd:()=>void;onFinish?:()=>void}){
 const available=useMemo(()=>spellQuestions(words),[words]);
 const audio=canSpeak();
 const [round,setRound]=useState(()=>shuffle(available).slice(0,ROUND_SIZE));
 const [index,setIndex]=useState(0),[answer,setAnswer]=useState(''),[misses,setMisses]=useState(0),[status,setStatus]=useState<Status>('playing');
 const [lastWrong,setLastWrong]=useState(''),[results,setResults]=useState<Outcome[]>([]),[finished,setFinished]=useState(false);
 const input=useRef<HTMLInputElement>(null),next=useRef<HTMLButtonElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const current=round[index];
 // Without audio the meaning is the only way to know the word, so it shows from the start.
 const hints=hintsFor(misses),showMeaning=hints.meaning||!audio;

 useEffect(()=>{if(current&&audio&&!finished)speakWord(current.term)},[index,round]);
 useEffect(()=>{if(status==='playing')input.current?.focus();else next.current?.focus()},[status,index]);
 useEffect(()=>{if(finished){heading.current?.focus();onFinish?.()}},[finished]);

 function start(source=available){setRound(shuffle(source).slice(0,ROUND_SIZE));setIndex(0);setAnswer('');setMisses(0);setStatus('playing');setLastWrong('');setResults([]);setFinished(false)}
 function check(){
  if(status!=='playing'||!answer.trim()||!current)return;
  if(answerKey(answer)===answerKey(current.term)){setStatus('solved');setResults(r=>[...r,{q:current,misses,solved:true}]);return}
  const m=misses+1;setMisses(m);setLastWrong(answer.trim());setAnswer('');
  if(m>=MAX_ATTEMPTS)reveal(m);
 }
 function reveal(m=misses){setStatus('revealed');setResults(r=>[...r,{q:current,misses:m,solved:false}])}
 function advance(){if(index===round.length-1)setFinished(true);else{setIndex(i=>i+1);setAnswer('');setMisses(0);setStatus('playing');setLastWrong('')}}

 const solved=results.filter(r=>r.solved).length,firstTry=results.filter(r=>r.solved&&r.misses===0).length,missed=results.filter(r=>!r.solved);
 return <section className="sentence-game spell-game"><header className="game-heading"><div><h1>Spell It</h1><p>Hear the word, then type how it’s spelled. Every miss gives you a clue.</p></div></header>
 {!current?<div className="game-empty"><img src="/lexicon-studying.png" alt=""/><h2>This game needs some words.</h2><p>Add a word with a definition and it becomes a spelling question.</p><button className="primary-button" onClick={onAdd}>Add words</button></div>
 :finished?<div className="game-finish"><img src="/lexicon-studying.png" alt=""/><h2 ref={heading} tabIndex={-1}>{solved===round.length?'Every word spelled.':'Round complete'}</h2>
  <p>You spelled <strong>{solved} of {round.length}</strong>, {firstTry} on the first try.</p>
  {missed.length>0&&<div className="game-review"><h3>Spellings to revisit</h3>{missed.map(r=><div key={r.q.id}><strong>{r.q.term}</strong><p>{r.q.definition.map(s=>s.text).join('')}</p></div>)}</div>}
  <div className="game-finish-actions"><button className="primary-button" onClick={()=>start()}>Play another round</button>{missed.length>0&&<button className="quiet-button" onClick={()=>start(missed.map(r=>r.q))}>Practice missed words</button>}</div></div>
 :<>
  <div className="game-progress"><span>Word {index+1} of {round.length}</span><span>{solved} spelled</span></div><div className="game-track" role="progressbar" aria-label="Words finished" aria-valuemin={0} aria-valuemax={round.length} aria-valuenow={results.length}><div style={{width:`${results.length/round.length*100}%`}}/></div>
  <div className="spell-stage">
   {audio?<div className="spell-listen">
     <button type="button" className="spell-play" onClick={()=>speakWord(current.term)} aria-label="Hear the word again"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Zm12-1a6 6 0 0 1 0 8m2-11a10 10 0 0 1 0 14"/></svg></button>
     <div><strong>Hear it</strong><button type="button" className="ed-text-button" onClick={()=>speakWord(current.term,0.55)}>Play slowly</button></div>
    </div>:<p className="spell-noaudio">Audio isn’t available in this browser, so spell the word from its meaning.</p>}
   <span className="spell-pos">{current.partOfSpeech.toLowerCase()}</span>
   {(hints.pattern>0||status!=='playing')&&<div className="spell-pattern" aria-label={status==='playing'?`${letterCount(current.term)} letters, starting with ${current.term[0]}`:current.term}>
    {letterPattern(current.term,status==='playing'?hints.pattern:99).map((c,i)=>c===' '?<span key={i} className="spell-gap"/>:<span key={i} className={`spell-letter ${c===null?'is-hidden':''} ${status!=='playing'?'is-revealed':''}`}>{status!=='playing'?[...current.term][i]:c??''}</span>)}
   </div>}
   {status==='playing'&&hints.pattern>0&&<p className="spell-count">{letterCount(current.term)} letters</p>}
  </div>
  <div className="game-answer-area">
   {(showMeaning||hints.example)&&status==='playing'&&<div className="spell-clues">
    {showMeaning&&<p><span>Meaning</span>{current.definition.map((s,i)=>s.hidden?<span key={i} className="masked-word" aria-label="hidden word"><span aria-hidden="true">{'\u2009'}</span></span>:<span key={i}>{s.text}</span>)}</p>}
    {hints.example&&current.example&&<p><span>In a sentence</span><em>{current.example}</em></p>}
   </div>}
   {status==='playing'?<form className="spell-form" onSubmit={e=>{e.preventDefault();check()}}>
     <label className="sr-only" htmlFor="spell-answer">Spelling</label>
     <input ref={input} id="spell-answer" className="game-type-input" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Type the spelling" value={answer} onChange={e=>setAnswer(e.target.value)}/>
     <button className="primary-button" disabled={!answer.trim()}>Check</button>
    </form>
   :<div className={'game-feedback '+(status==='solved'?'feedback-correct':'feedback-review')} role="status"><strong>{status==='solved'?(misses===0?'Spelled right first time.':`Got it after ${misses} ${misses===1?'miss':'misses'}.`):`It’s spelled “${current.term}”.`}</strong><p>{current.definition.map(s=>s.text).join('')}</p></div>}
   <div className="spell-status" role="status" aria-live="polite">{status==='playing'&&misses>0&&<><b>“{lastWrong}” isn’t it.</b> {misses<MAX_ATTEMPTS-1?`${MAX_ATTEMPTS-misses} tries left. A new clue is showing.`:'Last try.'}</>}</div>
   <div className="game-bottom"><span>{status==='playing'&&misses>0&&<button type="button" className="ed-text-button" onClick={()=>reveal()}>Show the answer</button>}</span>{status!=='playing'&&<button ref={next} className="primary-button" onClick={advance}>{index===round.length-1?'See results':'Next word'}</button>}</div>
  </div>
 </>}
 </section>;
}
