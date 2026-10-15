import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBackup,parseRestore,backupFileName} from '../src/lib/backup.ts';
import {normalize} from '../src/lib/words.ts';

const word=normalize({id:'w1',term:'placid',definition:'Calm.',partOfSpeech:'Adjective',example:'',favorite:true,addedAt:'2026-09-01'});
const profile={name:'Teddy',days:{'2026-10-14':{practiced:2},'2026-10-15':{tested:1}},events:[]};
const file=(name,value)=>({name,text:JSON.stringify(value)});

test('a backup round-trips ids, favorites, dates and streak history exactly',()=>{
 const result=parseRestore([file('b.json',buildBackup([word],profile,new Date('2026-10-15T12:00:00Z')))]);
 assert.equal(result.ok,true);
 assert.deepEqual(result.words,[word]);
 assert.deepEqual(result.profile,profile);
 assert.equal(result.exportedAt,'2026-10-15T12:00:00.000Z');
});
test('accepts the web version data folder: vocabulary.json and profile.json together or alone',()=>{
 const both=parseRestore([file('vocabulary.json',[word]),file('profile.json',profile)]);
 assert.equal(both.ok,true);assert.equal(both.words.length,1);assert.equal(both.profile.name,'Teddy');
 const wordsOnly=parseRestore([file('vocabulary.json',[word])]);
 assert.equal(wordsOnly.ok,true);assert.equal(wordsOnly.profile,undefined);
 const profileOnly=parseRestore([file('profile.json',profile)]);
 assert.equal(profileOnly.ok,true);assert.equal(profileOnly.words,undefined);
});
test('an empty library is a valid restore',()=>{
 const result=parseRestore([file('vocabulary.json',[])]);
 assert.equal(result.ok,true);assert.deepEqual(result.words,[]);
});
test('rejects share files, newer backups, duplicates, word lists without ids and invalid JSON',()=>{
 assert.match(parseRestore([file('s.json',{format:'lexicon-share',version:1,words:[]})]).error,/share file/);
 assert.match(parseRestore([file('b.json',{format:'lexicon-backup',version:99,words:[],profile})]).error,/newer version/);
 assert.match(parseRestore([file('a.json',[word]),file('b.json',[word])]).error,/More than one/);
 assert.match(parseRestore([file('list.json',[{term:'placid',definition:'Calm.'}])]).error,/doesn’t look like a saved Lexicon library/);
 assert.match(parseRestore([{name:'x.json',text:'{nope'}]).error,/valid JSON/);
 assert.match(parseRestore([file('x.json',{hello:1})]).error,/isn’t a Lexicon backup/);
 assert.equal(parseRestore([]).ok,false);
});
test('backup file names carry the local date',()=>{
 assert.equal(backupFileName(new Date(2026,9,15,23,30)),'lexicon-backup-2026-10-15.json');
});
