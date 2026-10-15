import {invoke} from '@tauri-apps/api/core';
import {openUrl} from '@tauri-apps/plugin-opener';

/**
 * The one place that knows whether Lexicon runs as the desktop app (Tauri) or in a
 * browser against the Vite dev server. Everything else asks this module.
 */
export const isDesktop=():boolean=>typeof window!=='undefined'&&'__TAURI_INTERNALS__' in window;

/** Calls a Rust command. Errors come back as plain strings; wrap them so callers get an Error. */
export async function command<T>(name:string,args?:Record<string,unknown>):Promise<T>{
 try{return await invoke<T>(name,args)}catch(e){throw new Error(typeof e==='string'?e:String(e))}
}

/** Dictionary links are the only external pages Lexicon opens. */
export const DICTIONARY_LINK=/^https:\/\/(www\.)?merriam-webster\.com\/dictionary\/\S+$/i;

/** Opens a dictionary page in the system browser, never inside the app window. */
export async function openExternal(url:string):Promise<void>{
 if(!DICTIONARY_LINK.test(url))return;
 if(isDesktop())await openUrl(url);
 else window.open(url,'_blank','noopener,noreferrer');
}

/**
 * Saves a text file. Desktop: a native Save dialog (the Rust side writes the file, so the
 * page never gets filesystem access). Browser: a normal download.
 * Resolves false if the person cancelled.
 */
export async function saveTextFile(fileName:string,contents:string):Promise<boolean>{
 if(isDesktop())return command<boolean>('save_file',{fileName,contents});
 const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=fileName;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 return true;
}

/** Desktop-only window behaviour: links go to the system browser, F11 toggles full screen. */
export function installDesktopBehaviour():void{
 if(!isDesktop())return;
 document.addEventListener('click',e=>{
  const link=(e.target as Element|null)?.closest?.('a[href]') as HTMLAnchorElement|null;
  if(!link||!/^https?:/i.test(link.href))return;
  e.preventDefault();
  void openExternal(link.href);
 },true);
 window.addEventListener('keydown',e=>{
  if(e.key==='F11'){e.preventDefault();void command('toggle_fullscreen').catch(()=>{})}
 });
}
