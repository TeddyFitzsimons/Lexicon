import test from 'node:test';
import assert from 'node:assert/strict';
import {cleaned,normalize} from '../src/lib/words.ts';
import {definedMeanings,definitionRows,meanings,moved,sensesProblem} from '../src/lib/senses.ts';
import {dictionaryUrl,cleanRelated,noRelations} from '../src/lib/relations.ts';
import {entries} from '../src/lib/definitionGame.ts';
import {playableQuestions} from '../src/lib/sentenceGame.ts';
import {buildShareFile,parseImport,toLibraryWords} from '../src/lib/share.ts';

const t=(...terms)=>terms.map(term=>({term,url:''}));
/** The example from the brief: "bright" with 1, 2a and 2b, each with its own relationships. */
const brightSenses=()=>[
 {id:'b1',definition:'Giving off a lot of light.',examples:['A bright lamp.'],subsenses:[],synonyms:t('luminous','radiant'),antonyms:t('dim','dark'),relatedForms:t('brightness')},
 {id:'b2',definition:'',examples:[],...noRelations(),subsenses:[
  {id:'b2a',definition:'Highly intelligent.',examples:['A bright student.'],synonyms:t('clever','brilliant'),antonyms:t('unintelligent','dull'),relatedForms:t('brightly')},
  {id:'b2b',definition:'Cheerful and optimistic.',examples:['A bright smile.'],synonyms:t('cheerful','upbeat'),antonyms:t('gloomy','pessimistic'),relatedForms:[]},
 ]},
];
const bright=()=>normalize({id:'w-bright',term:'bright',partOfSpeech:'Adjective',senses:brightSenses()});
const byLabel=word=>Object.fromEntries(meanings(word.senses).map(m=>[m.label,m]));
const terms=list=>list.map(x=>x.term);

test('synonyms, antonyms and related forms belong to their own definition, subdefinitions included',()=>{
 const m=byLabel(cleaned(bright(),'w-bright'));
 assert.deepEqual(terms(m['1'].synonyms),['luminous','radiant']);
 assert.deepEqual(terms(m['1'].antonyms),['dim','dark']);
 assert.deepEqual(terms(m['1'].relatedForms),['brightness']);
 assert.deepEqual(terms(m['2a'].synonyms),['clever','brilliant']);
 assert.deepEqual(terms(m['2a'].relatedForms),['brightly']);
 assert.deepEqual(terms(m['2b'].antonyms),['gloomy','pessimistic']);
 assert.deepEqual(m['2b'].relatedForms,[]);
});

test('definitions stay independent: nothing is copied between meanings or up to the word',()=>{
 const word=cleaned(bright(),'w-bright');
 const m=byLabel(word);
 assert.ok(!terms(m['1'].synonyms).includes('clever'));
 assert.ok(!terms(m['2b'].synonyms).includes('clever'));
 assert.deepEqual([word.synonyms,word.antonyms,word.relatedForms],[[],[],[]]);
});

test('editing or deleting one entry changes only that definition',()=>{
 const word=bright();
 const sub=word.senses[1].subsenses[0];
 const edited={...word,senses:[word.senses[0],{...word.senses[1],subsenses:[{...sub,synonyms:sub.synonyms.filter(x=>x.term!=='clever'),antonyms:[...sub.antonyms,{term:'slow',url:''}]},word.senses[1].subsenses[1]]}]};
 const m=byLabel(cleaned(edited,'w-bright'));
 assert.deepEqual(terms(m['2a'].synonyms),['brilliant']);
 assert.deepEqual(terms(m['2a'].antonyms),['unintelligent','dull','slow']);
 assert.deepEqual(terms(m['1'].synonyms),['luminous','radiant'],'definition 1 untouched');
 assert.deepEqual(terms(m['2b'].synonyms),['cheerful','upbeat'],'2b untouched');
});

test('saving trims entries and drops blanks and repeats',()=>{
 assert.deepEqual(cleanRelated([{term:' Clever ',url:' '},{term:'clever',url:''},{term:'',url:'x'}]),[{term:'Clever',url:''}]);
});

test('Merriam-Webster links: custom when valid, otherwise the word’s own page',()=>{
 assert.equal(dictionaryUrl({term:'Luminous',url:''}),'https://www.merriam-webster.com/dictionary/luminous');
 assert.equal(dictionaryUrl({term:'ice cream',url:''}),'https://www.merriam-webster.com/dictionary/ice%20cream');
 assert.equal(dictionaryUrl({term:'clever',url:'https://www.merriam-webster.com/dictionary/clever#dictionary-entry-1'}),'https://www.merriam-webster.com/dictionary/clever#dictionary-entry-1');
 assert.equal(dictionaryUrl({term:'clever',url:'https://example.com/clever'}),'https://www.merriam-webster.com/dictionary/clever','a non-dictionary link is never used');
});

