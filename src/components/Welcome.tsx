import {useState} from 'react';
import type {Word} from '../lib/words';
import {playableQuestions} from '../lib/sentenceGame';
import {meaningQuestions} from '../lib/definitionGame';
import {MIN_TEST_WORDS,testableCount} from '../lib/test';
import {nextFeatured,type Featured} from '../lib/featured';
import {pick} from '../lib/definitionGame';
import {spellQuestions} from '../lib/spellGame';
import {canSpeak} from '../lib/speech';
import {NavIcon} from './NavIcon';
import {Quote} from './Quote';
import {pageQuote,pickQuote} from '../lib/quotes';
import '../home.css';

export type WelcomeActions={onGame:(game:'sentence'|'meaning'|'spell')=>void;onTest:()=>void;onStudy:()=>void;onAdd:()=>void};
type Feature={kind:Featured|'empty';art?:string;label:string;cta:string;icon:'game'|'study'|'test'|'manage';headline:JSX.Element;sub:string;go:()=>void};

/** Builds the banner from the learner's own words, so every featured activity shows a real example. */
function chooseFeature(words:Word[],a:WelcomeActions):Feature{
 const sentences=playableQuestions(words),meanings=meaningQuestions(words),withDefs=words.filter(w=>w.term.trim()&&w.senses.some(s=>s.definition.trim()));
 const available:Featured[]=[];
 if(sentences.length)available.push('sentence');
 if(meanings.length)available.push('meaning');
 if(canSpeak()&&spellQuestions(words).length)available.push('spell');
 if(testableCount(words)>=MIN_TEST_WORDS)available.push('test');
 if(withDefs.length)available.push('flashcards');
 const kind=nextFeatured(available);
 if(kind==='sentence'){const q=pick(sentences);return {kind,label:'The missing word',icon:'game',cta:'Play The missing word',sub:'One of your words fits the gap. Which one?',go:()=>a.onGame('sentence'),
  headline:<p className="feature-sentence">{q.pieces.map((part,i)=><span key={i}>{i>0&&<span className="feature-blank" aria-label="blank"/>}{part}</span>)}</p>};}
 if(kind==='meaning'){const q=pick(meanings);return {kind,art:'/lexicon-professor.png',label:'Pick the meaning',icon:'game',cta:'Play Pick the meaning',sub:`Five definitions, one belongs to “${q.term}”. Can you spot it?`,go:()=>a.onGame('meaning'),
  headline:<p className="feature-term"><mark className="hl">{q.term}</mark><span>{q.partOfSpeech.toLowerCase()}</span></p>};}
 if(kind==='spell')return {kind,art:'/lexicon-studying.png',label:'Spell It',icon:'game',cta:'Play Spell It',sub:'Hear a word, type the spelling. Miss, and you get a clue.',go:()=>a.onGame('spell'),
  headline:<p className="feature-question">Can you spell what you hear?</p>};
 if(kind==='test'){const n=testableCount(words);return {kind,art:'/lexicon-test.png',label:'Test',icon:'test',cta:'Take a test',sub:'Choose the format and the number of questions. You get a letter grade at the end.',go:a.onTest,
  headline:<p className="feature-question">How well do you know your {n} words?</p>};}
 if(kind==='flashcards'){const w=pick(withDefs);return {kind,art:'/lexicon-flashcards.png',label:'Flashcards',icon:'study',cta:'Study flashcards',sub:'Say the meaning out loud, then flip the card to check.',go:a.onStudy,
  headline:<p className="feature-term"><mark className="hl">{w.term.trim()}</mark><span>{w.partOfSpeech.toLowerCase()}</span></p>};}
 return {kind:'empty',label:'Your library',icon:'manage',cta:'Add your first word',sub:'Every word you add becomes flashcards, games and tests.',go:a.onAdd,headline:<p className="feature-question">Start with one word.</p>};
}

export function Welcome({words,...actions}:{words:Word[]}&WelcomeActions){
 const [feature]=useState(()=>chooseFeature(words,actions));
 // Changes on each library visit, but never repeats the sidebar's author.
 const [quote]=useState(()=>pickQuote([pageQuote()]));
 return <div className="welcome-area">
  <section className={`feature-banner is-${feature.kind}`} aria-labelledby="feature-label">
   <div className="feature-copy">
    <span className="feature-label" id="feature-label"><NavIcon name={feature.icon}/>{feature.label}</span>
    {feature.headline}
    <p className="feature-sub">{feature.sub}</p>
    <button className="primary-button feature-cta" onClick={feature.go}>{feature.cta}</button>
   </div>
   <img className={`feature-bird ${feature.art?"is-scene":""}`} src={feature.art||"/lexicon-waving.png"} alt=""/>
  </section>
  <div className="home-strip">
   <div className="home-stat"><strong>{words.length}</strong><span>{words.length===1?'word':'words'}</span></div>
   <div className="home-stat is-gold"><strong>{words.filter(w=>w.favorite).length}</strong><span>favorites</span></div>
   <Quote quote={quote} className="home-quote"/>
  </div>
 </div>;
}
