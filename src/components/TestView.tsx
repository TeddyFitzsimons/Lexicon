import {useMemo,useRef,useState,useEffect} from 'react';
import type {Word} from '../lib/words';
import {answerKey,type Segment} from '../lib/gameText';
import {buildTest,gradeQuestion,isAnswered,scoreTest,testableCount,MIN_TEST_WORDS,type AnswerWith,type TestFormat,type TestQuestion,type TestResponse,type TestSettings} from '../lib/test';
import {Segmented} from './Select';
import '../tests.css';

type Scope='all'|'favorites';
type Stage={name:'setup'}|{name:'taking';questions:TestQuestion[];settings:TestSettings}|{name:'results';questions:TestQuestion[];settings:TestSettings};
const formatLabels:Record<TestFormat,string>={choice:'Multiple choice',written:'Written',truefalse:'True or false',mixed:'Mixed'};
const answerLabels:Record<AnswerWith,string>={terms:'Terms',definitions:'Definitions',both:'Both'};
const letter=(i:number)=>String.fromCharCode(65+i);

function Text({segments,reveal=false}:{segments:Segment[];reveal?:boolean}){
 return <>{segments.map((s,i)=>s.hidden?<span key={i} className={'masked-word'+(reveal?' revealed':'')} aria-label={reveal?undefined:'hidden word'}>{reveal?s.text:<span aria-hidden="true">{'\u2009'}</span>}</span>:<span key={i}>{s.text}</span>)}</>;
}
function instruction(q:TestQuestion){
 if(q.kind==='truefalse')return 'True or false?';
 if(q.kind==='choice')return q.prompt==='definition'?'Which word has this meaning?':'What does this word mean?';
 return q.prompt==='definition'?'Write the word that has this meaning.':'Write what this word means.';
}

