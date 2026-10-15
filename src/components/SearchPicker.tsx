import {useEffect,useRef,useState} from 'react';

type Option={id:string;label:string;detail?:string};
/** Accessible custom combobox: filtered choices, keyboard navigation and click-away dismissal. */
export function SearchPicker({label,options,onSelect}:{label:string;options:Option[];onSelect:(id:string)=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{function outside(e:PointerEvent){if(root.current&&!root.current.contains(e.target as Node))setOpen(false)}document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[]);
 const filtered=options.filter(o=>`${o.label} ${o.detail||''}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.label.localeCompare(b.label));
 function choose(id:string){onSelect(id);setOpen(false);setQuery('');setActive(0)}
 return <div className="picker" ref={root}><button type="button" className="picker-trigger" aria-expanded={open} aria-label={label} onClick={()=>setOpen(!open)}>+ Link vocabulary card <span>⌄</span></button>{open&&<div className="picker-menu"><input autoFocus aria-label={`Search ${label}`} placeholder="Search vocabulary…" value={query} onChange={e=>{setQuery(e.target.value);setActive(0)}} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setActive(Math.min(active+1,filtered.length-1))}if(e.key==='ArrowUp'){e.preventDefault();setActive(Math.max(active-1,0))}if(e.key==='Enter'&&filtered[active]){e.preventDefault();choose(filtered[active].id)}if(e.key==='Escape')setOpen(false)}}/><div className="picker-options" role="listbox">{filtered.length?filtered.map((o,i)=><button type="button" role="option" aria-selected={i===active} className={i===active?'picker-active':''} key={o.id} onClick={()=>choose(o.id)}><strong>{o.label}</strong>{o.detail&&<small>{o.detail}</small>}</button>):<p className="picker-empty">No matching cards. Create one after saving this word.</p>}</div></div>}</div>
}

/** Small custom choice menu used instead of native OS dropdowns. */
export function ChoicePicker({value,options,onChange}:{value:string;options:string[];onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{function outside(e:PointerEvent){if(root.current&&!root.current.contains(e.target as Node))setOpen(false)}document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[]);
 return <div className="picker" ref={root}><button type="button" className="picker-trigger" aria-expanded={open} onClick={()=>setOpen(!open)}>{value}<span>⌄</span></button>{open&&<div className="picker-menu picker-options" role="listbox">{options.map(option=><button type="button" role="option" aria-selected={option===value} className={option===value?'picker-active':''} key={option} onClick={()=>{onChange(option);setOpen(false)}}>{option===value?'✓  ':''}{option}</button>)}</div>}</div>;
}
