import React,{useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';

export type SelectOption<T extends string>={value:T;label:string;detail?:string|number};
type Props<T extends string>={label:string;value:T;options:SelectOption<T>[];onChange:(value:T)=>void;className?:string;hideLabel?:boolean};

/**
 * Lexicon's own dropdown, used instead of the browser's native select.
 * Listbox pattern: arrows, Home/End, type-ahead, Enter/Space to choose, Escape to close.
 */
export function Select<T extends string>({label,value,options,onChange,className='',hideLabel=true}:Props<T>){
 const [open,setOpen]=useState(false),[active,setActive]=useState(0);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),list=useRef<HTMLUListElement>(null);
 const typed=useRef({text:'',at:0});
 const id=useId();
 const selected=Math.max(0,options.findIndex(o=>o.value===value));
 const current=options[selected];

 useEffect(()=>{
  if(!open)return;
  list.current?.focus();
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};
  document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);
 },[open]);
 useEffect(()=>{if(open)list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({block:'nearest'})},[active,open]);

 function show(){setActive(selected);setOpen(true)}
 function close(focus=true){setOpen(false);if(focus)trigger.current?.focus()}
 function choose(i:number){const o=options[i];if(o)onChange(o.value);close()}
 function typeahead(key:string){
  const now=Date.now(),t=typed.current;t.text=(now-t.at>700?'':t.text)+key.toLowerCase();t.at=now;
  const start=t.text.length===1?active+1:active;
  const order=[...options.keys()].map(i=>(i+start)%options.length);
  const hit=order.find(i=>options[i].label.toLowerCase().startsWith(t.text));
  if(hit!==undefined)setActive(hit);
 }
 function onListKey(e:KeyboardEvent){
  const last=options.length-1;
  if(e.key==='ArrowDown'){e.preventDefault();setActive(i=>Math.min(i+1,last))}
  else if(e.key==='ArrowUp'){e.preventDefault();setActive(i=>Math.max(i-1,0))}
  else if(e.key==='Home'){e.preventDefault();setActive(0)}
  else if(e.key==='End'){e.preventDefault();setActive(last)}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(active)}
  else if(e.key==='Escape'){e.preventDefault();close()}
  else if(e.key==='Tab')close(false);
  else if(e.key.length===1&&/\S/.test(e.key))typeahead(e.key);
 }
 return <div className={`lx-select ${open?'is-open':''} ${className}`} ref={root}>
  <span className={hideLabel?'sr-only':'lx-select-label'} id={`${id}-label`}>{label}</span>
  <button ref={trigger} type="button" className="lx-select-trigger" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${id}-label ${id}-value`}
   onClick={()=>open?close():show()} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();show()}}}>
   <span id={`${id}-value`}>{current?.label}</span>
   <svg className="lx-select-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
  </button>
  {open&&<ul ref={list} className="lx-select-menu" role="listbox" tabIndex={-1} aria-labelledby={`${id}-label`} aria-activedescendant={`${id}-${active}`} onKeyDown={onListKey}>
   {options.map((o,i)=><li key={o.value} id={`${id}-${i}`} data-index={i} role="option" aria-selected={o.value===value}
    className={`${i===active?'is-active':''} ${o.value===value?'is-selected':''}`} onPointerMove={()=>setActive(i)} onClick={()=>choose(i)}>
    <span className="lx-select-check" aria-hidden="true">{o.value===value&&<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg>}</span>
    <span className="lx-select-text">{o.label}</span>{o.detail!==undefined&&<span className="lx-select-detail">{o.detail}</span>}
   </li>)}
  </ul>}
 </div>;
}

/** Segmented choice: every option visible, one selected. Radio-group semantics with arrow-key movement. */
export function Segmented<T extends string>({label,value,options,onChange,disabled=false}:{label:string;value:T;options:SelectOption<T>[];onChange:(v:T)=>void;disabled?:boolean}){
 function onKey(e:KeyboardEvent,i:number){
  const step=e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0;if(!step)return;
  e.preventDefault();const next=(i+step+options.length)%options.length;onChange(options[next].value);
  (e.currentTarget.parentElement?.children[next] as HTMLElement|undefined)?.focus();
 }
 return <div className="lx-segmented" role="radiogroup" aria-label={label} aria-disabled={disabled||undefined}>
  {options.map((o,i)=><button key={o.value} type="button" role="radio" aria-checked={o.value===value} tabIndex={o.value===value?0:-1} disabled={disabled}
   className={o.value===value?'is-selected':''} onClick={()=>onChange(o.value)} onKeyDown={e=>onKey(e,i)}>{o.label}{o.detail!==undefined&&<small>{o.detail}</small>}</button>)}
 </div>;
}

/** On/off switch built from a button, styled to Lexicon. */
export function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){
 return <button type="button" role="switch" aria-checked={checked} className={`lx-toggle ${checked?'is-on':''}`} onClick={()=>onChange(!checked)}><span className="lx-toggle-track" aria-hidden="true"><span/></span>{label}</button>;
}

/** Show/hide section with Lexicon's own chevron, used instead of the browser's <details>. */
export function Disclosure({label,children,className=''}:{label:string;children:React.ReactNode;className?:string}){
 const [open,setOpen]=useState(false),id=useId();
 return <div className={`lx-disclosure ${open?'is-open':''} ${className}`}>
  <button type="button" className="lx-disclosure-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>
   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg>{label}</button>
  {open&&<div className="lx-disclosure-body" id={id}>{children}</div>}
 </div>;
}

/** Lexicon checkbox: a button with checkbox semantics, so no browser-drawn box appears. */
export function Checkbox({checked,onChange,label,children,className=''}:{checked:boolean;onChange:()=>void;label?:string;children?:React.ReactNode;className?:string}){
 return <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={`lx-checkbox ${checked?'is-checked':''} ${className}`} onClick={onChange}>
  <span className="lx-checkbox-box" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg></span>{children}</button>;
}
