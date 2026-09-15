import type { Case } from './types';

/** Semantic kinds, used only to keep generated phrases sensible (no *das rote Kind*). */
export type Kind = 'person' | 'animal' | 'object' | 'food' | 'music' | 'weather' | 'precip';

export interface Noun {
  base: string;
  gender: 'm' | 'f' | 'n';
  kind: Kind;
  /** Genitive singular, written out: Tisches, Wetters, Milch. */
  genSg: string;
  /** Count nouns only. Mass nouns have no plural and are the only nouns used without an article. */
  pl?: string;
  datPl?: string;
}

export interface Adjective {
  /** Regular stems only: the stem is the dictionary form. */
  stem: string;
  kinds: readonly Kind[];
}

export interface Frame {
  case: Case;
  /** Words before the noun phrase. */
  before: string;
  /** Replaces `before` when the noun phrase is plural (Das ist → Das sind). */
  beforePl?: string;
  after?: string;
  /** Trigger word shown in the hint, e.g. "mit". */
  trigger: string;
  kinds: readonly Kind[];
}

const n = (base: string, gender: Noun['gender'], kind: Kind, genSg: string, pl?: string, datPl?: string): Noun => ({
  base,
  gender,
  kind,
  genSg,
  ...(pl !== undefined ? { pl, datPl: datPl ?? pl } : {}),
});

export const NOUNS: readonly Noun[] = [
  // people
  n('Mann', 'm', 'person', 'Mannes', 'Männer', 'Männern'),
  n('Freund', 'm', 'person', 'Freundes', 'Freunde', 'Freunden'),
  n('Lehrer', 'm', 'person', 'Lehrers', 'Lehrer', 'Lehrern'),
  n('Frau', 'f', 'person', 'Frau', 'Frauen', 'Frauen'),
  n('Freundin', 'f', 'person', 'Freundin', 'Freundinnen', 'Freundinnen'),
  n('Nachbarin', 'f', 'person', 'Nachbarin', 'Nachbarinnen', 'Nachbarinnen'),
  n('Kind', 'n', 'person', 'Kindes', 'Kinder', 'Kindern'),
  n('Mädchen', 'n', 'person', 'Mädchens', 'Mädchen', 'Mädchen'),
  // animals
  n('Hund', 'm', 'animal', 'Hundes', 'Hunde', 'Hunden'),
  n('Vogel', 'm', 'animal', 'Vogels', 'Vögel', 'Vögeln'),
  n('Katze', 'f', 'animal', 'Katze', 'Katzen', 'Katzen'),
  n('Pferd', 'n', 'animal', 'Pferdes', 'Pferde', 'Pferden'),
  // objects
  n('Tisch', 'm', 'object', 'Tisches', 'Tische', 'Tischen'),
  n('Stuhl', 'm', 'object', 'Stuhls', 'Stühle', 'Stühlen'),
  n('Wagen', 'm', 'object', 'Wagens', 'Wagen', 'Wagen'),
  n('Lampe', 'f', 'object', 'Lampe', 'Lampen', 'Lampen'),
  n('Tasche', 'f', 'object', 'Tasche', 'Taschen', 'Taschen'),
  n('Wohnung', 'f', 'object', 'Wohnung', 'Wohnungen', 'Wohnungen'),
  n('Haus', 'n', 'object', 'Hauses', 'Häuser', 'Häusern'),
  n('Buch', 'n', 'object', 'Buches', 'Bücher', 'Büchern'),
  n('Auto', 'n', 'object', 'Autos', 'Autos', 'Autos'),
  n('Fahrrad', 'n', 'object', 'Fahrrads', 'Fahrräder', 'Fahrrädern'),
  // mass nouns (no plural)
  n('Kaffee', 'm', 'food', 'Kaffees'),
  n('Wein', 'm', 'food', 'Weins'),
  n('Käse', 'm', 'food', 'Käses'),
  n('Milch', 'f', 'food', 'Milch'),
  n('Suppe', 'f', 'food', 'Suppe'),
  n('Wasser', 'n', 'food', 'Wassers'),
  n('Brot', 'n', 'food', 'Brotes'),
  n('Musik', 'f', 'music', 'Musik'),
  n('Wetter', 'n', 'weather', 'Wetters'),
  n('Regen', 'm', 'precip', 'Regens'),
  n('Wind', 'm', 'precip', 'Windes'),
];

