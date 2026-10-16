/**
 * Definitions follow Merriam-Webster's shape: numbered definitions (1, 2, 3), each of which
 * may hold lettered subdefinitions (2a, 2b).
 *
 * The position in its array is a definition's ordering position. Numbers and letters are
 * never stored; they are derived from positions every time they are shown, so reordering
 * or deleting renumbers everything automatically and ids stay stable.
 */
import {cleanRelations,hasRelations,noRelations,pickRelations,readRelations,type Relations} from './relations.ts';

/** Every definition and subdefinition has its own synonyms, antonyms and related forms. */
export type Subsense = { id: string; definition: string; examples: string[] } & Relations;
export type Sense = { id: string; definition: string; examples: string[]; subsenses: Subsense[] } & Relations;

/** One definition flattened for display, games and tests. */
export type Meaning = Relations & {
  id: string;
  /** "1", "2a" */
  label: string;
  number: number;
  /** "" for a numbered definition, "a", "b" for a subdefinition */
  letter: string;
  parentId: string | null;
  definition: string;
  examples: string[];
};

export const newSubsense = (): Subsense => ({ id: crypto.randomUUID(), definition: '', examples: [], ...noRelations() });
export const newSense = (): Sense => ({ id: crypto.randomUUID(), definition: '', examples: [], subsenses: [], ...noRelations() });

/** a … z, then aa, ab … so letters never run out. */
export function letterFor(index: number): string {
  return index < 26 ? String.fromCharCode(97 + index) : letterFor(Math.floor(index / 26) - 1) + letterFor(index % 26);
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const records = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)) : [];

/** Reads saved definitions. Entries saved before subdefinitions existed simply get none. */
export function readSenses(value: unknown): Sense[] {
  return records(value).map(s => ({
    id: str(s.id) || crypto.randomUUID(),
    definition: str(s.definition),
    examples: strings(s.examples),
    ...readRelations(s),
    subsenses: records(s.subsenses).map(x => ({ id: str(x.id) || crypto.randomUUID(), definition: str(x.definition), examples: strings(x.examples), ...readRelations(x) })),
  }));
}

/** Every definition in reading order: 1, 2, 2a, 2b, 3. A numbered definition that only groups subdefinitions is left out. */
export function meanings(senses: Sense[]): Meaning[] {
  return senses.flatMap((sense, i) => {
    const number = i + 1;
    const own: Meaning[] = sense.definition.trim() || sense.examples.some(e => e.trim())
      ? [{ id: sense.id, label: `${number}`, number, letter: '', parentId: null, definition: sense.definition, examples: sense.examples, ...pickRelations(sense) }]
      : [];
    return [
      ...own,
      ...sense.subsenses.map((sub, j) => {
        const letter = letterFor(j);
        return { id: sub.id, label: `${number}${letter}`, number, letter, parentId: sense.id, definition: sub.definition, examples: sub.examples, ...pickRelations(sub) };
      }),
    ];
  });
}

/** Only the definitions that have text: what games, tests and flashcards can use. */
export const definedMeanings = (senses: Sense[]) => meanings(senses).filter(m => m.definition.trim());
export const hasDefinition = (senses: Sense[]) => definedMeanings(senses).length > 0;
export const firstDefinition = (senses: Sense[]) => definedMeanings(senses)[0]?.definition.trim() || '';
export const definitionCount = (senses: Sense[]) => definedMeanings(senses).length;

const trimmed = (examples: string[]) => examples.map(x => x.trim()).filter(Boolean);

/** Trims text and drops empty definitions and subdefinitions. */
export function cleanSenses(senses: Sense[]): Sense[] {
  return senses
    .map(s => ({
      id: s.id,
      definition: s.definition.trim(),
      examples: trimmed(s.examples),
      ...cleanRelations(s),
      subsenses: s.subsenses.map(x => ({ id: x.id, definition: x.definition.trim(), examples: trimmed(x.examples), ...cleanRelations(x) })).filter(x => x.definition),
    }))
    .filter(s => s.definition || s.subsenses.length);
}

/** What a definition holds besides its text, named for a message ("examples", "synonyms"). */
function attached(x: { examples: string[] } & Relations): string | null {
  if (x.examples.some(e => e.trim())) return 'examples';
  if (!hasRelations(x)) return null;
  return x.synonyms.some(t => t.term.trim()) ? 'synonyms' : x.antonyms.some(t => t.term.trim()) ? 'antonyms' : 'related forms';
}

/**
 * Something that would be silently lost on save, described for the person.
 * Examples and related words always belong to a definition, so having them without one is a problem.
 */
export function sensesProblem(senses: Sense[]): string | null {
  for (const [i, s] of senses.entries()) {
    const n = i + 1;
    const own = s.definition.trim() ? null : attached(s);
    if (own)
      return s.subsenses.length
        ? `Definition ${n} has ${own} but no text. Add its definition, or move the ${own} to ${n}a.`
        : `Definition ${n} has ${own} but no text.`;
    for (const [j, x] of s.subsenses.entries()) {
      const sub = x.definition.trim() ? null : attached(x);
      if (sub) return `Definition ${n}${letterFor(j)} has ${sub} but no text.`;
    }
  }
  return hasDefinition(senses) ? null : 'needs a definition';
}

/** Moves one item up (-1) or down (+1); out-of-range moves return the same list. */
export function moved<T>(list: T[], index: number, delta: number): T[] {
  const to = index + delta;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** One line of a displayed definition list. */
export type DefinitionRow = Relations & {
  key: string;
  /** "1." on a numbered definition, "" on a subdefinition */
  number: string;
  /** "a." on a subdefinition */
  letter: string;
  /** "1", "2a": printed beside the matching examples */
  label: string;
  definition: string;
  examples: string[];
  isSub: boolean;
  /** A numbered definition with no text of its own, shown as a heading over its subdefinitions. */
  isHeading: boolean;
};

/** The hierarchy as display rows: 1. / 2. / a. / b. / 3. Empty definitions are skipped. */
export function definitionRows(senses: Sense[]): DefinitionRow[] {
  return cleanSenses(senses).flatMap((sense, i) => {
    const n = i + 1;
    const head: DefinitionRow = { key: sense.id, number: `${n}.`, letter: '', label: `${n}`, definition: sense.definition, examples: sense.examples, ...pickRelations(sense), isSub: false, isHeading: !sense.definition };
    return [
      head,
      ...sense.subsenses.map((sub, j): DefinitionRow => ({ key: sub.id, number: '', letter: `${letterFor(j)}.`, label: `${n}${letterFor(j)}`, definition: sub.definition, examples: sub.examples, ...pickRelations(sub), isSub: true, isHeading: false })),
    ];
  });
}
