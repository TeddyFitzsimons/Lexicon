import {useEffect,useMemo,useRef,useState} from 'react';
import type {Word} from '../lib/words';
import {meaningQuestions,type MeaningOption,type MeaningQuestion} from '../lib/definitionGame';
import {shuffle,type Segment} from '../lib/gameText';
import {canSpeak,speakWord} from '../lib/speech';
import '../meaningGame.css';

const ROUND_SIZE=10;
const letter=(i:number)=>String.fromCharCode(65+i);

/** Renders a definition with hidden words shown as blanks, or revealed once the answer is checked. */
function Masked({segments,reveal}:{segments:Segment[];reveal:boolean}){
 return <>{segments.map((s,i)=>s.hidden
  ?<span key={i} className={'masked-word'+(reveal?' revealed':'')} aria-label={reveal?undefined:'hidden word'}>{reveal?s.text:<span aria-hidden="true">{'\u2009'}</span>}</span>
  :<span key={i}>{s.text}</span>)}</>;
}

export function DefinitionGame({words,onAdd,onFinish}:{words:Word[];onAdd:()=>void;onFinish?:()=>void}){
 const available=useMemo(()=>meaningQuestions(words),[words]);
 const [round,setRound]=useState<MeaningQuestion[]>(()=>shuffle(available).slice(0,ROUND_SIZE));
 const [index,setIndex]=useState(0),[selected,setSelected]=useState<string|null>(null),[checked,setChecked]=useState(false);
 const [score,setScore]=useState(0),[missed,setMissed]=useState<MeaningQuestion[]>([]),[finished,setFinished]=useState(false);
 const next=useRef<HTMLButtonElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const current=round[index];
 const choice:MeaningOption|undefined=current?.options.find(o=>o.id===selected);
 const answer=current?.options.find(o=>o.correct);
 const correct=!!choice?.correct;

 useEffect(()=>{if(checked)next.current?.focus()},[checked]);
 useEffect(()=>{if(finished){heading.current?.focus();onFinish?.()}},[finished]);
 // Letter or number keys pick an option; nothing else is intercepted.
 useEffect(()=>{
  function onKey(e:KeyboardEvent){
   if(!current||checked||finished||e.metaKey||e.ctrlKey||e.altKey)return;
   const target=e.target as HTMLElement|null;if(target&&/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))return;
   const key=e.key.toLowerCase();
   const i=/^[1-9]$/.test(key)?Number(key)-1:/^[a-z]$/.test(key)?key.charCodeAt(0)-97:-1;
   if(i>=0&&i<current.options.length){e.preventDefault();setSelected(current.options[i].id)}
  }
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[current,checked,finished]);

 function start(source=available){setRound(shuffle(source).slice(0,ROUND_SIZE));setIndex(0);setSelected(null);setChecked(false);setScore(0);setMissed([]);setFinished(false)}
 function check(){if(checked||!choice||!current)return;setChecked(true);if(choice.correct)setScore(n=>n+1);else setMissed(list=>[...list,current])}
 function advance(){if(index===round.length-1)setFinished(true);else{setIndex(i=>i+1);setSelected(null);setChecked(false)}}

 const percent=round.length?Math.round(score/round.length*100):0;
 return <section className="sentence-game meaning-game"><header className="game-heading"><div><h1>Pick the meaning</h1><p>One word, five definitions. Only one belongs to it.</p></div></header>
 {!current?<div className="game-empty"><img src="/lexicon-professor.png" alt="Lexicon’s green cardinal waving"/><h2>This game needs a few more words.</h2><p>Save at least two different words with definitions. The more you add, the more choices each question gets, up to five.</p><button className="primary-button" onClick={onAdd}>Add words</button></div>
 :finished?<div className="game-finish"><img src="/lexicon-professor.png" alt="Lexicon’s green cardinal waving"/><h2 ref={heading} tabIndex={-1}>{score===round.length?'You knew every meaning.':'Round complete'}</h2>
  <div className="meaning-score" aria-label={`Score: ${score} out of ${round.length}`}><span className="meaning-score-number">{score}</span><span className="meaning-score-total">/ {round.length}</span></div><p>You matched <strong>{score} of {round.length}</strong> words to their meaning ({percent}%).</p>
  {missed.length>0&&<div className="game-review"><h3>Meanings to revisit</h3>{missed.map(q=><div key={q.id}><strong>{q.term}</strong><p>{q.definition}</p></div>)}</div>}
  <div className="game-finish-actions"><button className="primary-button" onClick={()=>start()}>Play another round</button>{missed.length>0&&<button className="quiet-button" onClick={()=>start(missed)}>Practice missed words</button>}</div></div>
 :<>
  <div className="game-progress"><span>Question {index+1} of {round.length}</span><span>{score} correct</span></div><div className="game-track" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={round.length} aria-valuenow={index+(checked?1:0)}><div style={{width:`${(index+(checked?1:0))/round.length*100}%`}}/></div>
  <div className="game-scene meaning-scene"><div className="game-bubble meaning-bubble"><div className="meaning-term-row"><h2 className="meaning-term" lang="en">{current.term}</h2>{canSpeak()&&<button className="sound-button" onClick={()=>speakWord(current.term)} aria-label={`Hear ${current.term} pronounced`} data-tip={`Hear ${current.term}`}><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Zm12-1a6 6 0 0 1 0 8m2-11a10 10 0 0 1 0 14"/></svg></button>}</div><div className="meaning-meta"><span className="meaning-pos">{current.partOfSpeech}</span>{current.pronunciation&&<span className="meaning-pron">{current.pronunciation}</span>}</div></div><img className="game-mascot" src="/lexicon-professor.png" alt="Lexicon’s cardinal as a professor with a pointer"/></div>
  <div className="game-answer-area"><p className="game-instruction" id="meaning-instruction">Choose the definition that belongs to <strong>{current.term}</strong>.<span className="keyboard-hint"> Press A–{letter(current.options.length-1)} to pick with your keyboard.</span></p>
   <div className="meaning-options" role="group" aria-labelledby="meaning-instruction">{current.options.map((o,i)=>{const isPicked=selected===o.id;const state=checked?(o.correct?'correct':isPicked?'incorrect':'settled'):isPicked?'selected':'';
    return <button key={o.id} disabled={checked} aria-pressed={isPicked} className={`meaning-option ${state}`} onClick={()=>setSelected(o.id)}><span className="choice-letter">{letter(i)}</span><span className="meaning-option-text"><span className="meaning-option-definition"><Masked segments={o.segments} reveal={checked}/></span>{checked&&<span className="option-owner">{o.correct?<>✓ The meaning of <b>{o.owner}</b></>:isPicked?<>Your pick. This means <b>{o.owner}</b></>:<>This means <b>{o.owner}</b></>}</span>}</span></button>})}</div>
   <div className={'game-feedback '+(checked?(correct?'feedback-correct':'feedback-review'):'')} role="status" aria-live="polite">{checked&&answer&&<><strong>{correct?`Right. That’s what “${current.term}” means.`:`Not quite. That definition belongs to “${choice?.owner}”.`}</strong><p>{correct?'':<><b>{current.term}</b> means: </>}{answer.definition}</p>{current.example&&<p className="meaning-example">“{current.example}”</p>}</>}</div>
   <div className="game-bottom"><span>{checked?'':'No timer.'}</span>{checked?<button ref={next} className="primary-button" onClick={advance}>{index===round.length-1?'See your score':'Next word'}</button>:<button className="primary-button" disabled={!choice} onClick={check}>Check answer</button>}</div></div>
 </>}
 <p className="game-footnote">Wrong answers are definitions of your other words. Any word that would give the answer away is hidden until you check.</p></section>;
}
