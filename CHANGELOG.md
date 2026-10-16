# Changelog

Each `## <version>` section becomes the notes of the matching GitHub release.

## 2.2.0

Lexicon is now a desktop app for macOS and Windows. Download it, install it, and use it with no browser, account or internet connection.

- Runs in its own window. Words, favorites, activity and streaks are saved in your computer's app-data folder and survive updates and reinstalls.
- **Back up and restore** on the Profile page: one file with your whole library and your streaks. Restoring asks first and keeps a copy of what it replaces.
- Moving from the web version: restore `vocabulary.json` and `profile.json` from your old `data` folder and everything comes across, favorites and streaks included.
- Share files save through the system's Save dialog. Merriam-Webster links open in your browser.
- Fonts are built in, so Lexicon looks the same offline.
- F11 toggles full screen. Opening Lexicon twice brings the open window forward instead of starting a second copy.
- **Subdefinitions**, Merriam-Webster style: numbered definitions (1, 2, 3) can hold lettered subdefinitions (2a, 2b), each with its own examples. Add, reorder and remove them in Manage words; numbers and letters update automatically. Flashcards, all three games, tests, search and share files use them. Existing words are unchanged.
- **Synonyms, antonyms and related forms belong to each definition** (1, 2a, 2b), because different meanings have different relatives. Every word links to its Merriam-Webster page, or to a custom link you set. Older whole-word lists move onto the definition automatically when a word has only one meaning; otherwise they wait in a "Not yet assigned" panel in Manage words, so nothing is guessed or lost.
- The part-of-speech menu has a search box.
- Examples are labelled with the definition they belong to (1, 2a). Long definitions and examples grow to fit while you edit.
- Sidebar tabs show the selected tab's marigold shape on hover. The profile pencil appears only when you point at your name. The library banner has flowing waves instead of a circle, and the Games page has a gaming bird.
- Fix: if the profile ever failed to load, the next activity could have saved an empty profile over it and erased your streaks. It now waits until the profile has loaded.

## 2.1.0 and earlier

Browser versions, run with `npm run dev`: word library, Manage words editor, flashcards, three games (The missing word, Pick the meaning, Spell It), graded tests, Profile with streaks, activity calendar and trophies, and sharing words between friends. See [docs/web-version-notes.md](docs/web-version-notes.md).
