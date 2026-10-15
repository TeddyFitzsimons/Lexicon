import {addDays,dayKey,fromDayKey,isDayKey} from './dates.ts';

/** What happened on a day. "Active" means you practiced, tested, studied, added or edited, not just opened the app. */
export type ActivityKind='practiced'|'tested'|'studied'|'added'|'edited'|'shared'|'imported';
export type DayLog=Partial<Record<ActivityKind,number>>;
/** One save that added words: how many at once, which ones, and who they came from. */
export type WordBatch={at:string;kind:'added'|'imported';count:number;words:string[];from?:string};
export type Profile={name:string;days:Record<string,DayLog>;events:WordBatch[]};
const KINDS:ActivityKind[]=['practiced','tested','studied','added','edited','shared','imported'];
export const emptyProfile=():Profile=>({name:'',days:{},events:[]});
/** Batches kept, newest first; words listed per batch. Older batches still count in the calendar. */
export const MAX_EVENTS=300,MAX_EVENT_WORDS=50;
export const MAX_NAME=40;

export function normalizeProfile(raw:unknown):Profile{
 const r=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>;
 const days:Record<string,DayLog>={};
 if(r.days&&typeof r.days==='object')for(const [k,v] of Object.entries(r.days as Record<string,unknown>)){
  if(!isDayKey(k)||!v||typeof v!=='object')continue;
  const log:DayLog={};
  for(const kind of KINDS){const n=(v as Record<string,unknown>)[kind];if(Number.isInteger(n)&&(n as number)>0)log[kind]=n as number}
  if(Object.keys(log).length)days[k]=log;
 }
 const events:WordBatch[]=Array.isArray(r.events)?r.events.flatMap((e):WordBatch[]=>{
  if(!e||typeof e!=='object')return [];
  const x=e as Record<string,unknown>;
  if(typeof x.at!=='string'||Number.isNaN(Date.parse(x.at))||(x.kind!=='added'&&x.kind!=='imported')||!Number.isInteger(x.count)||(x.count as number)<1)return [];
  const words=Array.isArray(x.words)?x.words.filter((w):w is string=>typeof w==='string').slice(0,MAX_EVENT_WORDS).map(w=>w.slice(0,100)):[];
  return [{at:x.at,kind:x.kind,count:x.count as number,words,...(typeof x.from==='string'&&x.from.trim()?{from:x.from.slice(0,MAX_NAME)}:{})}];
 }).slice(0,MAX_EVENTS):[];
 return {name:typeof r.name==='string'?r.name.slice(0,MAX_NAME):'',days,events};
}

/** Records a save that added words: bumps the day's count and logs the batch at the top of the feed. */
export function logBatch(profile:Profile,kind:'added'|'imported',terms:string[],from='',now=new Date()):Profile{
 if(!terms.length)return profile;
 const batch:WordBatch={at:now.toISOString(),kind,count:terms.length,words:terms.slice(0,MAX_EVENT_WORDS),...(from.trim()?{from:from.trim()}:{})};
 return {...record(profile,kind,terms.length,now),events:[batch,...profile.events].slice(0,MAX_EVENTS)};
}

/**
 * The words-added feed. Logged batches come first-hand; words saved before batches were
 * logged are grouped by the day they were added, one entry per day.
 */
export function wordBatches(profile:Profile,words:{term:string;addedAt:string}[]):(WordBatch&{approximate?:boolean})[]{
 const logged=new Set(profile.events.map(e=>dayKey(new Date(e.at))));
 const byDay=new Map<string,string[]>();
 for(const w of words)if(isDayKey(w.addedAt)&&!logged.has(w.addedAt))byDay.set(w.addedAt,[...(byDay.get(w.addedAt)||[]),w.term]);
 const derived=[...byDay].map(([day,terms])=>({at:fromDayKey(day).toISOString(),kind:'added' as const,count:terms.length,words:terms,approximate:true}));
 return [...profile.events,...derived].sort((a,b)=>b.at.localeCompare(a.at));
}
export function batchStats(batches:WordBatch[]){
 if(!batches.length)return null;
 const biggest=batches.reduce((m,b)=>b.count>m.count?b:m);
 const total=batches.reduce((n,b)=>n+b.count,0);
 return {batches:batches.length,total,average:Math.round(total/batches.length*10)/10,biggest};
}

