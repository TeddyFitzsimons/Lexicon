import type {Word} from './words.ts';
import {normalizeProfile,type Profile} from './activity.ts';
import {wordsFromSaved} from './storageFormat.ts';
import {dayKey} from './dates.ts';
import {SHARE_FORMAT} from './share.ts';

/**
 * A backup is everything on this device in one file: every word exactly as saved (ids,
 * favorites, dates) plus the profile (name, activity, streaks). Restoring replaces both.
 * Unlike a share file, nothing is filtered out, because it only ever goes back to its owner.
 */
export const BACKUP_FORMAT='lexicon-backup';
export const BACKUP_VERSION=2;
export const MAX_RESTORE_BYTES=8_000_000;

export type BackupFile={format:typeof BACKUP_FORMAT;version:number;exportedAt:string;words:Word[];profile:Profile};
export function buildBackup(words:Word[],profile:Profile,now=new Date()):BackupFile{
 return {format:BACKUP_FORMAT,version:BACKUP_VERSION,exportedAt:now.toISOString(),words,profile};
}
export const backupFileName=(now=new Date())=>`lexicon-backup-${dayKey(now)}.json`;

export type Restore={ok:true;words?:Word[];profile?:Profile;exportedAt?:string}|{ok:false;error:string};
type Source={name:string;text:string};

/**
 * Accepts a Lexicon backup, or the raw files from the web version's data/ folder:
 * vocabulary.json (a list of words) and/or profile.json (name and activity).
 * Several files may be chosen at once; each kind may appear only once.
 */
export function parseRestore(files:Source[]):Restore{
 if(!files.length)return {ok:false,error:'No file chosen.'};
 if(files.reduce((n,f)=>n+f.text.length,0)>MAX_RESTORE_BYTES)return {ok:false,error:'Those files are too large to be a Lexicon backup.'};
 let words:Word[]|undefined,profile:Profile|undefined,exportedAt:string|undefined;
 const once=<T,>(current:T|undefined,next:T,what:string):T=>{if(current!==undefined)throw new Error(`More than one ${what} was chosen. Pick one.`);return next};
 try{
  for(const file of files){
   let data:unknown;
   try{data=JSON.parse(file.text)}catch{throw new Error(`${file.name} isn’t valid JSON.`)}
   const obj=data&&typeof data==='object'&&!Array.isArray(data)?data as Record<string,unknown>:null;
   if(obj?.format===SHARE_FORMAT)throw new Error(`${file.name} is a share file. Use “Add words from a file” instead; it keeps your library and adds to it.`);
   if(obj?.format===BACKUP_FORMAT){
    if(typeof obj.version!=='number'||obj.version>BACKUP_VERSION)throw new Error(`${file.name} was made by a newer version of Lexicon.`);
    words=once(words,savedWords(obj.words,file.name),'word list');
    profile=once(profile,normalizeProfile(obj.profile),'profile');
    exportedAt=typeof obj.exportedAt==='string'?obj.exportedAt:undefined;
   }else if(Array.isArray(data)){
    words=once(words,savedWords(data,file.name),'word list');
   }else if(obj&&obj.days&&typeof obj.days==='object'){
    profile=once(profile,normalizeProfile(obj),'profile');
   }else throw new Error(`${file.name} isn’t a Lexicon backup, vocabulary.json or profile.json.`);
  }
 }catch(e){return {ok:false,error:e instanceof Error?e.message:String(e)}}
 return {ok:true,words,profile,exportedAt};
}

/** Saved words must carry their own id and term; anything else means it isn't a Lexicon library. */
function savedWords(value:unknown,name:string):Word[]{
 if(!Array.isArray(value))throw new Error(`${name} has no list of words.`);
 if(!value.every(w=>!!w&&typeof w==='object'&&typeof (w as Record<string,unknown>).id==='string'&&typeof (w as Record<string,unknown>).term==='string'))
  throw new Error(`${name} doesn’t look like a saved Lexicon library. To add someone’s list of words, use “Add words from a file”.`);
 return wordsFromSaved(value);
}
