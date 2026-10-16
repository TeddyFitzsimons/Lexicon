import type {Word} from './words';
import {answerKey,blankSentence,shuffle} from './gameText.ts';
import {meanings} from './senses.ts';
export {answerKey,blankSentence,shuffle};
export type Question={id:string;term:string;sentence:string;pieces:string[];definition:string;choices:string[]};
export function playableQuestions(words:Word[]):Question[]{
 const terms=[...new Map(words.filter(w=>w.term.trim()).map(w=>[answerKey(w.term),w.term.trim()])).values()];
 const seen=new Set<string>();
 return words.flatMap(w=>{
  if(seen.has(answerKey(w.term)))return [];
  const candidates=meanings(w.senses).flatMap(s=>s.examples.map(sentence=>({sentence,definition:s.definition,pieces:blankSentence(sentence,w.term)}))).filter(x=>x.pieces!==null);
  if(!candidates.length)return [];
  seen.add(answerKey(w.term));const example=shuffle(candidates)[0];
  const alternatives=shuffle(terms.filter(t=>answerKey(t)!==answerKey(w.term))).slice(0,3);
  return [{id:w.id,term:w.term.trim(),sentence:example.sentence,pieces:example.pieces!,definition:example.definition,choices:shuffle([w.term.trim(),...alternatives])}];
 });
}
