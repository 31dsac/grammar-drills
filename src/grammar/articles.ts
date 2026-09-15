import type { Case, CaseGenderTable, Gender } from './types';

export type ArticleWord = 'der' | 'dieser' | 'ein' | 'kein' | 'mein' | 'dein' | 'sein' | 'ihr' | 'unser';

export const DER_WORDS: readonly ArticleWord[] = ['der', 'dieser'];
/** ein has no plural; it is excluded from plural cells by the generator. */
export const EIN_WORDS: readonly ArticleWord[] = ['ein', 'kein', 'mein', 'dein', 'sein', 'ihr', 'unser'];

const DER: CaseGenderTable<string> = {
  nom: { m: 'der', f: 'die', n: 'das', pl: 'die' },
  akk: { m: 'den', f: 'die', n: 'das', pl: 'die' },
  dat: { m: 'dem', f: 'der', n: 'dem', pl: 'den' },
  gen: { m: 'des', f: 'der', n: 'des', pl: 'der' },
};

/** Endings added to dies-, jed-, welch- … */
const DIESER: CaseGenderTable<string> = {
  nom: { m: 'er', f: 'e', n: 'es', pl: 'e' },
  akk: { m: 'en', f: 'e', n: 'es', pl: 'e' },
  dat: { m: 'em', f: 'er', n: 'em', pl: 'en' },
  gen: { m: 'es', f: 'er', n: 'es', pl: 'er' },
};

/** Endings added to ein-, kein-, mein- … (plural only exists for kein and possessives). */
const EIN: CaseGenderTable<string> = {
  nom: { m: '', f: 'e', n: '', pl: 'e' },
  akk: { m: 'en', f: 'e', n: '', pl: 'e' },
  dat: { m: 'em', f: 'er', n: 'em', pl: 'en' },
  gen: { m: 'es', f: 'er', n: 'es', pl: 'er' },
};

export function declineArticle(word: ArticleWord, c: Case, g: Gender): string {
  if (word === 'der') return DER[c][g];
  if (word === 'dieser') return 'dies' + DIESER[c][g];
  if (word === 'ein' && g === 'pl') {
    throw new Error('ein has no plural form');
  }
  return word + EIN[c][g];
}