export const ADJECTIVES: readonly Adjective[] = [
  { stem: 'klein', kinds: ['person', 'animal', 'object'] },
  { stem: 'groß', kinds: ['person', 'animal', 'object'] },
  { stem: 'alt', kinds: ['person', 'animal', 'object'] },
  { stem: 'jung', kinds: ['person', 'animal'] },
  { stem: 'nett', kinds: ['person'] },
  { stem: 'freundlich', kinds: ['person', 'animal'] },
  { stem: 'neu', kinds: ['object'] },
  { stem: 'schön', kinds: ['person', 'animal', 'object', 'weather'] },
  { stem: 'rot', kinds: ['object'] },
  { stem: 'blau', kinds: ['object'] },
  { stem: 'modern', kinds: ['object', 'music'] },
  { stem: 'billig', kinds: ['object', 'food'] },
  { stem: 'frisch', kinds: ['food'] },
  { stem: 'heiß', kinds: ['food', 'weather'] },
  { stem: 'warm', kinds: ['food', 'weather', 'precip'] },
  { stem: 'kalt', kinds: ['food', 'weather', 'precip'] },
  { stem: 'gut', kinds: ['person', 'food', 'music', 'weather'] },
  { stem: 'schlecht', kinds: ['food', 'music', 'weather'] },
  { stem: 'laut', kinds: ['person', 'animal', 'music'] },
  { stem: 'klassisch', kinds: ['music'] },
  { stem: 'stark', kinds: ['food', 'precip'] },
];

const ALL_KINDS: readonly Kind[] = ['person', 'animal', 'object', 'food', 'music', 'weather', 'precip'];

export const FRAMES: readonly Frame[] = [
  { case: 'nom', before: 'Das ist', beforePl: 'Das sind', after: '.', trigger: 'Das ist … (subject complement)', kinds: ALL_KINDS },

  { case: 'akk', before: 'Ich sehe', after: '.', trigger: 'sehen + direct object', kinds: ['person', 'animal', 'object'] },
  { case: 'akk', before: 'Ich kaufe', after: '.', trigger: 'kaufen + direct object', kinds: ['object', 'food'] },
  { case: 'akk', before: 'Ich höre gern', after: '.', trigger: 'hören + direct object', kinds: ['music'] },
  { case: 'akk', before: 'für', trigger: 'für', kinds: ['person', 'animal', 'object'] },
  { case: 'akk', before: 'ohne', trigger: 'ohne', kinds: ['person', 'food', 'music'] },

  { case: 'dat', before: 'mit', trigger: 'mit', kinds: ['person', 'animal', 'object', 'food', 'music'] },
  { case: 'dat', before: 'von', trigger: 'von', kinds: ['person', 'animal', 'object'] },
  { case: 'dat', before: 'bei', trigger: 'bei', kinds: ['person', 'weather', 'precip'] },
  { case: 'dat', before: 'Ich helfe', after: '.', trigger: 'helfen + dative', kinds: ['person', 'animal'] },

  { case: 'gen', before: 'wegen', trigger: 'wegen', kinds: ALL_KINDS },
  { case: 'gen', before: 'trotz', trigger: 'trotz', kinds: ['music', 'weather', 'precip'] },
  { case: 'gen', before: 'die Farbe', trigger: 'die Farbe … (whose colour?)', kinds: ['object', 'animal'] },
  { case: 'gen', before: 'der Name', trigger: 'der Name … (whose name?)', kinds: ['person', 'animal'] },
];

export function isMass(noun: Noun): boolean {
  return noun.pl === undefined;
}

export function nounForm(noun: Noun, c: Case, plural: boolean): string {
  if (plural) {
    if (noun.pl === undefined || noun.datPl === undefined) throw new Error(`${noun.base} has no plural`);
    return c === 'dat' ? noun.datPl : noun.pl;
  }
  return c === 'gen' ? noun.genSg : noun.base;
}
