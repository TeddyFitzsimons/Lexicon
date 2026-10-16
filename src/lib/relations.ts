/**
 * Synonyms, antonyms and related forms. They belong to a single definition or subdefinition,
 * because different meanings of a word have different relatives ("bright" as in light vs. clever).
 * A word can also hold relationships that haven't been assigned to a meaning yet: those come from
 * older Lexicon files, where they belonged to the whole word, and stay put until the person moves them.
 */
export type RelatedTerm = { term: string; url: string };
export type Relation = 'synonyms' | 'antonyms' | 'relatedForms';
export type Relations = Record<Relation, RelatedTerm[]>;

export const relations: Relation[] = ['synonyms', 'antonyms', 'relatedForms'];
export const labels: Record<Relation, string> = { synonyms: 'Synonyms', antonyms: 'Antonyms', relatedForms: 'Related forms' };
export const singular: Record<Relation, string> = { synonyms: 'synonym', antonyms: 'antonym', relatedForms: 'related form' };

export const noRelations = (): Relations => ({ synonyms: [], antonyms: [], relatedForms: [] });

/** A custom link must be a Merriam-Webster dictionary page. */
export const MW_LINK = /^https:\/\/(www\.)?merriam-webster\.com\/dictionary\/\S+$/i;

/** The custom link if there is a valid one, otherwise the word's own Merriam-Webster page. */
export function dictionaryUrl(item: RelatedTerm): string {
  const custom = item.url.trim();
  if (MW_LINK.test(custom)) return custom;
  return `https://www.merriam-webster.com/dictionary/${encodeURIComponent(item.term.trim().toLowerCase())}`;
}

/**
 * Reads saved entries. Very old files stored related words as card ids; `lookup` turns those
 * back into words when it can.
 */
export function readRelated(value: unknown, lookup?: Map<string, string>): RelatedTerm[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((x): RelatedTerm[] => {
    if (typeof x === 'string') return [{ term: lookup?.get(x) || x, url: '' }];
    if (x && typeof x === 'object' && typeof (x as Record<string, unknown>).term === 'string') {
      const r = x as Record<string, unknown>;
      return [{ term: String(r.term), url: typeof r.url === 'string' ? r.url : '' }];
    }
    return [];
  });
}

export const readRelations = (raw: Record<string, unknown>, lookup?: Map<string, string>): Relations => ({
  synonyms: readRelated(raw.synonyms, lookup),
  antonyms: readRelated(raw.antonyms, lookup),
  relatedForms: readRelated(raw.relatedForms, lookup),
});

/** Trims, drops blanks and removes repeats (case-insensitive), keeping the first. */
export function cleanRelated(items: RelatedTerm[]): RelatedTerm[] {
  const seen = new Set<string>();
  return items
    .map(x => ({ term: x.term.trim(), url: x.url.trim() }))
    .filter(x => x.term && !seen.has(x.term.toLowerCase()) && seen.add(x.term.toLowerCase()));
}

export const cleanRelations = (r: Relations): Relations => ({
  synonyms: cleanRelated(r.synonyms),
  antonyms: cleanRelated(r.antonyms),
  relatedForms: cleanRelated(r.relatedForms),
});

export const pickRelations = (r: Relations): Relations => ({ synonyms: r.synonyms, antonyms: r.antonyms, relatedForms: r.relatedForms });
export const hasRelations = (r: Relations) => relations.some(k => r[k].some(x => x.term.trim()));

/** Adds `extra` to `base`, skipping words already there. */
export function mergeRelations(base: Relations, extra: Relations): Relations {
  return cleanRelations({
    synonyms: [...base.synonyms, ...extra.synonyms],
    antonyms: [...base.antonyms, ...extra.antonyms],
    relatedForms: [...base.relatedForms, ...extra.relatedForms],
  });
}
