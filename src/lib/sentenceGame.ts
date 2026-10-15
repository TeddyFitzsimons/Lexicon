import type {Word} from './words';
export type Question={id:string;term:string;sentence:string;pieces:string[];definition:string;choices:string[]};
export const answerKey=(text:string)=>text.normalize('NFKC').trim().replace(/[’‘]/g,"'").replace(/\s+/g,' ').toLocaleLowerCase('en');
export function blankSentence(sentence:string,term:string):string[]|null{
 if(!term.trim())return null;
 const escaped=term.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
 const pattern=new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,'giu');
 const pieces=sentence.split(pattern);
 return pieces.length>1?pieces:null;
}
export function shuffle<T>(items:T[]):T[]{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
export function playableQuestions(words:Word[]):Question[]{
 const terms=[...new Map(words.filter(w=>w.term.trim()).map(w=>[answerKey(w.term),w.term.trim()])).values()];
 const seen=new Set<string>();
 return words.flatMap(w=>{
  if(seen.has(answerKey(w.term)))return [];
  const candidates=w.senses.flatMap(s=>s.examples.map(sentence=>({sentence,definition:s.definition,pieces:blankSentence(sentence,w.term)}))).filter(x=>x.pieces!==null);
  if(!candidates.length)return [];
  seen.add(answerKey(w.term));const example=shuffle(candidates)[0];
  const alternatives=shuffle(terms.filter(t=>answerKey(t)!==answerKey(w.term))).slice(0,3);
  return [{id:w.id,term:w.term.trim(),sentence:example.sentence,pieces:example.pieces!,definition:example.definition,choices:shuffle([w.term.trim(),...alternatives])}];
 });
}
