#!/usr/bin/env node
// Lexicon MCP server: lets AI clients read, search, add, and remove words in the
// user's local Lexicon vocabulary file. Talks over stdio and touches a single
// JSON file, the same one the Lexicon desktop app reads at launch.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const BUNDLE_ID = 'io.github.teddyfitzsimons.lexicon';

function defaultDataDir(): string {
  const env = process.env.LEXICON_DATA_DIR;
  if (env) return env;
  const home = homedir();
  switch (platform()) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', BUNDLE_ID);
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), BUNDLE_ID);
    default:
      return join(process.env.XDG_DATA_HOME || join(home, '.local', 'share'), BUNDLE_ID);
  }
}

const DATA_DIR = defaultDataDir();
const WORDS_FILE = join(DATA_DIR, 'vocabulary.json');

type Word = {
  id: string;
  term: string;
  definition: string;
  partOfSpeech: string;
  example: string;
  [key: string]: unknown;
};

async function readWords(): Promise<Word[]> {
  try {
    const raw = await fs.readFile(WORDS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('vocabulary.json is not an array');
    return parsed as Word[];
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw e;
  }
}

// Atomic write: same tmp+rename pattern the Lexicon desktop app uses, so a crash
// mid-write can never leave vocabulary.json half-written.
async function writeWords(words: Word[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = WORDS_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(words, null, 2) + '\n');
  await fs.rename(tmp, WORDS_FILE);
}

const PARTS = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Preposition', 'Conjunction', 'Interjection', 'Determiner', 'Other'];

function normalizePart(input: string): string {
  const match = PARTS.find(p => p.toLowerCase() === input.trim().toLowerCase());
  return match ?? 'Other';
}

const server = new Server(
  { name: 'lexicon', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_words',
      description: `List words in the Lexicon vocabulary. Returns term, definition, part of speech, and id for each entry. Vocabulary file: ${WORDS_FILE}`,
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 1000, description: 'Max number of words to return (default 100).' },
        },
      },
    },
    {
      name: 'search_words',
      description: 'Case-insensitive search across term, definition, and example. Returns matching words.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text to search for.' },
          limit: { type: 'integer', minimum: 1, maximum: 1000 },
        },
        required: ['query'],
      },
    },
    {
      name: 'add_word',
      description: 'Add one word to the Lexicon vocabulary. Fails if a word with the same term already exists. Note: if the Lexicon desktop app is running, relaunch it to see the new word.',
      inputSchema: {
        type: 'object',
        properties: {
          term: { type: 'string', description: 'The word itself.' },
          definition: { type: 'string', description: "The word's meaning." },
          partOfSpeech: {
            type: 'string',
            description: `One of: ${PARTS.join(', ')}.`,
          },
          example: { type: 'string', description: 'An example sentence (optional).' },
        },
        required: ['term', 'definition', 'partOfSpeech'],
      },
    },
    {
      name: 'delete_word',
      description: 'Remove a word by id or by exact term. Returns the word that was removed.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The word id. Takes precedence over term.' },
          term: { type: 'string', description: 'The exact term (case-insensitive).' },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  try {
    if (name === 'list_words') {
      const words = await readWords();
      const limit = typeof a.limit === 'number' ? a.limit : 100;
      const slim = words.slice(0, limit).map(w => ({
        id: w.id,
        term: w.term,
        definition: w.definition,
        partOfSpeech: w.partOfSpeech,
      }));
      return { content: [{ type: 'text', text: JSON.stringify({ total: words.length, returned: slim.length, words: slim }, null, 2) }] };
    }

    if (name === 'search_words') {
      const query = String(a.query ?? '').trim().toLowerCase();
      if (!query) throw new Error('query is required');
      const limit = typeof a.limit === 'number' ? a.limit : 50;
      const words = await readWords();
      const matches = words
        .filter(w =>
          String(w.term ?? '').toLowerCase().includes(query) ||
          String(w.definition ?? '').toLowerCase().includes(query) ||
          String(w.example ?? '').toLowerCase().includes(query))
        .slice(0, limit)
        .map(w => ({ id: w.id, term: w.term, definition: w.definition, partOfSpeech: w.partOfSpeech, example: w.example }));
      return { content: [{ type: 'text', text: JSON.stringify({ matches: matches.length, words: matches }, null, 2) }] };
    }

    if (name === 'add_word') {
      const term = String(a.term ?? '').trim();
      const definition = String(a.definition ?? '').trim();
      const partOfSpeech = normalizePart(String(a.partOfSpeech ?? ''));
      const example = String(a.example ?? '').trim();
      if (!term) throw new Error('term is required');
      if (!definition) throw new Error('definition is required');
      const words = await readWords();
      if (words.some(w => String(w.term ?? '').toLowerCase() === term.toLowerCase())) {
        throw new Error(`"${term}" is already in your vocabulary`);
      }
      const addedAt = new Date().toISOString().slice(0, 10);
      const word: Word = {
        id: randomUUID(),
        term,
        definition,
        partOfSpeech,
        example,
        examples: example ? [example] : [],
        senses: [],
        pronunciation: '',
        readablePronunciation: '',
        readableManuallyEdited: false,
        synonyms: [],
        antonyms: [],
        relatedForms: [],
        favorite: false,
        addedAt,
      };
      words.push(word);
      await writeWords(words);
      return { content: [{ type: 'text', text: `Added "${term}". Lexicon now has ${words.length} word${words.length === 1 ? '' : 's'}. If the Lexicon desktop app is open, relaunch it to see the new word.` }] };
    }

    if (name === 'delete_word') {
      const words = await readWords();
      const id = typeof a.id === 'string' ? a.id : undefined;
      const term = typeof a.term === 'string' ? a.term.trim().toLowerCase() : undefined;
      if (!id && !term) throw new Error('id or term is required');
      const index = words.findIndex(w =>
        (id && w.id === id) || (term && String(w.term ?? '').toLowerCase() === term));
      if (index === -1) throw new Error('No matching word found');
      const [removed] = words.splice(index, 1);
      await writeWords(words);
      return { content: [{ type: 'text', text: `Removed "${removed.term}". Lexicon now has ${words.length} word${words.length === 1 ? '' : 's'}.` }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { isError: true, content: [{ type: 'text', text: message }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
