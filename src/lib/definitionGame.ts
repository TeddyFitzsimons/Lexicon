import {definitionEntries,type Word} from './words.ts';
import {category} from './collection.ts';
import {answerKey,maskTerms,shuffle,type Segment} from './gameText.ts';

/** One definition offered as an answer. `segments` hides the quizzed word and the option's own word. */
export type MeaningOption={id:string;owner:string;definition:string;segments:Segment[];correct:boolean};
export type MeaningQuestion={id:string;term:string;partOfSpeech:string;pronunciation:string;definition:string;example:string;options:MeaningOption[]};

export const OPTION_COUNT=5;

export type Entry={id:string;term:string;partOfSpeech:string;pronunciation:string;senses:{id:string;definition:string;examples:string[]}[]};

/** Merge entries that share a spelling and keep only senses with a definition. */
export function entries(words:Word[]):Entry[]{
 const byTerm=new Map<string,Entry>();
 for(const w of words){
  const term=w.term.trim();if(!term)continue;
  const senses=definitionEntries(w).map(s=>({id:s.id,definition:s.definition.trim(),examples:s.examples.filter(x=>x.trim())}));
  if(!senses.length)continue;
  const key=answerKey(term),existing=byTerm.get(key);
  if(existing)existing.senses.push(...senses);
  else byTerm.set(key,{id:w.id,term,partOfSpeech:category(w),pronunciation:w.readablePronunciation.trim(),senses});
 }
 return [...byTerm.values()];
}

export const pick=<T,>(items:T[])=>items[Math.floor(Math.random()*items.length)];

/**
 * Builds one question per distinct word: the word, its correct definition and up to
 * four definitions borrowed from other words (same part of speech preferred, so the
 * choice can't be made on grammar alone). Needs at least two distinct words.
 */
export function meaningQuestions(words:Word[],optionCount=OPTION_COUNT):MeaningQuestion[]{
 const all=entries(words);
 if(all.length<2)return [];
 return all.map(entry=>{
  const sense=pick(entry.senses);
  const used=new Set([answerKey(sense.definition)]);
  const others=all.filter(e=>e!==entry);
  const pool=[...shuffle(others.filter(e=>e.partOfSpeech===entry.partOfSpeech)),...shuffle(others.filter(e=>e.partOfSpeech!==entry.partOfSpeech))];
  const distractors:MeaningOption[]=[];
  for(const other of pool){
   if(distractors.length>=optionCount-1)break;
   const fresh=other.senses.filter(s=>!used.has(answerKey(s.definition)));
   if(!fresh.length)continue;
   const chosen=pick(fresh);used.add(answerKey(chosen.definition));
   distractors.push({id:`${other.id}:${chosen.id}`,owner:other.term,definition:chosen.definition,segments:maskTerms(chosen.definition,[entry.term,other.term]),correct:false});
  }
  const answer:MeaningOption={id:`${entry.id}:${sense.id}`,owner:entry.term,definition:sense.definition,segments:maskTerms(sense.definition,[entry.term]),correct:true};
  return {id:entry.id,term:entry.term,partOfSpeech:entry.partOfSpeech,pronunciation:entry.pronunciation,definition:sense.definition,example:sense.examples[0]||'',options:shuffle([answer,...distractors])};
 }).filter(q=>q.options.length>1);
}
