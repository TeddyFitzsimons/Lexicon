import type {Word} from './words';
import {entries} from './definitionGame.ts';
import {blankSentence,maskTerms,type Segment} from './gameText.ts';

export type SpellQuestion={id:string;term:string;partOfSpeech:string;definition:Segment[];example:string|null};
export const MAX_ATTEMPTS=4;

/** One question per distinct word. Clues hide the word so they never spell it out. */
export function spellQuestions(words:Word[]):SpellQuestion[]{
 return entries(words).map(e=>{
  const sense=e.senses[0];
  const pieces=e.senses.flatMap(s=>s.examples).map(x=>blankSentence(x,e.term)).find(Boolean);
  return {id:e.id,term:e.term,partOfSpeech:e.partOfSpeech,definition:maskTerms(sense.definition,[e.term]),example:pieces?pieces.join('_____'):null};
 });
}

const isLetter=(c:string)=>/\p{L}|\p{N}/u.test(c);
/**
 * Letter pattern for a hint. Spaces, hyphens and apostrophes always show.
 * level 1: first letter only. level 3+: every other letter. Hidden letters are null.
 */
export function letterPattern(term:string,level:number):(string|null)[]{
 let n=0;
 return [...term].map(c=>{
  if(!isLetter(c))return c;
  const i=n++;
  return i===0||(level>=3&&i%2===0)?c:null;
 });
}
export const letterCount=(term:string)=>[...term].filter(isLetter).length;

/** Which clues show after `misses` wrong attempts: pattern from 1, meaning from 2, more letters and the example from 3. */
export function hintsFor(misses:number){
 return {pattern:misses>=1?Math.min(misses,3):0,meaning:misses>=2,example:misses>=3};
}
