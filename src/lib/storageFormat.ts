import {normalize,type Word} from './words.ts';

/** Turns a saved vocabulary array into words, resolving legacy card-id relations against the whole list. */
export function wordsFromSaved(data:unknown):Word[]{
 if(!Array.isArray(data))throw new Error('Vocabulary file must contain an array');
 const lookup=new Map(data.filter((x):x is {id:string;term:string}=>!!x&&typeof x.id==='string'&&typeof x.term==='string').map(x=>[x.id,x.term]));
 return data.map(x=>normalize(x,lookup));
}
