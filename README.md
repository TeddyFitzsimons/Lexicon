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
