import {useState} from 'react';
import {ipaToReadable,manualReadable,regenerateReadable,updateFromIpa} from '../lib/ipa';
import {canSpeak,speakWord} from '../lib/speech';

type PronunciationData={ipa:string;readablePronunciation:string;readableManuallyEdited:boolean};
type Props={term:string;value:PronunciationData;onChange:(next:PronunciationData)=>void};
/** Shared by the word editor and the full-page word manager. */
export function PronunciationFields({term,value,onChange}:Props){
  const [audioError,setAudioError]=useState('');
  const conversion=ipaToReadable(value.ipa);
  const warning=value.ipa.trim()&&!conversion.ok?conversion.reason:'';
  function play(){const result=speakWord(term);setAudioError(result.ok?'':result.reason)}
  return <div className="pronunciation-fields">
    <div className="pronunciation-heading"><strong>Pronunciation</strong><button type="button" className="pronunciation-play" onClick={play} disabled={!canSpeak()||!term.trim()} aria-label={`Hear ${term||'word'} pronounced in American English`} title="Hear the word in American English"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Zm12-1a6 6 0 0 1 0 8m2-11a10 10 0 0 1 0 14"/></svg> Play word</button></div>
    <div className="pronunciation-grid">
      <label>IPA <span className="optional">Optional</span><input value={value.ipa} placeholder="/ˈlɛk.sɪ.kən/" spellCheck={false} onChange={e=>onChange(updateFromIpa(value,e.target.value))}/></label>
      <label>American pronunciation <span className="optional">Editable</span><input value={value.readablePronunciation} placeholder="LEK-sih-kuhn" spellCheck={false} onChange={e=>onChange(manualReadable(value,e.target.value))}/></label>
    </div>
    <div className="pronunciation-foot"><span>Audio speaks the word, not its IPA transcription.</span><button type="button" className="text-button" disabled={!conversion.ok} onClick={()=>{const result=regenerateReadable(value.ipa);if(result.ok)onChange({...value,readablePronunciation:result.readable,readableManuallyEdited:false})}}>Regenerate readable</button></div>
    {value.readableManuallyEdited&&<small className="pronunciation-note">Custom pronunciation preserved. Regenerate to replace it.</small>}
    {warning&&<small className="pronunciation-warning" role="status">{warning} You can enter a readable pronunciation manually.</small>}
    {!canSpeak()&&<small className="pronunciation-warning" role="status">Audio playback is not supported in this browser.</small>}
    {audioError&&<small className="pronunciation-warning" role="status">{audioError}</small>}
  </div>;
}
