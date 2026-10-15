import {useMemo,useState} from 'react';
import type {Word} from '../lib/words';
import {playableQuestions} from '../lib/sentenceGame';
import {meaningQuestions} from '../lib/definitionGame';
import {SentenceGame} from './SentenceGame';
import {DefinitionGame} from './DefinitionGame';
import {SpellGame} from './SpellGame';
import {spellQuestions} from '../lib/spellGame';

export type GameId='sentence'|'meaning'|'spell';
type GameInfo={id:GameId;title:string;description:string;playable:number;needs:string;preview:JSX.Element};

function SentencePreview(){
 return <div className="game-preview preview-sentence" aria-hidden="true"><span>A</span><span className="preview-blank"/><span>walk</span><br/><span>before</span><span>dinner.</span></div>;
}
function MeaningPreview(){
 return <div className="game-preview preview-meaning" aria-hidden="true"><strong>placid</strong><span className="preview-line"/><span className="preview-line picked"/><span className="preview-line"/></div>;
}
function SpellPreview(){
 return <div className="game-preview preview-spell" aria-hidden="true"><span className="preview-speaker"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9v6h4l5 4V5L9 9H5Zm12-1a6 6 0 0 1 0 8"/></svg></span><span className="preview-tiles"><b>b</b><i/><b>i</b><i/><i/></span></div>;
}

/** The Games page: a list of games, each opening in place with a way back. */
export function Games({words,onAdd,onFinish,initial=null}:{words:Word[];onAdd:()=>void;onFinish?:()=>void;initial?:GameId|null}){
 const [game,setGame]=useState<GameId|null>(initial);
 const sentenceCount=useMemo(()=>playableQuestions(words).length,[words]);
 const meaningCount=useMemo(()=>meaningQuestions(words).length,[words]);
 const spellCount=useMemo(()=>spellQuestions(words).length,[words]);
 const games:GameInfo[]=[
  {id:'sentence',title:'The missing word',description:'One of your example sentences, with a blank. Find the word that fills it.',playable:sentenceCount,needs:'Needs example sentences that use the saved word',preview:<SentencePreview/>},
  {id:'meaning',title:'Pick the meaning',description:'See a word and choose its definition from five. Wrong answers are borrowed from your other words.',playable:meaningCount,needs:'Needs at least two words with definitions',preview:<MeaningPreview/>},
  {id:'spell',title:'Spell It',description:'Hear a word pronounced, then type its spelling. Each wrong attempt unlocks a hint.',playable:spellCount,needs:'Needs at least one word with a definition',preview:<SpellPreview/>},
 ];
 if(game)return <div className="game-frame"><button className="games-back" onClick={()=>setGame(null)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>All games</button>{game==='sentence'?<SentenceGame words={words} onAdd={onAdd} onFinish={onFinish}/>:game==='meaning'?<DefinitionGame words={words} onAdd={onAdd} onFinish={onFinish}/>:<SpellGame words={words} onAdd={onAdd} onFinish={onFinish}/>}</div>;
 return <section className="games-hub"><header className="games-hub-heading"><div><h1>Games</h1><p>Rounds of up to ten of your words. You see the right answer whenever you miss, and a score at the end.</p></div><img src="/lexicon-gaming.png" alt=""/></header>
  <ul className="games-list">{games.map(g=><li key={g.id}><button className="game-entry" onClick={()=>setGame(g.id)} aria-describedby={`${g.id}-desc`}>
   {g.preview}<span className="game-entry-copy"><span className="game-entry-title">{g.title}</span><span className="game-entry-desc" id={`${g.id}-desc`}>{g.description}</span><span className={'game-entry-ready'+(g.playable?'':' not-ready')}>{g.playable?`${g.playable} ${g.playable===1?'word':'words'} ready to play`:g.needs}</span></span><span className="game-entry-play">Play</span></button></li>)}</ul>
 </section>;
}
