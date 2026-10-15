import test from 'node:test';
import assert from 'node:assert/strict';
import {arrangeWords} from '../src/lib/collection.ts';
const words=[{id:'1',term:'zebra',partOfSpeech:'Noun'},{id:'2',term:'amble',partOfSpeech:'Verb'},{id:'3',term:'bright',partOfSpeech:'Adjective'},{id:'4',term:'apple',partOfSpeech:'Noun'}];
const ids=list=>list.map(w=>w.id);
test('sorts by insertion order, reverse insertion and alphabetical order without mutation',()=>{
 assert.deepEqual(ids(arrangeWords(words,'oldest',false)),['1','2','3','4']);
 assert.deepEqual(ids(arrangeWords(words,'newest',false)),['4','3','2','1']);
 assert.deepEqual(ids(arrangeWords(words,'alphabetical',false)),['2','4','3','1']);
 assert.deepEqual(ids(words),['1','2','3','4']);
});
test('groups nouns, adjectives, verbs and applies chosen order within each category',()=>{
 assert.deepEqual(ids(arrangeWords(words,'oldest',true)),['1','4','3','2']);
 assert.deepEqual(ids(arrangeWords(words,'newest',true)),['4','1','3','2']);
 assert.deepEqual(ids(arrangeWords(words,'alphabetical',true)),['4','1','3','2']);
});
test('handles empty results and normalizes category case',()=>{
 assert.deepEqual(arrangeWords([],'oldest',true),[]);
 assert.deepEqual(ids(arrangeWords([{id:'v',term:'act',partOfSpeech:'Verb'},{id:'n',term:'thing',partOfSpeech:'noun'}],'oldest',true)),['n','v']);
});
