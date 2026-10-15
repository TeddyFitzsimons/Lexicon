import type {Word} from './words';
export type SortOrder='oldest'|'newest'|'alphabetical';
export const categoryOrder=['Noun','Adjective','Verb','Adverb','Pronoun','Preposition','Conjunction','Interjection','Determiner','Other'];
export function category(word:Word){const raw=word.partOfSpeech.trim();return categoryOrder.find(p=>p.toLowerCase()===raw.toLowerCase())||raw||'Other'}
export function arrangeWords(words:Word[],sort:SortOrder,grouped:boolean):Word[]{
 const ordered=[...words];
 if(sort==='newest')ordered.reverse();
 if(sort==='alphabetical')ordered.sort((a,b)=>a.term.localeCompare(b.term,'en',{sensitivity:'base',numeric:true}));
 if(grouped)ordered.sort((a,b)=>{
  const x=category(a),y=category(b);
  const rank=(part:string)=>{const n=categoryOrder.indexOf(part);return n<0?categoryOrder.length:n};
  return rank(x)-rank(y)||x.localeCompare(y);
 });
 return ordered;
}
