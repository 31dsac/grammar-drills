import { declineArticle, type ArticleWord } from '../grammar/articles';
import { adjectiveEnding } from '../grammar/endings';
import {
  PERSONAL_PRONOUNS,
  PERSONS,
  PERSON_LABELS,
  REFLEXIVE_PRONOUNS,
  RELATIVE_PRONOUNS,
  type Person,
} from '../grammar/pronouns';
import { CASES, CASE_NAMES, GENDERS, GENDER_NAMES, type ArticleType, type Case, type Gender } from '../grammar/types';

/** ending: type -en, -em …   word: type the whole form. */
export type AnswerMode = 'ending' | 'word';

export interface Axis {
  key: string;
  label: string;
  /** Full name, for hover and screen readers. */
  title?: string;
}

/** A paradigm to fill in from memory: one right form per row × column. */
export interface ParadigmTable {
  id: string;
  group: string;
  label: string;
  prompt: string;
  mode: AnswerMode;
  rows: readonly Axis[];
  cols: readonly Axis[];
  expected(row: string, col: string): string;
}

const GENDER_HEADS: Record<Gender, string> = { m: 'masc.', f: 'fem.', n: 'neut.', pl: 'pl.' };
const CASE_ROWS: readonly Axis[] = CASES.map((c) => ({ key: c, label: CASE_NAMES[c] }));
const GENDER_COLS: readonly Axis[] = GENDERS.map((g) => ({ key: g, label: GENDER_HEADS[g], title: GENDER_NAMES[g] }));

function adjectiveTable(id: string, type: ArticleType, label: string, when: string): ParadigmTable {
  return {
    id,
    group: 'Adjective endings',
    label,
    prompt: `Type the adjective ending ${when}.`,
    mode: 'ending',
    rows: CASE_ROWS,
    cols: GENDER_COLS,
    expected: (row, col) => adjectiveEnding(type, row as Case, col as Gender),
  };
}

function articleTable(word: ArticleWord, prompt: string): ParadigmTable {
  return {
    id: `art-${word}`,
    group: 'Articles',
    label: word,
    prompt,
    mode: 'word',
    rows: CASE_ROWS,
    cols: GENDER_COLS,
    expected: (row, col) => declineArticle(word, row as Case, col as Gender),
  };
}

const PRONOUN_COLS: readonly Axis[] = [
  { key: 'akk', label: 'Akk', title: 'personal pronoun, Akkusativ' },
  { key: 'dat', label: 'Dat', title: 'personal pronoun, Dativ' },
  { key: 'refl-akk', label: 'refl. Akk', title: 'reflexive pronoun, Akkusativ' },
  { key: 'refl-dat', label: 'refl. Dat', title: 'reflexive pronoun, Dativ' },
];

function pronounForm(row: string, col: string): string {
  const person = row as Person;
  switch (col) {
    case 'akk':
      return PERSONAL_PRONOUNS[person].akk;
    case 'dat':
      return PERSONAL_PRONOUNS[person].dat;
    case 'refl-akk':
      return REFLEXIVE_PRONOUNS[person].akk;
    default:
      return REFLEXIVE_PRONOUNS[person].dat;
  }
}

export const TABLES: readonly ParadigmTable[] = [
  adjectiveTable('adj-weak', 'definite', 'der-word · weak', 'after a der-word (der, dieser)'),
  adjectiveTable('adj-mixed', 'indefinite', 'ein-word · mixed', 'after an ein-word (ein, kein, mein)'),
  adjectiveTable('adj-strong', 'none', 'no article · strong', 'when there is no article word'),
  articleTable('der', 'Type the definite article.'),
  articleTable('dieser', 'Type the form of dieser. jeder, welcher and mancher follow it.'),
  articleTable('kein', 'Type the form of kein. ein is the same without a plural; mein, dein, sein … follow it too.'),
  {
    id: 'rel',
    group: 'Pronouns',
    label: 'relative',
    prompt: 'Type the relative pronoun. Row: its job inside the clause. Column: the noun it refers to.',
    mode: 'word',
    rows: CASE_ROWS,
    cols: GENDER_COLS,
    expected: (row, col) => RELATIVE_PRONOUNS[row as Case][col as Gender],
  },
  {
    id: 'pers',
    group: 'Pronouns',
    label: 'personal · reflexive',
    prompt: 'Type the pronoun: personal on the left, reflexive on the right.',
    mode: 'word',
    rows: PERSONS.map((p) => ({ key: p, label: PERSON_LABELS[p] })),
    cols: PRONOUN_COLS,
    expected: pronounForm,
  },
];

export const TABLE_GROUPS: readonly string[] = [...new Set(TABLES.map((t) => t.group))];

export function findTable(id: string): ParadigmTable | undefined {
  return TABLES.find((t) => t.id === id);
}
