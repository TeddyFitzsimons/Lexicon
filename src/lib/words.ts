import {ipaToReadable} from './ipa';
/** Domain model. Relationships store stable IDs, not display text. */
export type Sense = { id: string; definition: string; examples: string[] };
export type RelatedTerm = { term: string; url: string };
export type Relation = 'synonyms' | 'antonyms' | 'relatedForms';
export type Word = {
  id: string; term: string; definition: string; senses: Sense[]; partOfSpeech: string;
  pronunciation: string; readablePronunciation: string; readableManuallyEdited: boolean; examples: string[];
  synonyms: RelatedTerm[]; antonyms: RelatedTerm[]; relatedForms: RelatedTerm[];
  /** Kept for backwards compatibility with the original local JSON format. */
  example: string;
  favorite: boolean;
};
export type Draft = Omit<Word, 'id'>;
export const parts = ['Noun','Verb','Adjective','Adverb','Pronoun','Preposition','Conjunction','Interjection','Determiner','Other'];
export const relations: Relation[] = ['synonyms','antonyms','relatedForms'];
export const labels: Record<Relation,string> = {synonyms:'Synonyms',antonyms:'Antonyms',relatedForms:'Related forms'};
export const emptyDraft = (): Draft => ({term:'',definition:'',senses:[{id:crypto.randomUUID(),definition:'',examples:[]}],partOfSpeech:'Noun',pronunciation:'',readablePronunciation:'',readableManuallyEdited:false,examples:[],example:'',favorite:false,synonyms:[],antonyms:[],relatedForms:[]});

/** Read legacy four-field entries without destroying any saved words. */
export function normalize(value: unknown, lookup:Map<string,string>=new Map()): Word {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string,unknown>;
  const str = (v:unknown) => typeof v === 'string' ? v : '';
  // Legacy relations were card IDs. Resolve them using the complete saved collection.
  const related = (v:unknown, lookup:Map<string,string>):RelatedTerm[] => Array.isArray(v) ? v.flatMap((x):RelatedTerm[]=>{
    if(typeof x==='string'){const term=lookup.get(x)||x;return [{term,url:''}];}
    if(x&&typeof x==='object'&&typeof (x as Record<string,unknown>).term==='string'){
      const r=x as Record<string,unknown>;return [{term:String(r.term),url:typeof r.url==='string'?r.url:''}];
    }
    return [];
  }):[];
  const examples = Array.isArray(raw.examples) ? raw.examples.filter((x):x is string=>typeof x==='string') : [];
  if (!examples.length && str(raw.example).trim()) examples.push(str(raw.example));
  const senses = Array.isArray(raw.senses) ? raw.senses.filter((x):x is Record<string,unknown>=>!!x&&typeof x==='object').map(x=>({id:str(x.id)||crypto.randomUUID(),definition:str(x.definition),examples:Array.isArray(x.examples)?x.examples.filter((y):y is string=>typeof y==='string'):[]})) : [];
  if (!senses.length) senses.push({id:crypto.randomUUID(),definition:str(raw.definition),examples});
  return {id:str(raw.id)||crypto.randomUUID(),term:str(raw.term),definition:str(raw.definition)||senses[0]?.definition||'',senses,partOfSpeech:str(raw.partOfSpeech)||'Noun',pronunciation:str(raw.ipa)||str(raw.pronunciation),readablePronunciation:str(raw.readablePronunciation)||(() => {const result=ipaToReadable(str(raw.ipa)||str(raw.pronunciation));return result.ok?result.readable:''})(),readableManuallyEdited:raw.readableManuallyEdited===true,examples,example:examples[0]||'',favorite:raw.favorite===true,synonyms:related(raw.synonyms,lookup),antonyms:related(raw.antonyms,lookup),relatedForms:related(raw.relatedForms,lookup)};
}
export function cleaned(draft:Draft,id:string):Word {
  const examples=draft.examples.map(x=>x.trim()).filter(Boolean);
  const senses=draft.senses.map(s=>({...s,definition:s.definition.trim(),examples:s.examples.map(x=>x.trim()).filter(Boolean)})).filter(s=>s.definition);
  const cleanRelations=(entries:RelatedTerm[])=>entries.map(x=>({term:x.term.trim(),url:x.url.trim()})).filter(x=>x.term);
  return {...draft,synonyms:cleanRelations(draft.synonyms),antonyms:cleanRelations(draft.antonyms),relatedForms:cleanRelations(draft.relatedForms),id,term:draft.term.trim(),definition:senses[0]?.definition||'',senses,pronunciation:draft.pronunciation.trim(),readablePronunciation:draft.readablePronunciation.trim(),examples,example:examples[0]||''};
}
export function withoutWord(words:Word[],id:string):Word[] {
  return words.filter(w=>w.id!==id);
}