test('migration: whole-word relationships are kept unassigned when the word has several meanings',()=>{
 const old=normalize({id:'x',term:'bright',senses:[{id:'s1',definition:'Shining.',examples:[]},{id:'s2',definition:'Clever.',examples:[]}],synonyms:[{term:'shiny',url:''}],antonyms:['dull']});
 assert.deepEqual(terms(old.synonyms),['shiny'],'not guessed onto a definition');
 assert.deepEqual(terms(old.antonyms),['dull']);
 assert.ok(old.senses.every(s=>!s.synonyms.length&&!s.antonyms.length));
 assert.deepEqual(old.senses.map(s=>s.definition),['Shining.','Clever.'],'definitions intact');
});

test('migration: with a single meaning there is no doubt, so relationships move onto it',()=>{
 const lookup=new Map([['card-9','tranquil']]);
 const old=normalize({id:'y',term:'placid',definition:'Calm.',example:'A placid lake.',synonyms:[{term:'calm',url:'https://www.merriam-webster.com/dictionary/calm'},'card-9'],relatedForms:[{term:'placidly',url:''}]},lookup);
 assert.deepEqual(terms(old.senses[0].synonyms),['calm','tranquil'],'legacy card ids are resolved');
 assert.equal(old.senses[0].synonyms[0].url,'https://www.merriam-webster.com/dictionary/calm');
 assert.deepEqual(terms(old.senses[0].relatedForms),['placidly']);
 assert.deepEqual(old.senses[0].examples,['A placid lake.']);
 assert.deepEqual([old.synonyms,old.antonyms,old.relatedForms],[[],[],[]]);
 assert.deepEqual(normalize(JSON.parse(JSON.stringify(old))),old,'stable on reload');
});

test('definitions without relationships work everywhere',()=>{
 const plain=normalize({id:'p',term:'terse',senses:[{id:'s',definition:'Brief.',examples:['A terse reply.']}]});
 assert.deepEqual([plain.senses[0].synonyms,plain.senses[0].antonyms,plain.senses[0].relatedForms],[[],[],[]]);
 assert.equal(sensesProblem(plain.senses),null);
 assert.equal(definitionRows(plain.senses).length,1);
});

test('relationships on a definition with no text block the save instead of being lost',()=>{
 const senses=brightSenses();
 senses[1].subsenses[1]={...senses[1].subsenses[1],definition:' ',examples:[]};
 assert.match(sensesProblem(senses),/Definition 2b has synonyms but no text/);
 const lonely=[{id:'a',definition:'',examples:[],subsenses:[],...noRelations(),relatedForms:t('brightly')}];
 assert.match(sensesProblem(lonely),/Definition 1 has related forms but no text/);
});

test('reordering and deleting carry relationships with their own definition',()=>{
 const senses=brightSenses();
 const swapped=senses.map(s=>s.id==='b2'?{...s,subsenses:moved(s.subsenses,1,-1)}:s);
 const m=Object.fromEntries(definedMeanings(swapped).map(x=>[x.label,x]));
 assert.deepEqual(terms(m['2a'].synonyms),['cheerful','upbeat'],'2b moved up with its synonyms');
 assert.deepEqual(terms(m['2b'].synonyms),['clever','brilliant']);
 const withoutFirst=definedMeanings(senses.slice(1));
 assert.deepEqual(withoutFirst.map(x=>[x.label,terms(x.antonyms)]),[['1a',['unintelligent','dull']],['1b',['gloomy','pessimistic']]]);
 const without2a=senses.map(s=>s.id==='b2'?{...s,subsenses:s.subsenses.filter(x=>x.id!=='b2a')}:s);
 assert.deepEqual(terms(definedMeanings(without2a)[1].synonyms),['cheerful','upbeat'],'2b becomes 2a and keeps its own words');
});

test('games and flashcards keep working with relationships present',()=>{
 const library=[bright(),normalize({id:'o1',term:'placid',senses:[{id:'s',definition:'Calm and peaceful.',examples:['A placid lake.']}]}),normalize({id:'o2',term:'terse',senses:[{id:'s',definition:'Brief.',examples:['A terse reply.']}]})];
 assert.deepEqual(entries(library).find(e=>e.term==='bright').senses.map(s=>s.label),['1','2a','2b']);
 assert.ok(playableQuestions(library).length>=3);
 const rows=definitionRows(bright().senses);
 assert.deepEqual(rows.filter(r=>r.synonyms.length).map(r=>r.label),['1','2a','2b']);
});

test('share files carry each definition’s relationships and unassigned ones round-trip',()=>{
 const withLegacy={...bright(),synonyms:t('vivid')};
 const file=buildShareFile([withLegacy],'Teddy');
 const json=JSON.stringify(file);
 const parsed=parseImport(json,[]);
 const [word]=toLibraryWords([parsed.items[0].word]);
 const m=byLabel(word);
 assert.deepEqual(terms(m['1'].antonyms),['dim','dark']);
 assert.deepEqual(terms(m['2a'].relatedForms),['brightly']);
 assert.deepEqual(m['2b'].relatedForms,[]);
 assert.deepEqual(terms(word.synonyms),['vivid'],'still unassigned: bright has several meanings');
 assert.ok(!json.includes('"relatedForms":[]'),'empty lists are left out of share files');
});
