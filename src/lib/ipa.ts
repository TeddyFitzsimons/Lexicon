/** Conservative General American IPA -> readable respelling.
 * This is NOT a phonetic engine: mappings are approximations, and uncertain
 * inputs are rejected so users can correct them rather than trust bad output.
 */
export type Conversion = {ok:true; readable:string} | {ok:false; reason:string};
const phonemes:Record<string,string>={
  'tʃ':'ch','dʒ':'j','eɪ':'ay','oʊ':'oh','aɪ':'eye','aʊ':'ow','ɔɪ':'oy',
  'ɝ':'er','ɚ':'er','ɜː':'er','ɜ':'er','ər':'er',
  'iː':'ee','uː':'oo','ɑː':'ah','ɔː':'aw',
  'ɪ':'ih','i':'ee','ɛ':'e','e':'eh','æ':'a','ɑ':'ah','ɒ':'ah','ɔ':'aw',
  'ʊ':'uu','u':'oo','ʌ':'uh','ə':'uh','ɐ':'uh','ɹ':'r','r':'r',
  'θ':'th','ð':'th','ʃ':'sh','ʒ':'zh','ŋ':'ng','j':'y','w':'w','h':'h',
  'p':'p','b':'b','t':'t','d':'d','k':'k','ɡ':'g','g':'g','f':'f','v':'v',
  's':'s','z':'z','m':'m','n':'n','l':'l','ɾ':'d','ʔ':'',
};
const tokens=Object.keys(phonemes).sort((a,b)=>b.length-a.length);
/** Distinguish full vowels from consonants for syllabic sanity checks. */
const vowel=/[aeiouɪɛæɑɒɔʊʌəɐɜɝɚ]/u;
export function ipaToReadable(input:string):Conversion {
  const trimmed=input.trim();
  if(!trimmed)return {ok:false,reason:'Enter an IPA transcription first.'};
  if((trimmed.startsWith('/')&&!trimmed.endsWith('/'))||(!trimmed.startsWith('/')&&trimmed.endsWith('/')))
    return {ok:false,reason:'IPA slashes must appear as a matching pair.'};
  const source=trimmed.replace(/^\//,'').replace(/\/$/,'').normalize('NFC').replace(/\u0361/g,'');
  if(!source)return {ok:false,reason:'The IPA transcription is empty.'};
  if(/[\s,;|()[\]{}]/u.test(source))return {ok:false,reason:'Use one word with IPA syllables separated by dots.'};
  if(/[ːˑ]/u.test(source.replace(/(?:iː|uː|ɑː|ɔː|ɜː)/gu,'')))
    return {ok:false,reason:'Unsupported vowel-length notation. Please enter the readable pronunciation manually.'};
  const segments=source.split('.');
  if(segments.some(x=>!x))return {ok:false,reason:'An IPA syllable cannot be empty.'};
  let primaryCount=0;
  const readable:string[]=[];
  for(const segment of segments){
    let text=segment;
    const primary=text.startsWith('ˈ');
    const secondary=text.startsWith('ˌ');
    if(primary||secondary){text=text.slice(1);if(primary)primaryCount++;}
    if(/[ˈˌ]/u.test(text))return {ok:false,reason:'Stress marks must be at the start of a syllable. Add syllable dots if needed.'};
    if(!vowel.test(text))return {ok:false,reason:'Each syllable must contain a recognized vowel.'};
    let out='';
    for(let i=0;i<text.length;){
      const token=tokens.find(t=>text.startsWith(t,i));
      if(!token)return {ok:false,reason:`Unsupported IPA symbol “${Array.from(text.slice(i))[0]}”. Edit the IPA or enter the readable version manually.`};
      out+=phonemes[token];i+=token.length;
    }
    // Conventional American respelling is not mechanically unique. This
    // conservative mapping deliberately uses a stable approximation.
    readable.push(primary?out.toUpperCase():out);
  }
  if(primaryCount>1)return {ok:false,reason:'Only one primary-stressed syllable is supported.'};
  if(segments.length>1&&primaryCount===0)return {ok:false,reason:'Add a primary stress mark (ˈ) before the stressed syllable.'};
  if(segments.length===1&&primaryCount===0)readable[0]=readable[0].toUpperCase();
  return {ok:true,readable:readable.join('-')};
}

/** Keep manual corrections until the user explicitly asks to regenerate. */
export function updateFromIpa(previous:{ipa:string;readablePronunciation:string;readableManuallyEdited:boolean},ipa:string){
  const result=ipaToReadable(ipa);
  return {ipa,readablePronunciation:previous.readableManuallyEdited?previous.readablePronunciation:(result.ok?result.readable:''),readableManuallyEdited:previous.readableManuallyEdited};
}
export function manualReadable(previous:{ipa:string;readablePronunciation:string;readableManuallyEdited:boolean},readablePronunciation:string){
  return {...previous,readablePronunciation,readableManuallyEdited:true};
}
export function regenerateReadable(ipa:string){return ipaToReadable(ipa)}
