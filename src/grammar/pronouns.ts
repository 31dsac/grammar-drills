import type { CaseGenderTable } from './types';

/** The relative pronoun is the definite article, except dessen, deren and denen. */
export const RELATIVE_PRONOUNS: CaseGenderTable<string> = {
  nom: { m: 'der', f: 'die', n: 'das', pl: 'die' },
  akk: { m: 'den', f: 'die', n: 'das', pl: 'die' },
  dat: { m: 'dem', f: 'der', n: 'dem', pl: 'denen' },
  gen: { m: 'dessen', f: 'deren', n: 'dessen', pl: 'deren' },
};

export const PERSONS = ['ich', 'du', 'er', 'sie-sg', 'es', 'wir', 'ihr', 'sie-pl', 'Sie'] as const;
export type Person = (typeof PERSONS)[number];

export const PERSON_LABELS: Record<Person, string> = {
  ich: 'ich',
  du: 'du',
  er: 'er',
  'sie-sg': 'sie · she',
  es: 'es',
  wir: 'wir',
  ihr: 'ihr',
  'sie-pl': 'sie · they',
  Sie: 'Sie · formal',
};

export interface ObjectForms {
  akk: string;
  dat: string;
}

export const PERSONAL_PRONOUNS: Record<Person, ObjectForms> = {
  ich: { akk: 'mich', dat: 'mir' },
  du: { akk: 'dich', dat: 'dir' },
  er: { akk: 'ihn', dat: 'ihm' },
  'sie-sg': { akk: 'sie', dat: 'ihr' },
  es: { akk: 'es', dat: 'ihm' },
  wir: { akk: 'uns', dat: 'uns' },
  ihr: { akk: 'euch', dat: 'euch' },
  'sie-pl': { akk: 'sie', dat: 'ihnen' },
  Sie: { akk: 'Sie', dat: 'Ihnen' },
};

/** Reflexive = personal pronoun, except sich for every third person and for Sie. */
export const REFLEXIVE_PRONOUNS: Record<Person, ObjectForms> = {
  ich: { akk: 'mich', dat: 'mir' },
  du: { akk: 'dich', dat: 'dir' },
  er: { akk: 'sich', dat: 'sich' },
  'sie-sg': { akk: 'sich', dat: 'sich' },
  es: { akk: 'sich', dat: 'sich' },
  wir: { akk: 'uns', dat: 'uns' },
  ihr: { akk: 'euch', dat: 'euch' },
  'sie-pl': { akk: 'sich', dat: 'sich' },
  Sie: { akk: 'sich', dat: 'sich' },
};
