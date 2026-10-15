# Lexicon — pronunciation update

The application is React + TypeScript, with local JSON storage at `data/vocabulary.json`.

## Install

```bash
npm install
npm test
npm run build
npm run dev
```

Open http://127.0.0.1:5173.

**Preserve your existing `data/vocabulary.json` when upgrading.** This archive excludes the data folder to prevent accidental overwrites. The `data/` folder is ignored by Git.

## Pronunciation

- IPA is an optional phonetic reference (`pronunciation`, retained for compatibility).
- Readable American pronunciation is stored in `readablePronunciation`.
- Manual corrections are preserved using `readableManuallyEdited`. Use **Regenerate readable** to explicitly replace a correction.
- The converter is deliberately conservative: it rejects unsupported symbols, malformed stress and ambiguous syllable notation. It is an approximation, not a pronunciation dictionary. Review its output before saving.
- Audio uses the browser's Web Speech API to speak the **term**, never the IPA. It prefers available `en-US` voices, especially local voices. No speech API keys, generated audio files or additional speech libraries are required.
- Voice quality depends on the browser and installed voices. SSML phoneme support is not assumed, and IPA does not control audio.
- Previously saved vocabulary remains readable; a legacy IPA transcription is converted for display only when the conversion is supported. Saved manual pronunciation remains authoritative.

## Architecture

- `src/lib/ipa.ts`: pure deterministic IPA conversion and manual override helpers.
- `src/lib/speech.ts`: Web Speech API adapter and voice selection.
- `src/components/PronunciationFields.tsx`: shared editor UI.
- `src/components/ManageWords.tsx`: full-page editing with save/cancel.
- `src/components/WordLibrary.tsx`: collection, readable pronunciation and audio.
- `src/lib/words.ts`: backward-compatible vocabulary model and migration.
- `vite.config.ts`: local file API with atomic writes.
- `tests/ipa.test.mjs`: deterministic conversion and override tests.

Tests use Node.js 22's built-in test runner and TypeScript type stripping. There is no test-framework dependency.

## October 2026 vocabulary editor update

- The library displays every definition and every example sentence, not a truncated preview.
- Clicking a term opens the dedicated editing workspace. Delete is the only row action and requires confirmation.
- Add as many new words as needed in Manage Words; they remain staged until **Save changes**. Cancel discards staged edits.
- Synonyms, antonyms, and related forms are now free-text entries with optional explicit Merriam-Webster dictionary links. Links are never automatically guessed.
- Existing relationships that referenced Lexicon card IDs are migrated to the corresponding saved term on load. **Back up `data/vocabulary.json` before upgrading**; saving writes the new format.
- New word entries are appended in chronological order. Your local data is never included in the ZIP or Git commits.

## Verify

```bash
npm install
npm test
npm run build
npm run dev
```

## Sentence game

Open the Sentence game tab. Multiple choice is the default; switch to Type the word for written answers. Questions use your saved example sentences that contain the exact saved term (case-insensitive whole-word matching). Examples without a match are skipped. Inflected forms are not automatically guessed. Multiple choice needs at least two unique library terms; a single playable word can still be used in typing mode.

Each round includes up to 10 unique words. Choose or type an answer, then Check answer. Feedback reveals the saved word and its definition before moving on. The results screen shows your score and lets you practice missed words. Your original vocabulary is not modified by playing.

The waving mascot is included at public/lexicon-waving.png. Build and 16 automated tests verified; live browser visual verification unavailable.

## Professional interface refresh

This version adds a cohesive cream, sage and lilac interface across the library, editor, flashcards and sentence game. Desktop navigation uses a fixed sidebar; mobile navigation uses compact icon tabs. A welcome area features the supplied waving mascot and links to games and flashcards. Collection counts reflect actual saved words and favorites.

The word library retains paired definitions and examples, thin meaning dividers, alternating rows, searchable word-type filtering, category grouping and all three sort orders. The editor preserves batch saves and provides visible save feedback. Flashcards display all meanings and examples.

Shared appearance: src/polished.css. Navigation icons: src/components/NavIcon.tsx. Welcome area: src/components/Welcome.tsx.

Validation: production build and automated tests. Browser visual verification unavailable in this environment.

## Games

The **Games** tab (formerly *Sentence game*) lists every game. Choose one to play; **All games** returns to the list. Each round has up to 10 words and ends with a score, and a wrong answer always shows the right one.

