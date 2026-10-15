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
