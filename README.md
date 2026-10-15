# Lexicon

A personal, local-first vocabulary collection and flashcard app.

## Run

1. Install Node.js 20+.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open http://127.0.0.1:5173.

## Features

- Add, edit, and delete vocabulary cards.
- Required term and definition; optional part of speech, pronunciation, example sentences, synonyms, antonyms, and related forms.
- Linked words are complete editable cards.
- Search your library, mark favorites, and select all/favorites/custom sets for flashcard review.
- Browser speech synthesis for pronunciation.
- Custom menus and delete confirmation.

## Local data

Your vocabulary is stored in `data/vocabulary.json` and **excluded from Git**.
When upgrading, copy the application files into your existing folder but keep your existing `data/vocabulary.json`.
The local API runs in the Vite development server. Keep `npm run dev` running while using Lexicon.
Back up `data/vocabulary.json` periodically.

## Architecture

- `src/components`: editor, library, study view, and custom pickers.
- `src/lib/words.ts`: types, migration, normalization, and relationship helpers.
- `src/lib/storage.ts`: local API access.
- `vite.config.ts`: development-only file API and atomic JSON writes.
- `src/style.css`: shared design system and responsive component styles.

The logo is user-provided artwork, copied to `public/lexicon-mark.png`.