- **The missing word**: the original sentence game, unchanged.
- **Pick the meaning**: shows one of your words and five definitions; only one belongs to it. The other four come from your other words, preferring the same part of speech. Any word in a definition that would give the answer away (the quizzed word, the option's own word, and simple forms like *calmly* for terms of four or more letters) is hidden until you check. After checking, every option shows which word it belongs to, plus the correct definition and an example sentence when you have one. Press A–E (or 1–5) to pick by keyboard. Needs at least two different words with definitions; fewer than six words means fewer than five options.

Architecture: `src/lib/gameText.ts` (shared masking, matching and shuffling), `src/lib/definitionGame.ts` (question building), `src/components/Games.tsx` (game list), `src/components/DefinitionGame.tsx`, `src/meaningGame.css`. Tests: `tests/definitionGame.test.mjs`.

The header now reads *Lexicon* without the trailing period.

## October 2026 interface upgrade

### Tests
The **Tests** tab builds a graded test from your words. Choose the question type (multiple choice, written, true or false, or mixed), what you answer with (terms, definitions, or both), which words (all or favorites) and how many questions. Answers are marked only when you submit; results show an A+ to F grade, every question with the right answer, and a retest of what you missed. Written definitions can't be machine-graded, so you mark those yourself and the grade updates as you do.

### Home banner
The banner at the top of the library features one of four activities, chosen at random on each visit and never the same twice in a row: The missing word, Pick the meaning, a test, or flashcards. It shows a real sentence or word from your library. The last pick is kept in `localStorage` (key `lexicon:last-featured`).

### Editor
Manage words is rebuilt: one card per word, meanings and examples on the left, pronunciation and related words on the right. Synonyms, antonyms and related forms are tags (type, then Enter); the link button on a tag holds an optional Merriam-Webster URL. All edits are still staged until **Save changes**.

### Controls and copy
Every dropdown is Lexicon's own (`src/components/Select.tsx`, keyboard accessible) instead of the browser's. Filler copy is gone; quotations from `src/lib/quotes.ts` appear in the sidebar and on the home screen instead. The sidebar quote is picked once per page load and only changes when you refresh; the home-screen quote changes on each library visit and never shares an author with the sidebar.

### Files
`src/lib/test.ts`, `src/lib/quotes.ts`, `src/lib/featured.ts`, `src/components/TestView.tsx`, `Select.tsx`, `Quote.tsx`, plus `components.css`, `editor.css`, `home.css`, `tests.css`. Unused CSS and the old `WordEditor.tsx` and `SearchPicker.tsx` were removed. Tests: `tests/test.test.mjs` (25 tests total).

## Spell It, Profile and sharing

### Spell It (Games)
Hear a word through the browser's speech engine, then type its spelling. Each wrong attempt unlocks a clue: the first letter and length, then the meaning, then every other letter plus an example sentence with the word blanked. The fourth miss (or **Show the answer**) reveals it. The round ends with how many you spelled and how many on the first try. Without speech support, the meaning is shown from the start.

### Profile
A new **Profile** tab with your name (used only there and in files you share), current and longest streak, active days, days you added words, a one-year activity calendar (switch between active days and words added), and milestones.

A day counts as **active** when you finish a game, submit a test, start flashcards, or save, add or import words. Opening the app alone doesn't count. The current streak survives until the end of today, so it isn't lost before you've had a chance to practice.

Activity and your name are stored in `data/profile.json` (served at `/api/profile`), next to `data/vocabulary.json`. New words also record the date they were added (`addedAt`).

### Sharing and importing
**Download share file** saves your words (all or favorites) as `lexicon-<name>-<date>.json`. Favorites, ids and activity are not included. Where the browser supports it, **Share…** opens the system share sheet.

**Add words from a file** accepts a dropped or chosen `.json` file: a Lexicon share file, `{ "words": [...] }`, or a plain list like `data/vocabulary.json`. Each word needs a `term` and a `definition` (or `senses`). You get a preview to accept all new words or pick some; words you already have are skipped. Imported files are treated as untrusted: 2 MB and 5,000 words maximum, every field type-checked and length-limited, unknown fields dropped, and only Merriam-Webster dictionary links kept.

Files: `src/lib/spellGame.ts`, `src/lib/activity.ts`, `src/lib/dates.ts`, `src/lib/share.ts`, `src/components/SpellGame.tsx`, `src/components/Profile.tsx`, `src/spellGame.css`, `src/profile.css`. Tests: `tests/profile.test.mjs` (30 tests total).

## Words-added feed, mascots and custom controls

### Words added (Profile)
A feed of every time you added words: how many at once, which words (up to 50 per entry, the first 8 shown with "+N more"), and whether you added them or accepted them from someone's file. Above it: how many times you've added words, the average per time, and the most at once. Entries are logged in `data/profile.json` under `events` (the latest 300). Words saved before this existed are grouped by the day they were added.

### Mascots
Each mascot has its own place: waving (home, The missing word), professor (Pick the meaning), studying (Profile, Spell It), test-taker (Tests), flashcards (Flashcards), and the standing cardinal (Games, empty library). `lexicon-waving.png` was resized from 1280 px to 640 px (850 KB to 225 KB).

### No browser-drawn popups
Hover hints use Lexicon's tooltip (`data-tip`) instead of the browser's `title` popup; the activity calendar has its own hover card. Show/hide sections use `Disclosure` instead of `<details>`, and flashcard selection uses `Checkbox` instead of native checkboxes (both in `src/components/Select.tsx`). The only system UI left is the file picker behind **Choose a file**, which browsers don't allow apps to replace; dragging a file onto the drop zone avoids it.

## Visual design

Lexicon is styled as a personal dictionary. The tokens and component styling live in `src/theme.css`, loaded last:

- **Frame:** a dark forest sidebar (`--sidebar`), which also colours the editor's save bar and the phone browser bar.
- **Type:** Fraunces for words, headings and numbers; DM Sans for interface text. Parts of speech and example sentences use Fraunces italic.
- **Signature mark:** a marigold highlighter swipe (`--highlight`, class `.hl`) for "this is the one": the current page in the sidebar, the featured word on the home screen, the blank in a sentence, and the Save button.
- **Controls:** solid buttons with a firm bottom edge; cards share one border colour and no drop shadows.

Brand colours are CSS variables (`--ink`, `--brand`, `--brand-deep`, `--focus`, and so on) across all stylesheets, so the palette can change in one place.

## Trophies

Milestones are eight goals: words saved (1, 10, 50, 100), activity streaks (3, 7, 30 days) and finishing a test. Each one you reach becomes a trophy on your Profile, on a shelf under your name, as a bronze, silver or gold cup engraved with its number (`Trophy` in `src/components/Profile.tsx`). Sharing and importing still count as activity but aren't milestones.

Your name displays as text, so it never clips and wraps when long; it turns into a text box only while you edit it.
