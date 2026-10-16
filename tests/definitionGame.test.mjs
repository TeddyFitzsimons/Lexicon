import test from 'node:test';
import assert from 'node:assert/strict';
import {meaningQuestions} from '../src/lib/definitionGame.ts';
import {maskTerms} from '../src/lib/gameText.ts';
const word=(id,term,definitions,partOfSpeech='Adjective')=>({id,term,partOfSpeech,readablePronunciation:'',senses:definitions.map((definition,i)=>({id:`${id}-${i}`,definition,examples:[],subsenses:[]}))});
const joinMasked=segments=>segments.map(s=>s.hidden?'_':s.text).join('');
test('masks whole-word terms, phrases and simple suffixed forms',()=>{
 assert.equal(joinMasked(maskTerms('Calm, calmly and calmness; not becalmed.',['calm'])),'_, _ and calmness; not becalmed.');
 assert.equal(joinMasked(maskTerms('To act in an ad hoc way.',['ad hoc'])),'To act in an _ way.');
 assert.equal(joinMasked(maskTerms('A cart full of art.',['art'])),'A cart full of _.');
 assert.equal(joinMasked(maskTerms('Arts and art.',['art'])),'Arts and _.','short terms only match exactly');
 assert.deepEqual(maskTerms('Nothing hidden.',[]),[{text:'Nothing hidden.',hidden:false}]);
});
test('builds five unique options with exactly one correct definition',()=>{
 const words=['calm','brisk','vivid','placid','terse','wry'].map((t,i)=>word(String(i),t,[`Definition of ${t}`]));
 const questions=meaningQuestions(words);
 assert.equal(questions.length,6);
 for(const q of questions){
  assert.equal(q.options.length,5);
  assert.equal(q.options.filter(o=>o.correct).length,1);
  assert.equal(q.options.find(o=>o.correct).definition,`Definition of ${q.term}`);
  assert.equal(new Set(q.options.map(o=>o.definition)).size,5);
  for(const o of q.options){const shown=joinMasked(o.segments);assert.ok(!shown.includes(q.term));assert.ok(!shown.includes(o.owner))}
 }
});
test('prefers distractors with the same part of speech',()=>{
 const words=[word('a','run',['To move fast'],'Verb'),word('b','walk',['To move on foot'],'Verb'),word('c','calm',['Quiet']),word('d','loud',['Noisy'])];
 const q=meaningQuestions(words,2).find(x=>x.term==='run');
 assert.equal(q.options.find(o=>!o.correct).owner,'walk');
});
test('small, duplicate and empty libraries stay safe',()=>{
 assert.deepEqual(meaningQuestions([]),[]);
 assert.deepEqual(meaningQuestions([word('1','calm',['Quiet'])]),[]);
 assert.deepEqual(meaningQuestions([word('1','calm',['Quiet']),word('2','Calm',['Still'])]),[],'same spelling counts as one word');
 const q=meaningQuestions([word('1','calm',['Quiet']),word('2','brisk',['Quick']),word('3','blank',[''])]);
 assert.equal(q.length,2);for(const x of q)assert.equal(x.options.length,2);
 const same=meaningQuestions([word('1','calm',['Quiet']),word('2','still',['Quiet'])]);
 assert.deepEqual(same,[],'identical definitions are never offered as distractors');
});
