import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanSenses,definedMeanings,definitionRows,letterFor,meanings,moved,sensesProblem} from '../src/lib/senses.ts';
import {cleaned,normalize} from '../src/lib/words.ts';
import {entries} from '../src/lib/definitionGame.ts';
import {playableQuestions} from '../src/lib/sentenceGame.ts';
import {buildShareFile,parseImport} from '../src/lib/share.ts';

/** The validation case: three numbered definitions, two lettered subdefinitions under 2. */
const lexiconSenses=()=>[
 {id:'d1',definition:'A book containing an alphabetical arrangement of words in a language and their definitions.',examples:['She kept a lexicon of Greek on her desk.'],subsenses:[]},
 {id:'d2',definition:'',examples:[],subsenses:[
  {id:'d2a',definition:'The vocabulary of a language, individual speaker, group of speakers, or subject.',examples:['The lexicon of sailing is full of odd words.']},
  {id:'d2b',definition:'The total stock of morphemes in a language.',examples:['Linguists catalogued the lexicon of the dialect.']},
 ]},
 {id:'d3',definition:'A repertoire or inventory.',examples:['A lexicon of dance moves.','Her lexicon of excuses was endless.'],subsenses:[]},
];
const lexicon=()=>normalize({id:'w-lexicon',term:'Lexicon',partOfSpeech:'Noun',senses:lexiconSenses()});
const other=(id,term,definition,example)=>normalize({id,term,partOfSpeech:'Noun',senses:[{id:id+'s',definition,examples:[example]}]});

test('Lexicon displays as 1, 2a, 2b, 3',()=>{
 assert.deepEqual(definedMeanings(lexicon().senses).map(m=>m.label),['1','2a','2b','3']);
 assert.deepEqual(definitionRows(lexicon().senses).map(r=>[r.number,r.letter,r.isHeading]),[['1.','',false],['2.','',true],['','a.',false],['','b.',false],['3.','',false]]);
});

test('examples stay attached to their own definition and carry its label',()=>{
 const byLabel=Object.fromEntries(meanings(lexicon().senses).map(m=>[m.label,m.examples]));
 assert.deepEqual(byLabel['2a'],['The lexicon of sailing is full of odd words.']);
 assert.deepEqual(byLabel['2b'],['Linguists catalogued the lexicon of the dialect.']);
 assert.equal(byLabel['3'].length,2);
 const rows=definitionRows(lexicon().senses);
 assert.equal(rows.find(r=>r.label==='2b').examples[0],'Linguists catalogued the lexicon of the dialect.');
});

test('reordering and deleting renumber automatically; ids and examples move with their definition',()=>{
 const senses=lexiconSenses();
 // Move definition 3 to the top.
 const reordered=moved(moved(senses,2,-1),1,-1);
 assert.deepEqual(definedMeanings(reordered).map(m=>[m.label,m.id]),[['1','d3'],['2','d1'],['3a','d2a'],['3b','d2b']]);
 assert.equal(definedMeanings(reordered)[0].examples.length,2);
 // Swap 2a and 2b.
 const swapped=senses.map(s=>s.id==='d2'?{...s,subsenses:moved(s.subsenses,1,-1)}:s);
 assert.deepEqual(definedMeanings(swapped).map(m=>[m.label,m.id]),[['1','d1'],['2a','d2b'],['2b','d2a'],['3','d3']]);
 // Delete 2a: 2b becomes 2a. Delete definition 1: everything moves up a number.
 const withoutSub=senses.map(s=>s.id==='d2'?{...s,subsenses:s.subsenses.filter(x=>x.id!=='d2a')}:s);
 assert.deepEqual(definedMeanings(withoutSub).map(m=>[m.label,m.id]),[['1','d1'],['2a','d2b'],['3','d3']]);
 assert.deepEqual(definedMeanings(senses.slice(1)).map(m=>m.label),['1a','1b','2']);
 // Out-of-range moves change nothing.
 assert.equal(moved(senses,0,-1),senses);
 assert.equal(moved(senses,2,1),senses);
});

