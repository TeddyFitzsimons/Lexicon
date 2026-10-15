# Changelog

Each `## <version>` section becomes the notes of the matching GitHub release.

## Unreleased: hierarchical definitions

- Add optional lettered subdefinitions beneath numbered definitions, each with its own examples.
- Reorder or delete individual definitions or subdefinitions; numbering and lettering are recalculated from their positions, while stable node IDs and examples stay together.
- The library, flashcards, definition game, spelling game, test questions, sentence game, editor search, and share previews understand subdefinitions.
- Existing flat vocabulary files and old backups migrate when loaded. New share and backup files use version 2 to preserve the hierarchy and prevent older versions from silently discarding it.
- New hierarchy tests cover the Lexicon example, edits, legacy migration, games, imports, sharing, and backup restoration.

## 2.2.0

Lexicon is now a desktop app for macOS and Windows. Download it, install it, and use it with no browser, account or internet connection.

- Runs in its own window. Words, favorites, activity and streaks are saved in your computer's app-data folder and survive updates and reinstalls.
- **Back up and restore** on the Profile page: one file with your whole library and your streaks. Restoring asks first and keeps a copy of what it replaces.
- Moving from the web version: restore `vocabulary.json` and `profile.json` from your old `data` folder and everything comes across, favorites and streaks included.
- Share files save through the system's Save dialog. Merriam-Webster links open in your browser.
- Fonts are built in, so Lexicon looks the same offline.
- F11 toggles full screen. Opening Lexicon twice brings the open window forward instead of starting a second copy.
- Fix: if the profile ever failed to load, the next activity could have saved an empty profile over it and erased your streaks. It now waits until the profile has loaded.

## 2.1.0 and earlier

Browser versions, run with `npm run dev`: word library, Manage words editor, flashcards, three games (The missing word, Pick the meaning, Spell It), graded tests, Profile with streaks, activity calendar and trophies, and sharing words between friends. See [docs/web-version-notes.md](docs/web-version-notes.md).
