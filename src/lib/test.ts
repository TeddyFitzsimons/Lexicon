import type {Word} from './words';
import {entries,pick,type Entry} from './definitionGame.ts';
import {answerKey,maskTerms,shuffle,type Segment} from './gameText.ts';

/** How questions are answered. `mixed` draws each question's format at random. */
export type TestFormat='choice'|'written'|'truefalse'|'mixed';
/** What the learner answers with: the term (shown a definition), the definition (shown a term), or either. */
export type AnswerWith='terms'|'definitions'|'both';
export type TestSettings={format:TestFormat;answerWith:AnswerWith;count:number};

type Base={id:string;term:string;definition:string;partOfSpeech:string};
export type ChoiceOption={id:string;text:string;segments:Segment[];correct:boolean;owner:string};
export type TestQuestion=
 |Base&{kind:'choice';prompt:'term'|'definition';promptSegments:Segment[];options:ChoiceOption[]}
 |Base&{kind:'written';prompt:'term'|'definition';promptSegments:Segment[]}
 |Base&{kind:'truefalse';shown:string;shownSegments:Segment[];shownOwner:string;isMatch:boolean};
export type TestResponse={choice?:string;text?:string;bool?:boolean;selfMark?:boolean};

export const CHOICE_COUNT=4;
export const MIN_TEST_WORDS=2;

/** Number of distinct words a test can draw from. */
export const testableCount=(words:Word[])=>entries(words).length;

/** Other entries, same part of speech first, so distractors can't be ruled out by grammar. */
const distractorPool=(entry:Entry,all:Entry[])=>{const others=all.filter(e=>e!==entry);return [...shuffle(others.filter(e=>e.partOfSpeech===entry.partOfSpeech)),...shuffle(others.filter(e=>e.partOfSpeech!==entry.partOfSpeech))]};

function choiceQuestion(base:Base,entry:Entry,all:Entry[],prompt:'term'|'definition'):TestQuestion{
 const pool=distractorPool(entry,all);
 const options:ChoiceOption[]=[];
 if(prompt==='definition'){
  // Shown a definition, choose the term.
  for(const other of pool){if(options.length>=CHOICE_COUNT-1)break;if(answerKey(other.term)!==answerKey(entry.term))options.push({id:other.id,text:other.term,segments:[{text:other.term,hidden:false}],correct:false,owner:other.term})}
  options.push({id:entry.id,text:entry.term,segments:[{text:entry.term,hidden:false}],correct:true,owner:entry.term});
 }else{
  // Shown a term, choose the definition; every definition hides words that give the answer away.
  const used=new Set([answerKey(base.definition)]);
  for(const other of pool){
   if(options.length>=CHOICE_COUNT-1)break;
   const fresh=other.senses.filter(s=>!used.has(answerKey(s.definition)));if(!fresh.length)continue;
   const sense=pick(fresh);used.add(answerKey(sense.definition));
   options.push({id:`${other.id}:${sense.id}`,text:sense.definition,segments:maskTerms(sense.definition,[entry.term,other.term]),correct:false,owner:other.term});
  }
  options.push({id:`${entry.id}:answer`,text:base.definition,segments:maskTerms(base.definition,[entry.term]),correct:true,owner:entry.term});
 }
 return {...base,kind:'choice',prompt,promptSegments:prompt==='definition'?maskTerms(base.definition,[entry.term]):[{text:entry.term,hidden:false}],options:shuffle(options)};
}

function trueFalseQuestion(base:Base,entry:Entry,all:Entry[]):TestQuestion{
 const others=all.filter(e=>e!==entry).flatMap(e=>e.senses.filter(s=>answerKey(s.definition)!==answerKey(base.definition)).map(s=>({e,s})));
 const isMatch=!others.length||Math.random()<.5;
 if(isMatch)return {...base,kind:'truefalse',shown:base.definition,shownSegments:maskTerms(base.definition,[entry.term]),shownOwner:entry.term,isMatch:true};
 const {e,s}=pick(others);
 return {...base,kind:'truefalse',shown:s.definition,shownSegments:maskTerms(s.definition,[entry.term,e.term]),shownOwner:e.term,isMatch:false};
}

/** Builds a test: one question per distinct word, up to `count`. Needs at least two words. */
export function buildTest(words:Word[],{format,answerWith,count}:TestSettings):TestQuestion[]{
 const all=entries(words);
 if(all.length<MIN_TEST_WORDS)return [];
 return shuffle(all).slice(0,Math.max(1,Math.min(count,all.length))).map((entry,i)=>{
  const sense=pick(entry.senses);
  const base:Base={id:`${i}-${entry.id}`,term:entry.term,definition:sense.definition,partOfSpeech:entry.partOfSpeech};
  const kind=format==='mixed'?pick(['choice','written','truefalse'] as const):format;
  const prompt=answerWith==='terms'?'definition':answerWith==='definitions'?'term':pick(['term','definition'] as const);
  if(kind==='truefalse')return trueFalseQuestion(base,entry,all);
  if(kind==='written')return {...base,kind:'written',prompt,promptSegments:prompt==='definition'?maskTerms(base.definition,[entry.term]):[{text:entry.term,hidden:false}]};
  return choiceQuestion(base,entry,all,prompt);
 });
}

/** True or false once gradable; null while it still needs an answer or a self-mark. */
export function gradeQuestion(q:TestQuestion,r:TestResponse|undefined):boolean|null{
 if(!r)return q.kind==='written'&&q.prompt==='term'?null:false;
 if(q.kind==='choice')return q.options.find(o=>o.id===r.choice)?.correct??false;
 if(q.kind==='truefalse')return r.bool===q.isMatch;
 if(q.prompt==='definition')return answerKey(r.text||'')===answerKey(q.term);
 // A written definition can't be machine-graded: blank is wrong, otherwise the learner marks it.
 if(!(r.text||'').trim())return false;
 return r.selfMark??null;
}

export const isAnswered=(q:TestQuestion,r:TestResponse|undefined)=>!!r&&(q.kind==='choice'?!!r.choice:q.kind==='truefalse'?r.bool!==undefined:!!(r.text||'').trim());

const GRADES:[number,string][]=[[97,'A+'],[93,'A'],[90,'A−'],[87,'B+'],[83,'B'],[80,'B−'],[77,'C+'],[73,'C'],[70,'C−'],[67,'D+'],[63,'D'],[60,'D−'],[0,'F']];
export function letterGrade(percent:number):string{return GRADES.find(([min])=>percent>=min)![1]}

export type TestResult={correct:number;graded:number;pending:number;total:number;percent:number;grade:string};
export function scoreTest(questions:TestQuestion[],responses:Record<string,TestResponse>):TestResult{
 const marks=questions.map(q=>gradeQuestion(q,responses[q.id]));
 const correct=marks.filter(m=>m===true).length,pending=marks.filter(m=>m===null).length,graded=marks.length-pending;
 const percent=questions.length?Math.round(correct/questions.length*100):0;
 return {correct,graded,pending,total:questions.length,percent,grade:letterGrade(percent)};
}