test('saving keeps the hierarchy, trims text and drops only empty entries',()=>{
 const draft={...lexicon(),senses:[...lexiconSenses(),{id:'empty',definition:'  ',examples:[],subsenses:[{id:'empty-sub',definition:'',examples:[]}]}]};
 draft.senses[1].subsenses[0]={...draft.senses[1].subsenses[0],definition:'  The vocabulary of a language, individual speaker, group of speakers, or subject.  '};
 const saved=cleaned(draft,'w-lexicon');
 assert.equal(saved.senses.length,3);
 assert.equal(saved.senses[1].subsenses[0].definition,'The vocabulary of a language, individual speaker, group of speakers, or subject.');
 assert.equal(saved.definition,lexiconSenses()[0].definition,'legacy top-level definition is the first definition');
 assert.deepEqual(normalize(JSON.parse(JSON.stringify(saved))),saved,'survives a save and reload unchanged');
});

test('existing vocabulary migrates without losing a definition or an example',()=>{
 const oldStyle=normalize({id:'x',term:'placid',partOfSpeech:'Adjective',senses:[{id:'s1',definition:'Calm.',examples:['A placid lake.']},{id:'s2',definition:'Not easily upset.',examples:[]}]});
 assert.deepEqual(oldStyle.senses.map(s=>[s.id,s.definition,s.examples,s.subsenses]),[['s1','Calm.',['A placid lake.'],[]],['s2','Not easily upset.',[],[]]]);
 const original=normalize({id:'y',term:'terse',definition:'Brief.',example:'A terse reply.'});
 assert.deepEqual(original.senses.map(s=>[s.definition,s.examples,s.subsenses]),[['Brief.',['A terse reply.'],[]]]);
 assert.deepEqual(definedMeanings(oldStyle.senses).map(m=>m.label),['1','2']);
});

test('validation catches examples that would otherwise be lost',()=>{
 assert.equal(sensesProblem(lexiconSenses()),null);
 assert.match(sensesProblem([{id:'a',definition:'',examples:['An orphan example.'],subsenses:[]}]),/Definition 1 has examples but no text/);
 assert.match(sensesProblem([{id:'a',definition:'Fine.',examples:[],subsenses:[{id:'b',definition:'Also fine.',examples:[]},{id:'c',definition:' ',examples:['Lost?']}]}]),/Definition 1b has examples/);
 assert.equal(sensesProblem([{id:'a',definition:'',examples:[],subsenses:[]}]),'needs a definition');
 assert.equal(cleanSenses([{id:'a',definition:'',examples:[],subsenses:[]}]).length,0);
});

test('letters run a to z, then aa',()=>{
 assert.deepEqual([0,1,25,26,27].map(letterFor),['a','b','z','aa','ab']);
});

test('games and tests use every definition, subdefinitions included',()=>{
 const library=[lexicon(),other('o1','placid','Calm and peaceful.','A placid lake.'),other('o2','terse','Brief to the point of rudeness.','A terse reply.')];
 const lex=entries(library).find(e=>e.term==='Lexicon');
 assert.deepEqual(lex.senses.map(s=>s.label),['1','2a','2b','3']);
 assert.ok(lex.senses.some(s=>s.definition==='The total stock of morphemes in a language.'));
 // Sentence game: each sentence is paired with the definition it was written for.
 const questions=playableQuestions(library).filter(q=>q.term==='Lexicon');
 assert.equal(questions.length,1);
 const expected=Object.fromEntries(meanings(lexicon().senses).flatMap(m=>m.examples.map(e=>[e,m.definition])));
 assert.equal(questions[0].definition,expected[questions[0].sentence]);
});

test('share files carry subdefinitions and read back into the same hierarchy',()=>{
 const file=JSON.stringify(buildShareFile([lexicon()],'Teddy'));
 const parsed=parseImport(file,[]);
 const shared=parsed.items[0].word;
 assert.equal(shared.senses[1].definition,'');
 assert.deepEqual(shared.senses[1].subsenses.map(x=>x.definition),lexiconSenses()[1].subsenses.map(x=>x.definition));
 assert.deepEqual(shared.senses[1].subsenses[1].examples,['Linguists catalogued the lexicon of the dialect.']);
});
