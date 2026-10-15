import {normalize, type Word} from './words';
import {normalizeProfile,type Profile} from './activity';
import {command,isDesktop} from './platform';
import {wordsFromSaved} from './storageFormat';

/**
 * Two JSON documents hold everything: the vocabulary and the profile (name, activity, streaks).
 * Desktop: Rust reads and writes them in the operating system's app-data folder.
 * Browser (npm run dev): the Vite dev server reads and writes data/*.json.
 * The file format is identical in both, so a data/ folder can be restored into the desktop app.
 */
type Doc='words'|'profile';
const routes:Record<Doc,string>={words:'/api/words',profile:'/api/profile'};

async function read(doc:Doc):Promise<unknown>{
 if(isDesktop())return JSON.parse(await command<string>(`load_${doc}`));
 const response=await fetch(routes[doc]);
 if(!response.ok)throw new Error(await response.text());
 return response.json();
}
async function write(doc:Doc,value:unknown):Promise<void>{
 const json=JSON.stringify(value);
 if(isDesktop()){await command(`save_${doc}`,{json});return}
 const response=await fetch(routes[doc],{method:'PUT',headers:{'Content-Type':'application/json'},body:json});
 if(!response.ok)throw new Error(await response.text());
}

const oldKey='vocabulary-words-v1';
export async function loadWords():Promise<Word[]>{
 let words=wordsFromSaved(await read('words'));
 // The very first version kept words in browser storage. Only the browser build can still see it.
 if(!words.length&&!isDesktop()){
  const legacy=localStorage.getItem(oldKey);
  if(legacy){const parsed:unknown=JSON.parse(legacy);if(Array.isArray(parsed)&&parsed.length){words=parsed.map(x=>normalize(x));await saveWords(words);}}
 }
 return words;
}
export const saveWords=(words:Word[])=>write('words',words);
export async function loadProfile():Promise<Profile>{return normalizeProfile(await read('profile'))}
export const saveProfile=(profile:Profile)=>write('profile',profile);

/** Desktop only: copies both documents into a dated snapshot folder before a restore replaces them. */
export async function snapshotData():Promise<void>{if(isDesktop())await command('snapshot_data')}
/** Desktop only: shows the data folder in Finder or File Explorer. */
export async function showDataFolder():Promise<void>{if(isDesktop())await command('show_data_folder')}
