import {ipaToReadable} from './ipa.ts';
import {dayKey,isDayKey} from './dates.ts';

/** IDs are stable; numerical and alphabetical labels are computed from array order. */
export type Subdefinition = {id:string;position:number;definition:string;examples:string[]};
export type Sense = {id:string;position:number;definition:string;examples:string[];subdefinitions:Subdefinition[]};
export type DefinitionEntry = {id:string;primaryId:string;label:string;definition:string;examples:string[]};
export type RelatedTerm = {term:string;url:string};
export type Relation = 'synonyms' | 'antonyms' | 'relatedForms';
export type Word = {
 id:string;term:string;definition:string;senses:Sense[];partOfSpeech:string;
 pronunciation:string;readablePronunciation:string;readableManuallyEdited:boolean;examples:string[];
 synonyms:RelatedTerm[];antonyms:RelatedTerm[];relatedForms:RelatedTerm[];
 /** Retained to read original vocabulary and backup files. */
 example:string;favorite:boolean;addedAt:string;
};
export type Draft = Omit<Word,'id'>;
export const parts=['Noun','Verb','Adjective','Adverb','Pronoun','Preposition','Conjunction','Interjection','Determiner','Other'];
export const relations:Relation[]=['synonyms','antonyms','relatedForms'];
export const labels:Record<Relation,string>={synonyms:'Synonyms',antonyms:'Antonyms',relatedForms:'Related forms'};
export const newSubdefinition=():Subdefinition=>({id:crypto.randomUUID(),position:0,definition:'',examples:[]});
export const newSense=():Sense=>({id:crypto.randomUUID(),position:0,definition:'',examples:[],subdefinitions:[]});
export const emptyDraft=():Draft=>({term:'',definition:'',senses:[newSense()],partOfSpeech:'Noun',pronunciation:'',readablePronunciation:'',readableManuallyEdited:false,examples:[],example:'',favorite:false,addedAt:dayKey(new Date()),synonyms:[],antonyms:[],relatedForms:[]});

/** Return a, b, ..., z, aa, ab, etc.; purely a display label. */
export function letterFor(index:number):string {
 let result='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))result=String.fromCharCode(97+(n-1)%26)+result;
 return result;
}
/** Include any primary definition with text and every lettered subdefinition with text. */
export function definitionEntries(word:Pick<Word,'senses'>):DefinitionEntry[] {
 return word.senses.flatMap((sense,i)=>{
  const list:DefinitionEntry[]=[];
  if(sense.definition.trim())list.push({id:sense.id,primaryId:sense.id,label:String(i+1),definition:sense.definition,examples:sense.examples});
  (sense.subdefinitions||[]).forEach((sub,j)=>{if(sub.definition.trim())list.push({id:sub.id,primaryId:sense.id,label:`${i+1}${letterFor(j)}`,definition:sub.definition,examples:sub.examples})});
  return list;
 });
}
/** The first usable definition can belong to a lettered subdefinition. */
export const firstDefinition=(word:Pick<Word,'senses'>)=>definitionEntries(word)[0]?.definition||'';
export const hasDefinition=(word:Pick<Word,'senses'>)=>definitionEntries(word).length>0;
export const allDefinitionText=(word:Pick<Word,'senses'>)=>word.senses.flatMap(s=>[s.definition,...s.examples,...(s.subdefinitions||[]).flatMap(sub=>[sub.definition,...sub.examples])]);

/** Migrate v1/v2 flat definitions and keep existing IDs, examples and order. */
export function normalize(value:unknown,lookup:Map<string,string>=new Map()):Word {
 const raw=(value&&typeof value==='object'?value:{}) as Record<string,unknown>;
 const str=(v:unknown)=>typeof v==='string'?v:'';
 const related=(v:unknown):RelatedTerm[]=>Array.isArray(v)?v.flatMap((x):RelatedTerm[]=>{
  if(typeof x==='string')return [{term:lookup.get(x)||x,url:''}];
  if(x&&typeof x==='object'&&typeof (x as Record<string,unknown>).term==='string'){
   const r=x as Record<string,unknown>;return [{term:String(r.term),url:typeof r.url==='string'?r.url:''}];
  }
  return [];
 }):[];
 const strings=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[];
 const examples=strings(raw.examples);
 if(!examples.length&&str(raw.example).trim())examples.push(str(raw.example));
 const position=(x:Record<string,unknown>,i:number)=>typeof x.position==='number'&&Number.isInteger(x.position)&&x.position>=0?x.position:i;
 const ordered=(v:unknown)=>Array.isArray(v)?v.filter((x):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x)).map((x,i)=>({x,i})).sort((a,b)=>position(a.x,a.i)-position(b.x,b.i)||a.i-b.i).map(o=>o.x):[];
 const usedNodeIds=new Set<string>();
 const nodeId=(value:unknown)=>{let id=str(value);if(!id||usedNodeIds.has(id))id=crypto.randomUUID();usedNodeIds.add(id);return id};
 const senses:Sense[]=ordered(raw.senses).map((s,i)=>({
  id:nodeId(s.id),position:i,definition:str(s.definition),examples:strings(s.examples),
  subdefinitions:ordered(s.subdefinitions).map((sub,j)=>({id:nodeId(sub.id),position:j,definition:str(sub.definition),examples:strings(sub.examples)}))
 }));
 if(!senses.length)senses.push({...newSense(),definition:str(raw.definition),examples:[...examples]});
 const first=firstDefinition({senses});
 return {id:str(raw.id)||crypto.randomUUID(),term:str(raw.term),definition:first||str(raw.definition),senses,
  partOfSpeech:str(raw.partOfSpeech)||'Noun',pronunciation:str(raw.ipa)||str(raw.pronunciation),
  readablePronunciation:str(raw.readablePronunciation)||(()=>{const result=ipaToReadable(str(raw.ipa)||str(raw.pronunciation));return result.ok?result.readable:''})(),
  readableManuallyEdited:raw.readableManuallyEdited===true,examples,example:examples[0]||'',favorite:raw.favorite===true,
  addedAt:isDayKey(raw.addedAt)?raw.addedAt:'',synonyms:related(raw.synonyms),antonyms:related(raw.antonyms),relatedForms:related(raw.relatedForms)};
}
/** Normalize persisted positions after reordering or deleting without changing node identities. */
export function cleaned(draft:Draft,id:string):Word {
 const examples=draft.examples.map(x=>x.trim()).filter(Boolean);
 const senses=draft.senses.map((sense,i)=>({
  ...sense,position:i,definition:sense.definition.trim(),examples:sense.examples.map(x=>x.trim()).filter(Boolean),
  subdefinitions:sense.subdefinitions.map((sub,j)=>({...sub,position:j,definition:sub.definition.trim(),examples:sub.examples.map(x=>x.trim()).filter(Boolean)}))
 }));
 const cleanRelations=(entries:RelatedTerm[])=>entries.map(x=>({term:x.term.trim(),url:x.url.trim()})).filter(x=>x.term);
 return {...draft,synonyms:cleanRelations(draft.synonyms),antonyms:cleanRelations(draft.antonyms),relatedForms:cleanRelations(draft.relatedForms),id,
  term:draft.term.trim(),definition:firstDefinition({senses}),senses,pronunciation:draft.pronunciation.trim(),
  readablePronunciation:draft.readablePronunciation.trim(),examples,example:examples[0]||''};
}
export const withoutWord=(words:Word[],id:string):Word[]=>words.filter(w=>w.id!==id);
