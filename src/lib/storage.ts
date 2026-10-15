import {normalize, type Word} from './words';
const oldKey='vocabulary-words-v1';
/** The Vite dev server writes to data/vocabulary.json, never browser storage. */
export async function saveWords(words:Word[]):Promise<void> {
  const response=await fetch('/api/words',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(words)});
  if(!response.ok) throw new Error(await response.text());
}
export async function loadWords():Promise<Word[]> {
  const response=await fetch('/api/words');
  if(!response.ok) throw new Error(await response.text());
  const data:unknown=await response.json();
  if(!Array.isArray(data)) throw new Error('Vocabulary file must contain an array');
  let words=data.map(normalize);
  // Migrate once from the earlier browser-only app if the disk file is empty.
  if(!words.length){
    const legacy=localStorage.getItem(oldKey);
    if(legacy){const parsed:unknown=JSON.parse(legacy);if(Array.isArray(parsed)&&parsed.length){words=parsed.map(normalize);await saveWords(words);}}
  }
  return words;
}
