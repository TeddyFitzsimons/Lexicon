import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTest,gradeQuestion,letterGrade,scoreTest,isAnswered} from '../src/lib/test.ts';
import {pickQuote,pageQuote,quotes} from '../src/lib/quotes.ts';
import {pickFeatured} from '../src/lib/featured.ts';
const word=(id,term,def,pos='Adjective')=>({id,term,partOfSpeech:pos,readablePronunciation:'',senses:[{id:id+'s',definition:def,examples:[],subsenses:[]}]});
const lib=['calm','brisk','vivid','placid','terse','wry'].map((t,i)=>word(String(i),t,`Definition of ${t}`));
const shown=segs=>segs.map(s=>s.hidden?'_':s.text).join('');

test('respects question count, one question per word',()=>{
 assert.equal(buildTest(lib,{format:'choice',answerWith:'both',count:4}).length,4);
 assert.equal(buildTest(lib,{format:'choice',answerWith:'both',count:99}).length,6);
 const ids=buildTest(lib,{format:'mixed',answerWith:'both',count:6}).map(q=>q.term);
 assert.equal(new Set(ids).size,6);
 assert.deepEqual(buildTest([lib[0]],{format:'choice',answerWith:'both',count:5}),[]);
});
test('answer-with setting decides the prompt',()=>{
 for(const q of buildTest(lib,{format:'choice',answerWith:'terms',count:6})){assert.equal(q.prompt,'definition');assert.ok(!shown(q.promptSegments).includes(q.term));assert.ok(q.options.some(o=>o.text===q.term&&o.correct))}
 for(const q of buildTest(lib,{format:'choice',answerWith:'definitions',count:6})){assert.equal(q.prompt,'term');assert.equal(q.options.length,4);assert.equal(q.options.filter(o=>o.correct).length,1);for(const o of q.options)assert.ok(!shown(o.segments).includes(o.owner))}
});
test('grades every format',()=>{
 const [c]=buildTest(lib,{format:'choice',answerWith:'terms',count:1});
 assert.equal(gradeQuestion(c,{choice:c.options.find(o=>o.correct).id}),true);
 assert.equal(gradeQuestion(c,{choice:c.options.find(o=>!o.correct).id}),false);
 assert.equal(gradeQuestion(c,undefined),false);
 const [w]=buildTest(lib,{format:'written',answerWith:'terms',count:1});
 assert.equal(gradeQuestion(w,{text:`  ${w.term.toUpperCase()} `}),true);
 assert.equal(gradeQuestion(w,{text:'nope'}),false);
 const [d]=buildTest(lib,{format:'written',answerWith:'definitions',count:1});
 assert.equal(gradeQuestion(d,{text:'something'}),null,'written definitions wait for a self-mark');
 assert.equal(gradeQuestion(d,{text:'something',selfMark:true}),true);
 assert.equal(gradeQuestion(d,{text:'  '}),false);
 const tf=buildTest(lib,{format:'truefalse',answerWith:'both',count:6});
 for(const q of tf){assert.equal(gradeQuestion(q,{bool:q.isMatch}),true);assert.equal(q.isMatch,q.shownOwner===q.term);assert.ok(!shown(q.shownSegments).includes(q.term))}
 assert.equal(isAnswered(tf[0],{bool:false}),true);assert.equal(isAnswered(tf[0],{}),false);
});
test('letter grades and scoring',()=>{
 assert.equal(letterGrade(100),'A+');assert.equal(letterGrade(90),'A−');assert.equal(letterGrade(85),'B');assert.equal(letterGrade(59),'F');
 const qs=buildTest(lib,{format:'written',answerWith:'terms',count:4});
 const r=scoreTest(qs,{[qs[0].id]:{text:qs[0].term},[qs[1].id]:{text:qs[1].term},[qs[2].id]:{text:qs[2].term}});
 assert.deepEqual(r,{correct:3,graded:4,pending:0,total:4,percent:75,grade:'C'});
});
test('quotes and featured banner never repeat back to back',()=>{
 for(let i=0;i<40;i++){const a=pickQuote();assert.notEqual(pickQuote([a]).author,a.author)}
 assert.equal(quotes.length,16);
 assert.equal(new Set(quotes.map(q=>q.text)).size,16);
 const first=pageQuote();for(let i=0;i<10;i++)assert.equal(pageQuote(),first,'sidebar quote is stable for the page load');
 for(let i=0;i<20;i++)assert.notEqual(pickFeatured(['sentence','meaning','test'],'meaning'),'meaning');
 assert.equal(pickFeatured(['test'],'test'),'test');assert.equal(pickFeatured([],null),null);
});
