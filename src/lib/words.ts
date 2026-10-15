/** Domain model. Relationships store stable IDs, not display text. */
export type Sense = { id: string; definition: string; examples: string[] };
export type Relation = 'synonyms' | 'antonyms' | 'relatedForms';
export type Word = {
  id: string; term: string; definition: string; senses: Sense[]; partOfSpeech: string;
  pronunciation: string; examples: string[];
  synonyms: string[]; antonyms: string[]; relatedForms: string[];
  /** Kept for backwards compatibility with the original local JSON format. */
  example: string;
  favorite: boolean;
};
export type Draft = Omit<Word, 'id'>;
export const parts = ['Noun','Verb','Adjective','Adverb','Pronoun','Preposition','Conjunction','Interjection','Determiner','Other'];
export const relations: Relation[] = ['synonyms','antonyms','relatedForms'];
export const labels: Record<Relation,string> = {synonyms:'Synonyms',antonyms:'Antonyms',relatedForms:'Related forms'};
export const emptyDraft = (): Draft => ({term:'',definition:'',senses:[{id:crypto.randomUUID(),definition:'',examples:[]}],partOfSpeech:'Noun',pronunciation:'',examples:[],example:'',favorite:false,synonyms:[],antonyms:[],relatedForms:[]});

/** Read legacy four-field entries without destroying any saved words. */
export function normalize(value: unknown): Word {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string,unknown>;
  const str = (v:unknown) => typeof v === 'string' ? v : '';
  const ids = (v:unknown) => Array.isArray(v) ? v.filter((x):x is string=>typeof x==='string') : [];
  const examples = Array.isArray(raw.examples) ? raw.examples.filter((x):x is string=>typeof x==='string') : [];
  if (!examples.length && str(raw.example).trim()) examples.push(str(raw.example));
  const senses = Array.isArray(raw.senses) ? raw.senses.filter((x):x is Record<string,unknown>=>!!x&&typeof x==='object').map(x=>({id:str(x.id)||crypto.randomUUID(),definition:str(x.definition),examples:Array.isArray(x.examples)?x.examples.filter((y):y is string=>typeof y==='string'):[]})) : [];
  if (!senses.length) senses.push({id:crypto.randomUUID(),definition:str(raw.definition),examples});
  return {id:str(raw.id)||crypto.randomUUID(),term:str(raw.term),definition:str(raw.definition)||senses[0]?.definition||'',senses,partOfSpeech:str(raw.partOfSpeech)||'Noun',pronunciation:str(raw.pronunciation),examples,example:examples[0]||'',favorite:raw.favorite===true,synonyms:ids(raw.synonyms),antonyms:ids(raw.antonyms),relatedForms:ids(raw.relatedForms)};
}
export function cleaned(draft:Draft,id:string):Word {
  const examples=draft.examples.map(x=>x.trim()).filter(Boolean);
  const senses=draft.senses.map(s=>({...s,definition:s.definition.trim(),examples:s.examples.map(x=>x.trim()).filter(Boolean)})).filter(s=>s.definition);
  return {...draft,id,term:draft.term.trim(),definition:senses[0]?.definition||'',senses,pronunciation:draft.pronunciation.trim(),examples,example:examples[0]||''};
}
export function withoutWord(words:Word[],id:string):Word[] {
  return words.filter(w=>w.id!==id).map(w=>({...w,synonyms:w.synonyms.filter(x=>x!==id),antonyms:w.antonyms.filter(x=>x!==id),relatedForms:w.relatedForms.filter(x=>x!==id)}));
}
