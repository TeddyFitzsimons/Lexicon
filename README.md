# Local Vocabulary App

Run `npm install` and `npm run dev`, then open http://127.0.0.1:5173.

Vocabulary is saved to `data/vocabulary.json` on your computer, not browser storage. The `data/` directory is gitignored. Back up this file separately; gitignore is not a backup.

This version automatically imports old browser-localStorage words if the JSON file is empty. Keep using the same URL and browser for migration.

The local API is provided by the Vite development server. Keep `npm run dev` running while using the app.
