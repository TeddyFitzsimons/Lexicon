import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,cleaned,definitionEntries,letterFor,allDefinitionText} from '../src/lib/words.ts';
import {meaningQuestions,entries} from '../src/lib/definitionGame.ts';
import {playableQuestions} from '../src/lib/sentenceGame.ts';
import {buildTest} from '../src/lib/test.ts';
import {buildShareFile,parseImport,toLibraryWords} from '../src/lib/share.ts';
import {buildBackup,parseRestore} from '../src/lib/backup.ts';

const primary=(id,definition,examples=[],subdefinitions=[])=>({id,definition,examples,subdefinitions});
const sub=(id,definition,examples=[])=>({id,definition,examples});
const lexicon=()=>normalize({id:'lexicon-id',term:'Lexicon',partOfSpeech:'Noun',senses:[
 primary('primary1','A book containing an alphabetical arrangement of words in a language and their definitions.',['She consulted the lexicon.']),
 primary('primary2','',[],[
  sub('2a','The vocabulary of a language, individual speaker, group of speakers, or subject.',['The scientist added it to her lexicon.']),
  sub('2b','The total stock of morphemes in a language.',['A lexicon contains morphemes.'])]),
 primary('primary3','A repertoire or inventory.',['A lexicon of styles was on display.'])]});

test('Lexicon 1, 2a, 2b, 3: IDs, example ownership, positions, labels',()=>{
 const w=lexicon();
 assert.deepEqual(definitionEntries(w).map(x=>x.label),['1','2a','2b','3']);
 assert.deepEqual(definitionEntries(w).map(x=>x.id),['primary1','2a','2b','primary3']);
 assert.equal(w.senses[1].definition,'');
 assert.deepEqual(w.senses.map(s=>s.position),[0,1,2]);
 assert.deepEqual(w.senses[1].subdefinitions.map(s=>s.position),[0,1]);
 assert.equal(definitionEntries(w).find(x=>x.id==='2b').examples[0],'A lexicon contains morphemes.');
 assert.equal(w.definition,w.senses[0].definition);
 assert.equal(allDefinitionText(w).includes('A lexicon contains morphemes.'),true);
 assert.equal(letterFor(0),'a');assert.equal(letterFor(25),'z');assert.equal(letterFor(26),'aa');
});

test('reorder or delete parents/children: positions and labels change, IDs and examples do not',()=>{
 const w=lexicon();
 const draft={...w,senses:[w.senses[2],{...w.senses[1],subdefinitions:[w.senses[1].subdefinitions[1],w.senses[1].subdefinitions[0]]},w.senses[0]]};
 const changed=cleaned(draft,w.id);
 assert.deepEqual(definitionEntries(changed).map(x=>x.label),['1','2a','2b','3']);
 assert.deepEqual(definitionEntries(changed).map(x=>x.id),['primary3','2b','2a','primary1']);
 assert.equal(definitionEntries(changed)[1].examples[0],'A lexicon contains morphemes.');
 assert.deepEqual(changed.senses.map(s=>s.position),[0,1,2]);
 assert.deepEqual(changed.senses[1].subdefinitions.map(s=>s.position),[0,1]);
 const removed=cleaned({...changed,senses:changed.senses.filter(s=>s.id!=='primary3').map(s=>({...s,subdefinitions:s.subdefinitions.filter(sub=>sub.id!=='2b')}))},w.id);
 assert.deepEqual(definitionEntries(removed).map(x=>[x.label,x.id]),[['1a','2a'],['2','primary1']]);
 assert.equal(removed.senses[0].subdefinitions[0].examples[0],'The scientist added it to her lexicon.');
});

test('migrates old flat meanings and legacy single definitions without losing examples',()=>{
 const flat=normalize({id:'existing',term:'Old',senses:[{id:'old1',definition:'First',examples:['First sentence']},{id:'old2',definition:'Second',examples:['Second sentence']}],favorite:true});
 assert.deepEqual(flat.senses.map(x=>x.subdefinitions),[[],[]]);
 assert.deepEqual(flat.senses.map(x=>x.id),['old1','old2']);
 assert.equal(flat.senses[0].examples[0],'First sentence');assert.equal(flat.favorite,true);
 const old=normalize({id:'legacy',term:'Former',definition:'Legacy definition',example:'Former is used here.'});
 assert.equal(old.senses[0].definition,'Legacy definition');
 assert.deepEqual(old.senses[0].examples,['Former is used here.']);
 assert.equal(old.examples[0],'Former is used here.');
});

test('import, share, backup round trips preserve grouping and examples',()=>{
 const w=lexicon();
 const shared=buildShareFile([w],'A reader');
 assert.equal(shared.version,2);
 assert.equal(shared.words[0].senses[1].subdefinitions.length,2);
 const imported=parseImport(JSON.stringify(shared),[]);
 assert.equal(imported.ok,true);
 const converted=toLibraryWords(imported.items.map(item=>item.word));
 assert.deepEqual(definitionEntries(converted[0]).map(x=>x.label),['1','2a','2b','3']);
 assert.equal(converted[0].senses[1].subdefinitions[1].examples[0],'A lexicon contains morphemes.');
 assert.notEqual(converted[0].senses[1].subdefinitions[1].id,w.senses[1].subdefinitions[1].id);
 const profile={name:'',days:{},events:[]};
 const restored=parseRestore([{name:'backup.json',text:JSON.stringify(buildBackup([w],profile))}]);
 assert.equal(restored.ok,true);assert.deepEqual(restored.words[0],w);
});

test('games recognize lettered subdefinitions and the examples belonging to them',()=>{
 const w=lexicon();const other=normalize({term:'archive',id:'archive',definition:'A collection of records',partOfSpeech:'Noun'});
 const choices=entries([w,other]);
 assert.deepEqual(choices[0].senses.map(x=>x.id),['primary1','2a','2b','primary3']);
 const questions=meaningQuestions([w,other]);assert.equal(questions.length,2);
 const testQs=buildTest([w,other],{format:'choice',answerWith:'definitions',count:2});assert.equal(testQs.length,2);
 const candidates=playableQuestions([w]);assert.equal(candidates.length,1);
 const allExampleSentences=new Set(definitionEntries(w).flatMap(x=>x.examples));
 assert.ok(allExampleSentences.has(candidates[0].sentence));
 // A word with examples exclusively beneath a lettered sense is still playable.
 const onlyChild=normalize({term:'subjective',id:'child',senses:[primary('group','',[],[sub('child-sub','Relating to a subject',['The answer was subjective.'])])]});
 assert.equal(playableQuestions([onlyChild])[0].definition,'Relating to a subject');
 assert.equal(playableQuestions([onlyChild])[0].sentence,'The answer was subjective.');
});
