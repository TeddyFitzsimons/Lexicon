/** Local calendar days as YYYY-MM-DD keys. Local, not UTC, so a late-night session counts for that evening. */
export function dayKey(date:Date):string{
 const p=(n:number)=>String(n).padStart(2,'0');
 return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}`;
}
export const isDayKey=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
export function fromDayKey(key:string):Date{const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d)}
export function addDays(date:Date,n:number):Date{const d=new Date(date);d.setDate(d.getDate()+n);return d}
