import {normalize,type RelatedTerm,type Word} from './words.ts';
import {answerKey} from './gameText.ts';
import {dayKey} from './dates.ts';

/**
 * Share files are untrusted input: everything is size-limited, type-checked and
 * reduced to known fields before it can reach the library.
 */
export const SHARE_FORMAT='lexicon-share';
export const SHARE_VERSION=1;
export const MAX_FILE_BYTES=2_000_000;
const LIMITS={words:5000,term:100,definition:2000,examples:10,example:500,senses:20,related:30,pos:40,pron:120};
const MW_LINK=/^https:\/\/(www\.)?merriam-webster\.com\/dictionary\/\S+$/i;

type SharedSense={definition:string;examples:string[]};
type SharedRelated={term:string;url?:string};
export type SharedWord={term:string;partOfSpeech:string;pronunciation?:string;readablePronunciation?:string;senses:SharedSense[];synonyms?:SharedRelated[];antonyms?:SharedRelated[];relatedForms?:SharedRelated[]};
export type ShareFile={format:typeof SHARE_FORMAT;version:number;from:string;exportedAt:string;words:SharedWord[]};

const related=(items:RelatedTerm[])=>items.filter(r=>r.term.trim()).map(r=>r.url?{term:r.term,url:r.url}:{term:r.term});
/** Builds the file others can drop into their Lexicon. No ids, favorites or private flags leave the device. */
export function buildShareFile(words:Word[],from:string,now=new Date()):ShareFile{
 return {format:SHARE_FORMAT,version:SHARE_VERSION,from:from.trim(),exportedAt:now.toISOString(),
  words:words.filter(w=>w.term.trim()&&w.senses.some(s=>s.definition.trim())).map(w=>{
   const out:SharedWord={term:w.term.trim(),partOfSpeech:w.partOfSpeech,senses:w.senses.filter(s=>s.definition.trim()).map(s=>({definition:s.definition,examples:s.examples.filter(e=>e.trim())}))};
   if(w.pronunciation)out.pronunciation=w.pronunciation;
   if(w.readablePronunciation)out.readablePronunciation=w.readablePronunciation;
   for(const k of ['synonyms','antonyms','relatedForms'] as const)if(w[k].length)out[k]=related(w[k]);
   return out;
  })};
}
export const shareFileName=(from:string,now=new Date())=>`lexicon-${(from.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'words')}-${dayKey(now)}.json`;

const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
function cleanRelated(v:unknown):RelatedTerm[]{
 if(!Array.isArray(v))return [];
 return v.slice(0,LIMITS.related).flatMap(x=>{
  const term=typeof x==='string'?text(x,LIMITS.term):x&&typeof x==='object'?text((x as Record<string,unknown>).term,LIMITS.term):'';
  const url=x&&typeof x==='object'?text((x as Record<string,unknown>).url,300):'';
  return term?[{term,url:MW_LINK.test(url)?url:''}]:[];
 });
}
/** Reduces one untrusted entry to a valid shared word, or a reason it was rejected. */
function cleanEntry(raw:unknown):SharedWord|string{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return 'not a word entry';
 const r=raw as Record<string,unknown>;
 const term=text(r.term,LIMITS.term);
 if(!term)return 'missing a word';
 let senses:SharedSense[]=Array.isArray(r.senses)?r.senses.slice(0,LIMITS.senses).flatMap(s=>{
  if(!s||typeof s!=='object')return [];
  const x=s as Record<string,unknown>,definition=text(x.definition,LIMITS.definition);
  const examples=Array.isArray(x.examples)?x.examples.slice(0,LIMITS.examples).map(e=>text(e,LIMITS.example)).filter(Boolean):[];
  return definition?[{definition,examples}]:[];
 }):[];
 // Older and hand-written files: a single "definition" with optional "example"/"examples".
 if(!senses.length){const definition=text(r.definition,LIMITS.definition);if(definition)senses=[{definition,examples:[...(Array.isArray(r.examples)?r.examples:[r.example]).slice(0,LIMITS.examples).map(e=>text(e,LIMITS.example)).filter(Boolean)]}]}
 if(!senses.length)return `“${term}” has no definition`;
 return {term,partOfSpeech:text(r.partOfSpeech,LIMITS.pos)||'Other',pronunciation:text(r.pronunciation,LIMITS.pron),readablePronunciation:text(r.readablePronunciation,LIMITS.pron),senses,
  synonyms:cleanRelated(r.synonyms),antonyms:cleanRelated(r.antonyms),relatedForms:cleanRelated(r.relatedForms)};
}

export type IncomingWord={word:SharedWord;duplicate:boolean};
export type ParsedImport={ok:true;from:string;items:IncomingWord[];rejected:string[]}|{ok:false;error:string};
/** Accepts a Lexicon share file, a { words: [...] } object, or a plain array (such as data/vocabulary.json). */
export function parseImport(content:string,existing:Word[]):ParsedImport{
 let data:unknown;
 try{data=JSON.parse(content)}catch{return {ok:false,error:'This file isn’t valid JSON, so it can’t be a Lexicon file.'}}
 const obj=data&&typeof data==='object'&&!Array.isArray(data)?data as Record<string,unknown>:null;
 if(obj?.format===SHARE_FORMAT&&typeof obj.version==='number'&&obj.version>SHARE_VERSION)return {ok:false,error:'This file was made by a newer version of Lexicon.'};
 const list=Array.isArray(data)?data:Array.isArray(obj?.words)?obj!.words as unknown[]:null;
 if(!list)return {ok:false,error:'No list of words found. Use a file shared from Lexicon, or a JSON list of words.'};
 if(list.length>LIMITS.words)return {ok:false,error:`That’s ${list.length} words; the limit per file is ${LIMITS.words}.`};
 const have=new Set(existing.map(w=>answerKey(w.term)));
 const seen=new Set<string>();const items:IncomingWord[]=[];const rejected:string[]=[];
 for(const raw of list){
  const result=cleanEntry(raw);
  if(typeof result==='string'){rejected.push(result);continue}
  const key=answerKey(result.term);
  if(seen.has(key)){rejected.push(`“${result.term}” appears twice`);continue}
  seen.add(key);items.push({word:result,duplicate:have.has(key)});
 }
 if(!items.length&&!rejected.length)return {ok:false,error:'This file has no words in it.'};
 return {ok:true,from:text(obj?.from,40),items,rejected};
}

/** Turns accepted shared words into library words with fresh ids, dated today. */
export function toLibraryWords(shared:SharedWord[],now=new Date()):Word[]{
 return shared.map(s=>({...normalize({...s,id:crypto.randomUUID(),senses:s.senses.map(x=>({...x,id:crypto.randomUUID()}))}),addedAt:dayKey(now),favorite:false}));
}
