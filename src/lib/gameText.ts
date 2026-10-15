/** Text helpers shared by every Lexicon game. Pure and deterministic (apart from shuffle). */
export const answerKey=(text:string)=>text.normalize('NFKC').trim().replace(/[’‘]/g,"'").replace(/\s+/g,' ').toLocaleLowerCase('en');

const escapeTerm=(term:string)=>term.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
const boundary={before:'(?<![\\p{L}\\p{N}_])',after:'(?![\\p{L}\\p{N}_])'};

/** Splits a sentence around exact, whole-word occurrences of a term. Null when the term is absent. */
export function blankSentence(sentence:string,term:string):string[]|null{
 if(!term.trim())return null;
 const pattern=new RegExp(`${boundary.before}${escapeTerm(term)}${boundary.after}`,'giu');
 const pieces=sentence.split(pattern);
 return pieces.length>1?pieces:null;
}

export type Segment={text:string;hidden:boolean};
/** Common English endings hidden alongside a term, so "calmly" doesn't give away "calm". */
const SUFFIXES='(?:s|es|ed|d|ing|ly|er|est)?';
/**
 * Hides every whole-word occurrence of each term (and simple suffixed forms for
 * terms of four or more letters). Returns ordered segments for rendering.
 */
export function maskTerms(text:string,terms:string[]):Segment[]{
 const unique=[...new Map(terms.filter(t=>t.trim()).map(t=>[answerKey(t),t])).values()]
  .sort((a,b)=>b.length-a.length); // longest first so phrases win over their parts
 if(!unique.length||!text)return text?[{text,hidden:false}]:[];
 const alternatives=unique.map(t=>escapeTerm(t)+(t.trim().length>=4&&!/\s/.test(t.trim())?SUFFIXES:''));
 const pattern=new RegExp(`${boundary.before}(?:${alternatives.join('|')})${boundary.after}`,'giu');
 const out:Segment[]=[];let last=0;
 for(const match of text.matchAll(pattern)){
  const start=match.index??0;
  if(start>last)out.push({text:text.slice(last,start),hidden:false});
  out.push({text:match[0],hidden:true});last=start+match[0].length;
 }
 if(last<text.length)out.push({text:text.slice(last),hidden:false});
 return out;
}

export function shuffle<T>(items:T[]):T[]{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
