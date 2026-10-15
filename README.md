# Lexicon

Personal vocabulary collection, with a full-screen library and dedicated **Manage words** editing workspace.

## Run

```bash
npm install
npm run build
npm run dev
```

Open http://127.0.0.1:5173.

## Workflow

- **Library** is the home screen: search, favorites, parts-of-speech filters, and study.
- **Manage words** is a separate page, never a modal. Click Add word or Edit to go there.
- All words are editable in rows. Expand any row to edit multiple meanings, examples, pronunciation, synonyms, antonyms, and related forms.
- Use the small red trash icon to stage a deletion. **Save changes** commits all edits together; **Cancel** discards them.
- Existing words and favorites remain compatible.

## Local data

The Vite local server stores words in `data/vocabulary.json`, excluded from Git by `.gitignore`. **Keep your existing data file when updating.**
