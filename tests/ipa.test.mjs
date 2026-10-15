import test from 'node:test';
import assert from 'node:assert/strict';
import {ipaToReadable,updateFromIpa,manualReadable,regenerateReadable} from '../src/lib/ipa.ts';

test('lexicon example, primary stress, and syllable boundaries',()=>{
  assert.deepEqual(ipaToReadable('/ˈlɛk.sɪ.kən/'),{ok:true,readable:'LEK-sih-kuhn'});
});
test('single syllable is stressed by default',()=>{
  assert.deepEqual(ipaToReadable('/kæt/'),{ok:true,readable:'KAT'});
});
test('secondary stress is not capitalized',()=>{
  assert.deepEqual(ipaToReadable('/ˌɛk.ˈsæm.pəl/'),{ok:true,readable:'ek-SAM-puhl'});
});
test('reject unsupported IPA instead of silently guessing',()=>{
  const result=ipaToReadable('/ˈlɛk.ɬɪ.kən/');
  assert.equal(result.ok,false);
  assert.match(result.reason,/Unsupported IPA/);
});
test('reject multiple primary stresses',()=>{
  assert.equal(ipaToReadable('/ˈkæt.ˈdɔɡ/').ok,false);
});
test('reject missing stress in multisyllabic transcription',()=>{
  assert.equal(ipaToReadable('/lɛk.sɪ.kən/').ok,false);
});
test('manual correction survives IPA edits',()=>{
  const previous=manualReadable({ipa:'/ˈlɛk.sɪ.kən/',readablePronunciation:'LEK-sih-kuhn',readableManuallyEdited:false},'LECK-si-ken');
  const updated=updateFromIpa(previous,'/ˈlɛk.sɪ.kən/');
  assert.equal(updated.readablePronunciation,'LECK-si-ken');
  assert.equal(updated.readableManuallyEdited,true);
  assert.deepEqual(regenerateReadable('/ˈlɛk.sɪ.kən/'),{ok:true,readable:'LEK-sih-kuhn'});
});
test('automatic pronunciation refreshes when not manually edited',()=>{
  const previous={ipa:'',readablePronunciation:'',readableManuallyEdited:false};
  assert.equal(updateFromIpa(previous,'/ˈlɛk.sɪ.kən/').readablePronunciation,'LEK-sih-kuhn');
});
