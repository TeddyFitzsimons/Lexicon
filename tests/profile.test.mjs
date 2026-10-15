import test from 'node:test';
import assert from 'node:assert/strict';
import {record,streaks,calendarWeeks,dayValue,normalizeProfile,milestones,emptyProfile,logBatch,wordBatches,batchStats} from '../src/lib/activity.ts';
import {buildShareFile,parseImport,toLibraryWords,shareFileName} from '../src/lib/share.ts';
import {letterPattern,hintsFor,spellQuestions,letterCount} from '../src/lib/spellGame.ts';
import {normalize} from '../src/lib/words.ts';

const day=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)};
const w=(term,def,extra={})=>normalize({id:term,term,partOfSpeech:'Adjective',senses:[{id:term+'s',definition:def,examples:extra.examples||[]}],...extra});

test('activity log, streaks and calendar',()=>{
 let p=emptyProfile();
 for(const d of ['2026-10-10','2026-10-11','2026-10-12','2026-10-14','2026-10-15'])p=record(p,'practiced',1,day(d));
 p=record(p,'added',3,day('2026-10-15'));
 assert.equal(dayValue(p.days['2026-10-15'],'active'),4);
 assert.equal(dayValue(p.days['2026-10-15'],'added'),3);
 assert.deepEqual(streaks(p,'active',day('2026-10-15')),{current:2,longest:3,days:5});
 assert.equal(streaks(p,'active',day('2026-10-16')).current,2,'today not active yet keeps yesterday’s streak');
 assert.equal(streaks(p,'active',day('2026-10-17')).current,0);
 assert.equal(streaks(p,'added',day('2026-10-15')).days,1);
 const weeks=calendarWeeks(p,'active',4,day('2026-10-15'));
 assert.equal(weeks.length,4);assert.ok(weeks.every(x=>x.length===7));
 const cells=weeks.flat();assert.equal(cells.find(c=>c.key==='2026-10-15').value,4);
 assert.ok(cells.find(c=>c.key==='2026-10-16').future);
 assert.equal(record(p,'practiced',0),p);
});
test('profiles from disk are cleaned',()=>{
 assert.deepEqual(normalizeProfile({name:'x'.repeat(100),days:{'bad':{practiced:1},'2026-01-01':{practiced:-2,added:2,evil:5}}}),{name:'x'.repeat(40),days:{'2026-01-01':{added:2}},events:[]});
 assert.deepEqual(normalizeProfile(null),emptyProfile());
 const m=milestones(record(emptyProfile(),'tested'),12);
 assert.ok(m.find(x=>x.id==='ten').earned);assert.ok(m.find(x=>x.id==='tested').earned);assert.ok(!m.find(x=>x.id==='fifty').earned);
 assert.equal(m.length,8);assert.ok(!m.some(x=>x.id==='shared'||x.id==='imported'),'sharing and importing are not milestones');
 assert.ok(m.every(x=>['bronze','silver','gold'].includes(x.tier)&&x.mark));
});
test('share files round-trip and strip private fields',()=>{
 const lib=[w('placid','Calm.',{favorite:true,examples:['A placid lake.'],synonyms:[{term:'calm',url:'https://www.merriam-webster.com/dictionary/calm'}]}),w('brisk','Quick.')];
 const file=buildShareFile(lib,'Teddy',new Date('2026-10-15T12:00:00Z'));
 assert.equal(file.format,'lexicon-share');assert.equal(file.words.length,2);
 assert.ok(!('id' in file.words[0])&&!('favorite' in file.words[0]));
 const parsed=parseImport(JSON.stringify(file),[w('Brisk','Fast.')]);
 assert.ok(parsed.ok);assert.equal(parsed.from,'Teddy');
 assert.deepEqual(parsed.items.map(i=>[i.word.term,i.duplicate]),[['placid',false],['brisk',true]]);
 const added=toLibraryWords([parsed.items[0].word]);
 assert.equal(added[0].term,'placid');assert.equal(added[0].senses[0].examples[0],'A placid lake.');assert.equal(added[0].favorite,false);assert.match(added[0].addedAt,/^\d{4}-\d{2}-\d{2}$/);
 assert.equal(added[0].synonyms[0].url,'https://www.merriam-webster.com/dictionary/calm');
 assert.equal(shareFileName('Teddy F.',new Date(2026,9,15)),'lexicon-teddy-f-2026-10-15.json');
});
test('imports reject bad input safely',()=>{
 assert.equal(parseImport('not json',[]).ok,false);
 assert.equal(parseImport('{"hello":1}',[]).ok,false);
 assert.equal(parseImport(JSON.stringify({format:'lexicon-share',version:99,words:[]}),[]).ok,false);
 const r=parseImport(JSON.stringify([{term:'ok',definition:'Fine.',example:'It is ok.'},{term:'',definition:'x'},{term:'nodef'},'junk',{term:'ok',definition:'again'},{term:'evil',definition:'d',synonyms:[{term:'x',url:'javascript:alert(1)'}],partOfSpeech:{}}]),[]);
 assert.ok(r.ok);assert.deepEqual(r.items.map(i=>i.word.term),['ok','evil']);
 assert.equal(r.items[0].word.senses[0].examples[0],'It is ok.');
 assert.equal(r.items[1].word.synonyms[0].url,'','unsafe links are dropped');
 assert.equal(r.items[1].word.partOfSpeech,'Other');
 assert.equal(r.rejected.length,4);
 assert.equal(parseImport(JSON.stringify(Array(5001).fill({term:'a',definition:'b'})),[]).ok,false);
});
test('spell it hints never give the whole word away early',()=>{
 assert.deepEqual(letterPattern('placid',1),['p',null,null,null,null,null]);
 assert.deepEqual(letterPattern('placid',3),['p',null,'a',null,'i',null]);
 assert.deepEqual(letterPattern("ad hoc",1),['a',null,' ',null,null,null]);
 assert.equal(letterCount("don't"),4);
 assert.deepEqual(hintsFor(0),{pattern:0,meaning:false,example:false});
 assert.deepEqual(hintsFor(3),{pattern:3,meaning:true,example:true});
 const [q]=spellQuestions([w('placid','Placid and calm.',{examples:['A placid lake.']}),w('brisk','Quick.')]);
 assert.equal(q.example,'A _____ lake.');assert.ok(q.definition.some(s=>s.hidden));
});

