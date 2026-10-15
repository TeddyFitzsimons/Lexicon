/** Chooses which activity the library's banner features. Changes on every visit and never repeats twice in a row. */
export type Featured='sentence'|'meaning'|'spell'|'test'|'flashcards';
export const featuredKinds:Featured[]=['sentence','meaning','spell','test','flashcards'];
const KEY='lexicon:last-featured';
export function pickFeatured(available:Featured[],last:string|null,random=Math.random):Featured|null{
 if(!available.length)return null;
 const fresh=available.filter(k=>k!==last);
 const pool=fresh.length?fresh:available;
 return pool[Math.floor(random()*pool.length)];
}
/** Browser wrapper: remembers the last pick so a refresh always shows something different. */
export function nextFeatured(available:Featured[]):Featured|null{
 let last:string|null=null;
 try{last=window.localStorage.getItem(KEY)}catch{/* storage unavailable: plain random */}
 const pick=pickFeatured(available,last);
 if(pick)try{window.localStorage.setItem(KEY,pick)}catch{/* ignore */}
 return pick;
}