export function TestView({words,onAdd,onSubmit}:{words:Word[];onAdd:()=>void;onSubmit?:()=>void}){
 const [stage,setStage]=useState<Stage>({name:'setup'});
 const [format,setFormat]=useState<TestFormat>('choice');
 const [answerWith,setAnswerWith]=useState<AnswerWith>('both');
 const [scope,setScope]=useState<Scope>('all');
 const [count,setCount]=useState(10);
 const [responses,setResponses]=useState<Record<string,TestResponse>>({});
 const [confirming,setConfirming]=useState(false);
 const top=useRef<HTMLDivElement>(null);
 const favorites=useMemo(()=>words.filter(w=>w.favorite),[words]);
 const pool=scope==='favorites'?favorites:words;
 const available=testableCount(pool);
 const questionCount=Math.min(Math.max(1,count),Math.max(1,available));
 useEffect(()=>{top.current?.scrollIntoView({block:'start'})},[stage.name]);

 function start(settings:TestSettings,source=pool){setResponses({});setConfirming(false);setStage({name:'taking',settings,questions:buildTest(source,settings)})}
 function respond(id:string,update:TestResponse){setResponses(r=>({...r,[id]:{...r[id],...update}}));setConfirming(false)}

 if(testableCount(words)<MIN_TEST_WORDS)return <section className="test-page" ref={top}><header className="test-head"><h1>Tests</h1></header><div className="game-empty"><img src="/lexicon-test.png" alt=""/><h2>Tests need at least two words.</h2><p>Add words with definitions, then come back to test yourself on them.</p><button className="primary-button" onClick={onAdd}>Add words</button></div></section>;

 if(stage.name==='setup'){
  const presets=[5,10,20].filter(n=>n<available);
  return <section className="test-page" ref={top}>
   <header className="test-head test-head-art"><div><h1>Tests</h1><p>Answer everything, submit, and get a letter grade. Nothing is marked until the end.</p></div><img src="/lexicon-test.png" alt="Lexicon’s cardinal taking a test at a school desk"/></header>
   <div className="test-setup">
    <div className="test-field"><h2 id="f-format">Question type</h2><Segmented label="Question type" value={format} onChange={setFormat} options={(Object.keys(formatLabels) as TestFormat[]).map(v=>({value:v,label:formatLabels[v]}))}/>
     <p className="test-hint">{format==='choice'?'Four options per question.':format==='written'?'Type your answers. Spelling must match for terms.':format==='truefalse'?'Decide whether a definition really belongs to the word.':'Each question gets a random type.'}</p></div>
    <div className="test-field"><h2>Answer with</h2><Segmented label="Answer with" value={answerWith} onChange={setAnswerWith} disabled={format==='truefalse'} options={(Object.keys(answerLabels) as AnswerWith[]).map(v=>({value:v,label:answerLabels[v]}))}/>
     <p className="test-hint">{format==='truefalse'?'True or false always shows a word with a definition.':answerWith==='terms'?'You see a definition and give the word.':answerWith==='definitions'?'You see a word and give its definition.':'A mix of both directions.'}{format!=='choice'&&format!=='truefalse'&&answerWith!=='terms'&&' You mark written definitions yourself after submitting.'}</p></div>
    <div className="test-field"><h2>Words</h2><Segmented label="Words" value={scope} onChange={setScope} options={[{value:'all',label:'All words',detail:testableCount(words)},{value:'favorites',label:'Favorites',detail:testableCount(favorites)}]}/></div>
    <div className="test-field"><h2 id="count-label">Questions</h2>
     <div className="test-count">
      <div className="test-stepper" role="group" aria-labelledby="count-label">
       <button type="button" aria-label="Fewer questions" disabled={questionCount<=1} onClick={()=>setCount(questionCount-1)}>−</button>
       <input type="number" inputMode="numeric" min={1} max={available} aria-labelledby="count-label" value={questionCount} onChange={e=>setCount(Number(e.target.value)||1)}/>
       <button type="button" aria-label="More questions" disabled={questionCount>=available} onClick={()=>setCount(questionCount+1)}>+</button>
      </div>
      <div className="test-presets">{presets.map(n=><button type="button" key={n} className={questionCount===n?'is-selected':''} onClick={()=>setCount(n)}>{n}</button>)}<button type="button" className={questionCount===available?'is-selected':''} onClick={()=>setCount(available)}>All {available}</button></div>
     </div></div>
    <div className="test-start"><span>{available<MIN_TEST_WORDS?'Favorite at least two words to test on favorites.':`${questionCount} ${formatLabels[format].toLowerCase()} ${questionCount===1?'question':'questions'}`}</span><button className="primary-button" disabled={available<MIN_TEST_WORDS} onClick={()=>start({format,answerWith,count:questionCount})}>Start test</button></div>
   </div>
  </section>;
 }

 const {questions,settings}=stage;
 const answered=questions.filter(q=>isAnswered(q,responses[q.id])).length;
 const result=scoreTest(questions,responses);
 const done=stage.name==='results';
 const missedWords=()=>{const keys=new Set(questions.filter(q=>gradeQuestion(q,responses[q.id])!==true).map(q=>answerKey(q.term)));return pool.filter(w=>keys.has(answerKey(w.term)))};
 function submit(){if(answered<questions.length&&!confirming){setConfirming(true);return}setStage({name:'results',questions,settings});onSubmit?.()}

 return <section className="test-page" ref={top}>
  <header className="test-head test-head-row"><div><h1>{done?'Results':'Test'}</h1><p>{questions.length} questions, {formatLabels[settings.format].toLowerCase()}{settings.format!=='truefalse'?`, answering with ${answerLabels[settings.answerWith].toLowerCase()}`:''}</p></div><button className="quiet-button" onClick={()=>setStage({name:'setup'})}>{done?'New test':'Leave test'}</button></header>
  {done?<div className="test-grade" aria-live="polite">
   <div className={`test-grade-letter grade-${result.grade[0]}`}>{result.grade}</div>
   <div className="test-grade-copy"><strong>{result.percent}%</strong><span>{result.correct} of {result.total} correct</span>{result.pending>0&&<p>Mark {result.pending} written {result.pending===1?'answer':'answers'} below to finish your grade.</p>}</div>
   <div className="test-grade-actions"><button className="primary-button" onClick={()=>start(settings)}>Take another</button>{result.correct<result.total&&result.pending===0&&<button className="quiet-button" onClick={()=>{const w=missedWords();start({...settings,count:w.length},w)}}>Retest what I missed</button>}</div>
  </div>
  :<div className="test-progress"><span>{answered} of {questions.length} answered</span><div className="game-track"><div style={{width:`${answered/questions.length*100}%`}}/></div></div>}

  <ol className="test-questions">{questions.map((q,n)=>{
   const r=responses[q.id],mark=done?gradeQuestion(q,r):undefined;
   return <li key={q.id} className={`test-q ${done?(mark===true?'is-right':mark===false?'is-wrong':'is-pending'):''}`}>
    <div className="test-q-head"><span className="test-q-number">{n+1}</span><span className="test-q-instruction">{instruction(q)}</span>{done&&<span className="test-q-mark">{mark===true?'Correct':mark===false?(isAnswered(q,r)?'Wrong':'No answer'):'Mark it'}</span>}</div>
    {q.kind==='truefalse'?<p className="test-q-prompt is-statement"><b>{q.term}</b> means: <Text segments={q.shownSegments} reveal={done}/></p>
     :q.prompt==='term'?<p className="test-q-prompt is-term">{q.term}<small>{q.partOfSpeech.toLowerCase()}</small></p>
     :<p className="test-q-prompt"><Text segments={q.promptSegments} reveal={done}/></p>}

    {q.kind==='choice'&&<div className={`test-options ${q.prompt==='definition'?'is-terms':''}`} role="radiogroup" aria-label={`Question ${n+1} options`}>{q.options.map((o,i)=>{const picked=r?.choice===o.id;
     return <button key={o.id} type="button" role="radio" aria-checked={picked} disabled={done} onClick={()=>respond(q.id,{choice:o.id})}
      className={`test-option ${picked?'is-picked':''} ${done&&o.correct?'is-correct':''} ${done&&picked&&!o.correct?'is-incorrect':''}`}>
      <span className="choice-letter">{letter(i)}</span><span><span><Text segments={o.segments} reveal={done}/></span>{done&&q.prompt==='term'&&(o.correct||picked)&&<small className="option-owner">{o.correct?'Correct answer':`This means ${o.owner}`}</small>}</span></button>})}</div>}

    {q.kind==='truefalse'&&<div className="test-tf" role="radiogroup" aria-label={`Question ${n+1}`}>{([true,false] as const).map(v=>{const picked=r?.bool===v;
     return <button key={String(v)} type="button" role="radio" aria-checked={picked} disabled={done} onClick={()=>respond(q.id,{bool:v})} className={`test-option ${picked?'is-picked':''} ${done&&v===q.isMatch?'is-correct':''} ${done&&picked&&v!==q.isMatch?'is-incorrect':''}`}>{v?'True':'False'}</button>})}
     {done&&!q.isMatch&&<p className="test-answer">That definition belongs to <b>{q.shownOwner}</b>. <b>{q.term}</b> means: {q.definition}</p>}</div>}

    {q.kind==='written'&&(done
     ?<div className="test-written-result"><p className="test-your-answer"><span>Your answer</span>{(r?.text||'').trim()||<em>No answer</em>}</p><p className="test-answer"><span>{q.prompt==='definition'?'The word':'The definition'}</span>{q.prompt==='definition'?<b>{q.term}</b>:q.definition}</p>
       {q.prompt==='term'&&(r?.text||'').trim()&&<div className="test-selfmark" role="group" aria-label="Mark your answer"><span>Did you get it?</span><button type="button" className={r?.selfMark===true?'is-selected':''} aria-pressed={r?.selfMark===true} onClick={()=>respond(q.id,{selfMark:true})}>Yes, I got it</button><button type="button" className={r?.selfMark===false?'is-selected':''} aria-pressed={r?.selfMark===false} onClick={()=>respond(q.id,{selfMark:false})}>No, I missed it</button></div>}</div>
     :q.prompt==='definition'
      ?<div className="test-answer-field"><input className="test-input" aria-label={`Answer ${n+1}`} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="The word" value={r?.text||''} onChange={e=>respond(q.id,{text:e.target.value})}/></div>
      :<div className="test-answer-field"><textarea className="test-input" aria-label={`Answer ${n+1}`} rows={2} placeholder="In your own words" value={r?.text||''} onChange={e=>respond(q.id,{text:e.target.value})}/></div>)}
   </li>})}</ol>

  {!done&&<div className="test-submit">{confirming&&<p role="alert">{questions.length-answered} unanswered {questions.length-answered===1?'question counts':'questions count'} as wrong.</p>}<button className="primary-button" onClick={submit}>{confirming?'Submit anyway':'Submit test'}</button></div>}
 </section>;
}
