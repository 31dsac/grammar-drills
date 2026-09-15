export const CASES = ['nom', 'akk', 'dat', 'gen'] as const;
export type Case = (typeof CASES)[number];

/** Grammatical gender, with plural treated as a fourth column as in every ending table. */
export const GENDERS = ['m', 'f', 'n', 'pl'] as const;
export type Gender = (typeof GENDERS)[number];

export const ARTICLE_TYPES = ['definite', 'indefinite', 'none'] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

export const ENDINGS = ['e', 'en', 'er', 'es', 'em'] as const;
export type Ending = (typeof ENDINGS)[number];

/** A total table: every case × gender must be present, or it does not compile. */
export type CaseGenderTable<T> = Record<Case, Record<Gender, T>>;

export const CASE_NAMES: Record<Case, string> = {
  nom: 'Nominativ',
  akk: 'Akkusativ',
  dat: 'Dativ',
  gen: 'Genitiv',
};

export const GENDER_NAMES: Record<Gender, string> = {
  m: 'masculine',
  f: 'feminine',
  n: 'neuter',
  pl: 'plural',
};

export const ARTICLE_TYPE_NAMES: Record<ArticleType, string> = {
  definite: 'der-word',
  indefinite: 'ein-word',
  none: 'no article',
};