/** Returns a new profile with `amount` more of `kind` on the given day. */
export function record(profile:Profile,kind:ActivityKind,amount=1,date=new Date()):Profile{
 if(amount<=0)return profile;
 const key=dayKey(date),day=profile.days[key]||{};
 return {...profile,days:{...profile.days,[key]:{...day,[kind]:(day[kind]||0)+amount}}};
}

export type Metric='active'|'added';
/** How much happened that day for the chosen metric; 0 means nothing. */
export function dayValue(log:DayLog|undefined,metric:Metric):number{
 if(!log)return 0;
 if(metric==='added')return (log.added||0)+(log.imported||0);
 return KINDS.reduce((sum,k)=>sum+(log[k]||0),0);
}

/** Current streak counts back from today, or from yesterday if today has nothing yet (so it isn't lost before you play). */
export function streaks(profile:Profile,metric:Metric,today=new Date()){
 const active=new Set(Object.keys(profile.days).filter(k=>dayValue(profile.days[k],metric)>0));
 let current=0,cursor=active.has(dayKey(today))?today:addDays(today,-1);
 while(active.has(dayKey(cursor))){current++;cursor=addDays(cursor,-1)}
 let longest=0,run=0,prev:Date|null=null;
 for(const key of [...active].sort()){
  const d=fromDayKey(key);
  run=prev&&dayKey(addDays(prev,1))===key?run+1:1;
  longest=Math.max(longest,run);prev=d;
 }
 return {current,longest,days:active.size};
}

export type CalendarCell={key:string;value:number;future:boolean;month:number};
/** Weeks (Sunday first) covering the last `weeks` weeks up to today, for the heatmap. */
export function calendarWeeks(profile:Profile,metric:Metric,weeks=26,today=new Date()):CalendarCell[][]{
 const end=addDays(today,6-today.getDay());
 const start=addDays(end,-(weeks*7)+1);
 const out:CalendarCell[][]=[];
 for(let w=0;w<weeks;w++){
  const week:CalendarCell[]=[];
  for(let d=0;d<7;d++){const date=addDays(start,w*7+d),key=dayKey(date);week.push({key,value:dayValue(profile.days[key],metric),future:date>today,month:date.getMonth()})}
  out.push(week);
 }
 return out;
}
/** 0–4 intensity bucket for a cell. */
export const level=(value:number)=>value<=0?0:value<2?1:value<4?2:value<8?3:4;

/** Earned milestones become trophies. Tier sets the metal; mark is what's engraved on the cup. */
export type Tier='bronze'|'silver'|'gold';
export type Milestone={id:string;title:string;detail:string;earned:boolean;tier:Tier;mark:string};
export function milestones(profile:Profile,wordCount:number,today=new Date()):Milestone[]{
 const s=streaks(profile,'active',today);
 const total=(k:ActivityKind)=>Object.values(profile.days).reduce((n,d)=>n+(d[k]||0),0);
 return [
  {id:'first',title:'First word',detail:'Save a word',tier:'bronze',mark:'1',earned:wordCount>=1},
  {id:'ten',title:'Ten words',detail:'Have 10 words',tier:'silver',mark:'10',earned:wordCount>=10},
  {id:'fifty',title:'Fifty words',detail:'Have 50 words',tier:'gold',mark:'50',earned:wordCount>=50},
  {id:'hundred',title:'A hundred words',detail:'Have 100 words',tier:'gold',mark:'100',earned:wordCount>=100},
  {id:'streak3',title:'Three days running',detail:'Be active 3 days in a row',tier:'bronze',mark:'3d',earned:s.longest>=3},
  {id:'streak7',title:'A full week',detail:'Be active 7 days in a row',tier:'silver',mark:'7d',earned:s.longest>=7},
  {id:'streak30',title:'A month of words',detail:'Be active 30 days in a row',tier:'gold',mark:'30d',earned:s.longest>=30},
  {id:'tested',title:'Tested',detail:'Finish a test',tier:'bronze',mark:'A+',earned:total('tested')>0},
 ];
}
