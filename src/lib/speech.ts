/** Audio is independent from IPA: the speech engine receives the actual term. */
export type SpeechResult={ok:true}|{ok:false;reason:string};
export function canSpeak():boolean {
  return typeof window!=='undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}
let current:SpeechSynthesisUtterance|null=null;
export function speakWord(term:string,rate=0.88):SpeechResult {
  if(!canSpeak())return {ok:false,reason:'Speech playback isn’t available on this device.'};
  if(!term.trim())return {ok:false,reason:'Enter a word before playing its pronunciation.'};
  try {
    const synth=window.speechSynthesis;
    synth.cancel();
    const utterance=new SpeechSynthesisUtterance(term.trim());
    utterance.lang='en-US';utterance.rate=rate;utterance.pitch=1;
    const voices=synth.getVoices();
    // Prefer an installed US English voice; avoid assuming all browsers
    // expose the same voice names or load voices synchronously.
    const american=voices.filter(v=>v.lang.toLowerCase().replace('_','-')==='en-us');
    const preferred=american.find(v=>v.localService && /samantha|ava|allison|jenny|aria|natural|enhanced|premium/i.test(v.name))
      ||american.find(v=>v.localService)||american.find(v=>/natural|enhanced/i.test(v.name))||american[0];
    if(preferred)utterance.voice=preferred;
    utterance.onend=()=>{if(current===utterance)current=null};
    utterance.onerror=()=>{if(current===utterance)current=null};
    current=utterance;
    synth.speak(utterance);
    return {ok:true};
  }catch {return {ok:false,reason:'Unable to start speech playback. Check the voices installed on this computer.'};}
}