test('word batches log how many were added at once',()=>{
 let p=logBatch(emptyProfile(),'added',['placid','brisk','terse'],'',new Date(2026,9,15,9));
 p=logBatch(p,'imported',['laconic'],'Sun',new Date(2026,9,15,18));
 assert.equal(logBatch(p,'added',[]),p,'empty saves log nothing');
 assert.equal(p.days['2026-10-15'].added,3);assert.equal(p.days['2026-10-15'].imported,1);
 assert.deepEqual(p.events.map(e=>[e.kind,e.count,e.from]),[['imported',1,'Sun'],['added',3,undefined]]);
 // Words from before batches were logged are grouped by the day they were added.
 const feed=wordBatches(p,[{term:'old',addedAt:'2026-10-01'},{term:'older',addedAt:'2026-10-01'},{term:'legacy',addedAt:''},{term:'placid',addedAt:'2026-10-15'}]);
 assert.deepEqual(feed.map(b=>[b.count,!!b.approximate]),[[1,false],[3,false],[2,true]]);
 assert.deepEqual(batchStats(feed),{batches:3,total:6,average:2,biggest:feed[1]});
 assert.equal(batchStats([]),null);
 const many=logBatch(emptyProfile(),'added',Array.from({length:80},(_,i)=>'w'+i));
 assert.equal(many.events[0].count,80);assert.equal(many.events[0].words.length,50);
 const round=normalizeProfile(JSON.parse(JSON.stringify(p)));assert.deepEqual(round,p);
 assert.deepEqual(normalizeProfile({name:'',days:{},events:[{at:'nope',kind:'added',count:1,words:[]},{at:new Date().toISOString(),kind:'evil',count:1}]}).events,[]);
});
