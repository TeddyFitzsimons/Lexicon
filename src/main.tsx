import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type VocabularyWord = {
  term: string;
  definition: string;
  partOfSpeech: string;
  example: string;
};
type StoredWord = VocabularyWord & { id: string };
const empty: VocabularyWord = { term: '', definition: '', partOfSpeech: 'Noun', example: '' };
const oldKey = 'vocabulary-words-v1';
function App() {
  const [words, setWords] = useState<StoredWord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/words').then(async r => {
      if (!r.ok) throw new Error('Unable to load vocabulary');
      const data: unknown = await r.json();
      if (!Array.isArray(data)) throw new Error('Invalid vocabulary file');
      // One-time migration from the previous browser-storage version.
      const old = localStorage.getItem(oldKey);
      if (data.length === 0 && old) {
        try {
          const previous = JSON.parse(old);
          if (Array.isArray(previous) && previous.length) {
            const result = await fetch('/api/words', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(previous)});
            if (!result.ok) throw new Error('Could not migrate old words');
            setWords(previous);
            setLoaded(true);
            return;
          }
        } catch (e) { throw e; }
      }
      setWords(data as StoredWord[]);
      setLoaded(true);
    }).catch(e => setError(String(e)));
  }, []);
  async function persist(next: StoredWord[]) {
    setError('');
    try {
      const response = await fetch('/api/words', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
      if (!response.ok) throw new Error(await response.text());
      setWords(next);
    } catch (e) { setError('Save failed: ' + String(e)); }
  }
  const [draft, setDraft] = useState<VocabularyWord>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [tab, setTab] = useState<'library' | 'study'>('library');
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const studyWords = order.map(id => words.find(w => w.id === id)).filter((w): w is StoredWord => !!w);
  const current = studyWords[index % Math.max(studyWords.length, 1)];
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = Object.fromEntries(Object.entries(draft).map(([k,v]) => [k, v.trim()])) as VocabularyWord;
    if (Object.values(clean).some(v => !v)) return;
    if (editing) await persist(words.map(w => w.id === editing ? { ...clean, id: editing } : w));
    else await persist([...words, { ...clean, id: crypto.randomUUID() }]);
    setDraft(empty); setEditing(null);
  }
  function startStudy(shuffle = false) {
    const ids = words.map(w => w.id);
    if (shuffle) for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    setOrder(ids); setIndex(0); setRevealed(false); setTab('study');
  }
  function next() { setIndex(i => (i + 1) % studyWords.length); setRevealed(false); }
  return <main>
    <header><div><h1>Vocabulary</h1><p>Your personal word library</p></div><span className="count">{words.length} words</span></header>
    {error && <p role="alert" style={{color:'crimson'}}>{error}</p>}
    {!loaded && !error && <p>Loading saved words...</p>}
    {loaded && <nav><button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>Word library</button><button className={tab === 'study' ? 'active' : ''} onClick={() => startStudy()}>Study flashcards</button></nav>}
    {loaded && (tab === 'library' ? <><section className="panel"><h2>{editing ? 'Edit word' : 'Add a new word'}</h2><form onSubmit={save}>
      <div className="fields"><label>Term<input required value={draft.term} onChange={e => setDraft({...draft,term:e.target.value})} placeholder="e.g. Ephemeral" /></label>
      <label>Part of speech<select value={draft.partOfSpeech} onChange={e => setDraft({...draft,partOfSpeech:e.target.value})}>{['Noun','Verb','Adjective','Adverb','Pronoun','Preposition','Conjunction','Interjection','Determiner','Other'].map(p => <option key={p}>{p}</option>)}</select></label></div>
      <label>Definition<textarea required rows={2} value={draft.definition} onChange={e => setDraft({...draft,definition:e.target.value})} placeholder="What does it mean?" /></label>
      <label>Example sentence<textarea required rows={2} value={draft.example} onChange={e => setDraft({...draft,example:e.target.value})} placeholder="Use the term in a sentence" /></label>
      <div className="actions"><button className="primary" type="submit">{editing ? 'Save changes' : 'Add word'}</button>{editing && <button type="button" onClick={() => {setEditing(null);setDraft(empty);}}>Cancel</button>}</div>
    </form></section>
    <section className="panel"><div className="sectionhead"><h2>My words</h2><button disabled={!words.length} onClick={() => startStudy(true)}>Shuffle & study</button></div><input aria-label="Search words" placeholder="Search words or definitions..." value={query} onChange={e => setQuery(e.target.value)}/>
      <div className="wordlist">{words.filter(w => `${w.term} ${w.definition} ${w.partOfSpeech} ${w.example}`.toLowerCase().includes(query.toLowerCase())).map(w => <article key={w.id} className="word"><div className="wordtop"><h3>{w.term}</h3><span className="tag">{w.partOfSpeech}</span></div><p>{w.definition}</p><blockquote>{w.example}</blockquote><div className="actions"><button onClick={() => {setEditing(w.id);setDraft({term:w.term,definition:w.definition,partOfSpeech:w.partOfSpeech,example:w.example});window.scrollTo({top:0,behavior:'smooth'});}}>Edit</button><button className="danger" onClick={() => {if(window.confirm(`Delete ${w.term}?`)) {void persist(words.filter(x => x.id !== w.id));if(editing === w.id){setEditing(null);setDraft(empty);}}}}>Delete</button></div></article>)}{!words.length && <p className="muted">No words yet. Add your first word above.</p>}</div>
    </section></> : <section className="panel study"><div className="sectionhead"><h2>Flashcards</h2><button disabled={!words.length} onClick={() => startStudy(true)}>Shuffle</button></div>{current ? <><p className="muted">Card {index+1} of {studyWords.length}</p><button className="flashcard" onClick={() => setRevealed(!revealed)}>{!revealed ? <><strong>{current.term}</strong><small>{current.partOfSpeech}</small><span>Click to reveal</span></> : <><strong>{current.term}</strong><small>{current.partOfSpeech}</small><p>{current.definition}</p><em>{current.example}</em><span>Click to hide</span></>}</button><div className="actions center"><button onClick={() => {setIndex(i => (i - 1 + studyWords.length) % studyWords.length);setRevealed(false);}}>Previous</button><button className="primary" onClick={next}>Next word</button></div></> : <p className="muted">Add a word to start studying.</p>}</section>)}
    <footer>Saved on this computer in data/vocabulary.json (excluded from Git).</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
