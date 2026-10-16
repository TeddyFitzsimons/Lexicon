import {ipaToReadable} from './ipa.ts';
import {dayKey,isDayKey} from './dates.ts';
import {cleanSenses,firstDefinition,newSense,readSenses,type Sense} from './senses.ts';
import {cleanRelations,hasRelations,mergeRelations,noRelations,pickRelations,readRelations,type RelatedTerm} from './relations.ts';
export {relations,labels} from './relations.ts';
export type {RelatedTerm,Relation,Relations} from './relations.ts';
export type {Sense,Subsense,Meaning} from './senses.ts';
/** Domain model. Relationships store stable IDs, not display text. */
export type Word = {
  id: string; term: string; definition: string; senses: Sense[]; partOfSpeech: string;
  pronunciation: string; readablePronunciation: string; readableManuallyEdited: boolean; examples: string[];
  /** Relationships not yet assigned to a definition: from older files, where they belonged to the whole word. */
  synonyms: RelatedTerm[]; antonyms: RelatedTerm[]; relatedForms: RelatedTerm[];
  /** Kept for backwards compatibility with the original local JSON format. */
  example: string;
  favorite: boolean;
  /** Local date (YYYY-MM-DD) the word was added; empty for words saved before this was tracked. */
  addedAt: string;
};
export type Draft = Omit<Word, 'id'>;
export const parts = ['Noun','Verb','Adjective','Adverb','Pronoun','Preposition','Conjunction','Interjection','Determiner','Other'];
export const emptyDraft = (): Draft => ({term:'',definition:'',senses:[newSense()],partOfSpeech:'Noun',pronunciation:'',readablePronunciation:'',readableManuallyEdited:false,examples:[],example:'',favorite:false,addedAt:dayKey(new Date()),synonyms:[],antonyms:[],relatedForms:[]});

/** Read legacy four-field entries without destroying any saved words. */
export function normalize(value: unknown, lookup:Map<string,string>=new Map()): Word {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string,unknown>;
  const str = (v:unknown) => typeof v === 'string' ? v : '';
  // Legacy relations were card IDs. Resolve them using the complete saved collection.
  const examples = Array.isArray(raw.examples) ? raw.examples.filter((x):x is string=>typeof x==='string') : [];
  if (!examples.length && str(raw.example).trim()) examples.push(str(raw.example));
  // Words saved before subdefinitions existed read as numbered definitions with none; nothing is lost.
  const senses: Sense[] = readSenses(raw.senses);
  if (!senses.length) senses.push({id:crypto.randomUUID(),definition:str(raw.definition),examples,subsenses:[],...noRelations()});
  // Relationships from before they belonged to definitions. With only one meaning there is no doubt
  // where they go; otherwise they wait, unassigned, for the person to place them. Never guess.
  let unassigned = readRelations(raw, lookup);
  if (hasRelations(unassigned) && senses.length===1 && !senses[0].subsenses.length) {
    senses[0] = {...senses[0], ...mergeRelations(pickRelations(senses[0]), unassigned)};
    unassigned = noRelations();
  }
  return {id:str(raw.id)||crypto.randomUUID(),term:str(raw.term),definition:firstDefinition(senses)||str(raw.definition),senses,partOfSpeech:str(raw.partOfSpeech)||'Noun',pronunciation:str(raw.ipa)||str(raw.pronunciation),readablePronunciation:str(raw.readablePronunciation)||(() => {const result=ipaToReadable(str(raw.ipa)||str(raw.pronunciation));return result.ok?result.readable:''})(),readableManuallyEdited:raw.readableManuallyEdited===true,examples,example:examples[0]||'',favorite:raw.favorite===true,addedAt:isDayKey(raw.addedAt)?raw.addedAt:'',...unassigned};
}
export function cleaned(draft:Draft,id:string):Word {
  const examples=draft.examples.map(x=>x.trim()).filter(Boolean);
  const senses=cleanSenses(draft.senses);
  return {...draft,...cleanRelations(draft),id,term:draft.term.trim(),definition:firstDefinition(senses),senses,pronunciation:draft.pronunciation.trim(),readablePronunciation:draft.readablePronunciation.trim(),examples,example:examples[0]||''};
}
export function withoutWord(words:Word[],id:string):Word[] {
  return words.filter(w=>w.id!==id);
}
