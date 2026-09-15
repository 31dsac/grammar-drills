import type { ArticleType, Case, CaseGenderTable, Ending, Gender } from './types';

/** Weak declension: after der, dieser, jeder … */
const DEFINITE: CaseGenderTable<Ending> = {
  nom: { m: 'e', f: 'e', n: 'e', pl: 'en' },
  akk: { m: 'en', f: 'e', n: 'e', pl: 'en' },
  dat: { m: 'en', f: 'en', n: 'en', pl: 'en' },
  gen: { m: 'en', f: 'en', n: 'en', pl: 'en' },
};

/** Mixed declension: after ein, kein and the possessives. */
const INDEFINITE: CaseGenderTable<Ending> = {
  nom: { m: 'er', f: 'e', n: 'es', pl: 'en' },
  akk: { m: 'en', f: 'e', n: 'es', pl: 'en' },
  dat: { m: 'en', f: 'en', n: 'en', pl: 'en' },
  gen: { m: 'en', f: 'en', n: 'en', pl: 'en' },
};

/** Strong declension: no article word at all. */
const NONE: CaseGenderTable<Ending> = {
  nom: { m: 'er', f: 'e', n: 'es', pl: 'e' },
  akk: { m: 'en', f: 'e', n: 'es', pl: 'e' },
  dat: { m: 'em', f: 'er', n: 'em', pl: 'en' },
  gen: { m: 'en', f: 'er', n: 'en', pl: 'er' },
};

const TABLES: Record<ArticleType, CaseGenderTable<Ending>> = {
  definite: DEFINITE,
  indefinite: INDEFINITE,
  none: NONE,
};

export function adjectiveEnding(type: ArticleType, c: Case, g: Gender): Ending {
  return TABLES[type][c][g];
}

/** The definite article for a cell, used to explain strong endings ("dem → -em"). */
const DER: CaseGenderTable<string> = {
  nom: { m: 'der', f: 'die', n: 'das', pl: 'die' },
  akk: { m: 'den', f: 'die', n: 'das', pl: 'die' },
  dat: { m: 'dem', f: 'der', n: 'dem', pl: 'den' },
  gen: { m: 'des', f: 'der', n: 'des', pl: 'der' },
};

/** One-sentence rule for why this cell takes its ending. */
export function explainEnding(type: ArticleType, c: Case, g: Gender): string {
  const ending = adjectiveEnding(type, c, g);

  if (type === 'none') {
    const der = DER[c][g];
    if (c === 'gen' && (g === 'm' || g === 'n')) {
      return 'No article word, but genitive masculine/neuter is the exception: the noun already ends in -s, so the adjective takes -en.';
    }
    return `No article word, so the adjective carries the ending the article would have had: ${der} → -${ending}.`;
  }

  if (c === 'dat' || c === 'gen') {
    return `${c === 'dat' ? 'Dative' : 'Genitive'} after an article word → always -en.`;
  }
  if (g === 'pl') {
    return 'Plural after an article word → always -en.';
  }

  if (type === 'definite') {
    if (c === 'akk' && g === 'm') {
      return 'Masculine accusative (den) → -en. It is the only accusative singular that changes.';
    }
    return 'The der-word already shows gender and case, so the adjective only adds -e.';
  }

  // indefinite, nom/akk singular
  if (g === 'f') return 'eine already shows feminine, so the adjective only adds -e.';
  if (c === 'akk' && g === 'm') return 'einen already shows masculine accusative, so the adjective takes -en.';
  if (g === 'm') {
    return 'ein has no ending here, so the adjective has to show masculine itself: -er, like der.';
  }
  return 'ein has no ending here, so the adjective has to show neuter itself: -es, like das.';
}
