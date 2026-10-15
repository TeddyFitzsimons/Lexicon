# Lexicon

Local-first personal dictionary and flashcard app.

## Start

Run `npm install`, then `npm run dev`, and open http://127.0.0.1:5173.

## Library

The home screen is a searchable, sortable word table. Use **Add word** to open the editor. Each word can have multiple numbered definitions, each with its own optional example sentences. Favorites and related-word links are supported. Use the Study tab to choose a flashcard set.

## Local data and upgrading

Words are saved to `data/vocabulary.json` on your computer, excluded from Git by `.gitignore`. **Preserve the existing `data/vocabulary.json` when upgrading.** The app reads the previous single-definition format and maps it into the new `senses` array when loading. The original `definition` and `example` fields remain for compatibility.

## Code structure

- `src/lib/words.ts`: word and sense data model, normalization and migration
- `src/lib/storage.ts`: local storage API
- `src/components/WordEditor.tsx`: create/edit words and meanings
- `src/components/WordLibrary.tsx`: searchable home table
- `src/components/StudyView.tsx`: study selection and flashcards
- `src/components/SearchPicker.tsx`: custom select/search controls
- `src/main.tsx`: application orchestration and dialogs
- `vite.config.ts`: local JSON file API

The interface includes your supplied Lexicon logo. Build verification was not completed in this environment because npm dependency installation timed out.

## Mascot

The green cardinal mascot is stored in `public/lexicon-cardinal.png`. It appears in the empty library and study setup. The existing book logo remains the main brand icon.

## Layout

The Library is the home screen and uses the entire content width.
Adding or editing a word opens a separate modal editor, so the editor never
occupies permanent space in the library. Study is a separate tab.
