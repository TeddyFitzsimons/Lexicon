import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSentence,answerKey,playableQuestions} from '../src/lib/sentenceGame.ts';
const word=(id,term,examples)=>({id,term,senses:[{id:'s'+id,definition:'Definition of '+term,examples,subsenses:[]}]});
test('blanks whole words, preserves punctuation and hides repeated answers',()=>{
 assert.deepEqual(blankSentence('Art is art, not a cart.','art'),['',' is ', ', not a cart.']);
 assert.equal(blankSentence('The artist arrived.','art'),null);
 assert.deepEqual(blankSentence('A café, beside another café.','café'),['A ', ', beside another ', '.']);
});
test('handles phrases, literal regex symbols and whitespace',()=>{
 assert.deepEqual(blankSentence('An ad  hoc arrangement.','ad hoc'),['An ', ' arrangement.']);
 assert.deepEqual(blankSentence('I write C++ today.','C++'),['I write ', ' today.']);
 assert.equal(blankSentence('Anything',''),null);
});
test('typed answers ignore capitalization, edge spaces and curly apostrophes',()=>{
 assert.equal(answerKey('  DON’T  '),answerKey("don't"));
 assert.equal(answerKey('ad   hoc'),answerKey('Ad hoc'));
 assert.notEqual(answerKey('walked'),answerKey('walk'));
});
test('only generates answerable questions and unique choices from the library',()=>{
 const words=[word('1','calm',['A calm afternoon.']),word('2','brisk',['A brisk walk.']),word('3','calm',['Stay calm.']),word('4','vivid',['No match here.'])];
 const questions=playableQuestions(words);
 assert.equal(questions.length,2);
 for(const q of questions){assert.ok(q.pieces.length>1);assert.ok(q.choices.includes(q.term));assert.equal(new Set(q.choices.map(answerKey)).size,q.choices.length);assert.ok(q.choices.every(c=>words.some(w=>w.term===c)))}
});
test('empty and single-word libraries remain safe',()=>{
 assert.deepEqual(playableQuestions([]),[]);
 const q=playableQuestions([word('1','calm',['Stay calm.'])])[0];
 assert.deepEqual(q.choices,['calm']);
});
