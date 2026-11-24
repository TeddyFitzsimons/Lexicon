# Lexicon MCP server

A tiny [Model Context Protocol](https://modelcontextprotocol.io/) server that lets
AI tools (Claude Code, Claude Desktop, Cursor, or any MCP-capable client) read,
search, add, and remove words in your local Lexicon vocabulary.

It talks to the exact same `vocabulary.json` file that the Lexicon desktop app
uses, at the OS-standard app-data path (`~/Library/Application Support/io.github.teddyfitzsimons.lexicon/`
on macOS, `%APPDATA%\io.github.teddyfitzsimons.lexicon\` on Windows). Writes are
atomic (tmp + rename), so a crash mid-write cannot corrupt the file.

## Build

```bash
cd mcp-server
npm install
npm run build
```

That produces `dist/index.js`, the executable server.

## Tools exposed

| Tool          | What it does                                                      |
|---------------|-------------------------------------------------------------------|
| `list_words`  | Returns id, term, definition, and part of speech for each entry.  |
| `search_words`| Case-insensitive search over term, definition, and example.       |
| `add_word`    | Appends a word (term, definition, partOfSpeech, optional example).|
| `delete_word` | Removes a word by id or exact term.                               |

## Connect to Claude Code

From anywhere in a terminal:

```bash
claude mcp add lexicon --scope user -- node /Users/teddyfitzsimons/Developer/Lexicon/mcp-server/dist/index.js
```

Then in any Claude Code session: ask it to "add the word *ineffable* to my
Lexicon", or "list my Lexicon words", and it will call these tools.

## Connect to other clients

Any MCP client that supports stdio servers can be pointed at
`node .../mcp-server/dist/index.js`. Point `LEXICON_DATA_DIR` at a different
folder to target a different vocabulary file (handy for testing).

## Important: relaunch Lexicon after adds

Lexicon reads `vocabulary.json` once, at launch, and writes it back when you
save inside the app. If Lexicon is open when the MCP server adds a word, the
app won't see the new word until you relaunch — and if you edit something in
Lexicon in the meantime, its next save will overwrite the MCP addition. Close
Lexicon before asking an AI to add words, or relaunch it right after.
