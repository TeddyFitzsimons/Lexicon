import {useState} from 'react';
import {ipaToReadable,manualReadable,regenerateReadable,updateFromIpa} from '../lib/ipa';
import {canSpeak,speakWord} from '../lib/speech';

type PronunciationData={ipa:string;readablePronunciation:string;readableManuallyEdited:boolean};
type Props={term:string;value:PronunciationData;onChange:(next:PronunciationData)=>void};

/** Readable pronunciation first, IPA as an optional source it can be generated from. */
export function PronunciationFields({term,value,onChange}:Props){
 const [audioError,setAudioError]=useState('');
 const conversion=ipaToReadable(value.ipa);
 const warning=value.ipa.trim()&&!conversion.ok?conversion.reason:'';
 function play(){const result=speakWord(term);setAudioError(result.ok?'':result.reason)}
 return <section className="ed-pron">
  <div className="ed-pron-head"><h4>Pronunciation</h4>{canSpeak()&&<button type="button" className="ed-mini-button" onClick={play} disabled={!term.trim()} data-tip="Speaks the word in American English">
   <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Zm12-1a6 6 0 0 1 0 8"/></svg>Listen</button>}</div>
  <label className="ed-field"><span>Sounds like</span><input value={value.readablePronunciation} placeholder="e.g. LEK-sih-kuhn" spellCheck={false} onChange={e=>onChange(manualReadable(value,e.target.value))}/></label>
  <label className="ed-field"><span>IPA <em>optional</em></span><input className="ed-ipa" value={value.ipa} placeholder="e.g. /ˈlɛk.sɪ.kən/" spellCheck={false} onChange={e=>onChange(updateFromIpa(value,e.target.value))}/></label>
  {value.readableManuallyEdited&&conversion.ok&&<p className="ed-note">Your own spelling is kept. <button type="button" className="ed-text-button" onClick={()=>{const r=regenerateReadable(value.ipa);if(r.ok)onChange({...value,readablePronunciation:r.readable,readableManuallyEdited:false})}}>Use the IPA version instead</button></p>}
  {warning&&<p className="ed-note is-warning" role="status">{warning} You can still type how it sounds.</p>}
  {audioError&&<p className="ed-note is-warning" role="status">{audioError}</p>}
 </section>;
}
