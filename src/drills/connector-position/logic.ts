import { CONNECTORS, CONNECTOR_CLASSES, CLASS_INFO, findConnector, type Connector, type ConnectorClass } from '../../grammar/connectors';
import { SENTENCES, type Sentence } from '../../grammar/sentences';
import { pick, shuffle, type Rng } from '../../util/rng';
import type { FilterSelection } from '../drill';

export const DRILL_ID = 'connector-position';

/** Word orders for clause B. `late` (S conn rest V) is wrong for every class; it pads the distractors. */
export const PATTERNS = ['inert', 'invert', 'kick', 'hide', 'late'] as const;
export type Pattern = (typeof PATTERNS)[number];

export type Role = 'conn' | 'verb' | null;
export interface Token {
  text: string;
  role: Role;
}

const ACCEPTED: Record<ConnectorClass, readonly Pattern[]> = {
  konjunktor: ['inert'],
  // "deshalb bleibe ich" and "ich bleibe deshalb" are both correct.
  adverbkonnektor: ['invert', 'hide'],
  subjunktor: ['kick'],
  konnektivpartikel: ['hide'],
};

/**
 * Orders that are grammatical with a *different* word that is spelled the same,
 * so they must never be offered as wrong answers.
 */
const NOT_DISTRACTORS: Record<string, readonly Pattern[]> = {
  aber: ['hide'], // particle aber: "ich muss aber noch arbeiten"
  denn: ['hide'], // particle denn
  da: ['invert', 'hide'], // adverb da ("there / then")
  damit: ['invert', 'hide'], // adverb damit ("with it")
};

export function acceptedPatterns(connector: Connector): readonly Pattern[] {
  return ACCEPTED[connector.cls];
}

export function distractorPatterns(connector: Connector): Pattern[] {
  const accepted = ACCEPTED[connector.cls];
  const excluded = NOT_DISTRACTORS[connector.word] ?? [];
  return PATTERNS.filter((p) => !accepted.includes(p) && !excluded.includes(p));
}

const words = (s: string): Token[] =>
  s
    .split(' ')
    .filter(Boolean)
    .map((text) => ({ text, role: null }));

export function orderClauseB(s: Sentence, pattern: Pattern): Token[] {
  const conn: Token[] = [{ text: s.connector, role: 'conn' }];
  const subj = words(s.subject);
  const verb: Token[] = [{ text: s.verb, role: 'verb' }];
  const rest = words(s.rest);
  const nf = words(s.nonfinite ?? '');
  switch (pattern) {
    case 'inert':
      return [...conn, ...subj, ...verb, ...rest, ...nf];
    case 'invert':
      return [...conn, ...verb, ...subj, ...rest, ...nf];
    case 'kick':
      return [...conn, ...subj, ...rest, ...nf, ...verb];
    case 'hide':
      return [...subj, ...verb, ...conn, ...rest, ...nf];
    case 'late':
      return [...subj, ...conn, ...rest, ...nf, ...verb];
  }
}

export function joiner(connector: Connector): string {
  return connector.cls === 'konnektivpartikel' ? '. ' : ', ';
}

const capitalise = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/** Clause B tokens as displayed: capitalised when they start a new sentence. */
export function displayTokens(s: Sentence, tokens: readonly Token[]): Token[] {
  const newSentence = joiner(findConnector(s.connector)) === '. ';
  return tokens.map((t, i) => (i === 0 && newSentence ? { ...t, text: capitalise(t.text) } : t));
}

export function renderSentence(s: Sentence, tokens: readonly Token[]): string {
  const b = displayTokens(s, tokens)
    .map((t) => t.text)
    .join(' ');
  return `${s.a}${joiner(findConnector(s.connector))}${b}.`;
}

export interface ChoiceOption {
  tokens: Token[];
  correct: boolean;
}

export interface ConnItem {
  cellId: string;
  stage: number;
  connector: Connector;
  sentence: Sentence;
  /** The canonical correct order, shown in feedback. */
  correct: Token[];
  /** Every accepted order, as word sequences. */
  accepted: string[][];
  options: ChoiceOption[];
  tiles: string[];
}

export const STAGE_NAMES = ['sort', 'choose', 'build'] as const;

export function allCells(selection: FilterSelection = {}): string[] {
  const classes = selection.cls ?? CONNECTOR_CLASSES;
  return CONNECTORS.filter((c) => classes.includes(c.cls)).map((c) => c.word);
}

export function cellLabel(id: string): string {
  const c = findConnector(id);
  return `${c.word} (${CLASS_INFO[c.cls].name})`;
}

const MAX_OPTIONS = 4;

export function generate(id: string, stage: number, rng: Rng): ConnItem {
  const connector = findConnector(id);
  const sentence = pick(
    SENTENCES.filter((s) => s.connector === id),
    rng,
  );
  const accepted = acceptedPatterns(connector);
  const correct = orderClauseB(sentence, accepted[0] as Pattern);
  const wrong = shuffle(distractorPatterns(connector), rng).slice(0, MAX_OPTIONS - 1);
  const options = shuffle(
    [
      { tokens: correct, correct: true },
      ...wrong.map((p) => ({ tokens: orderClauseB(sentence, p), correct: false })),
    ],
    rng,
  );
  const tiles = shuffle(
    correct.map((t) => t.text),
    rng,
  );

  return {
    cellId: id,
    stage,
    connector,
    sentence,
    correct,
    accepted: accepted.map((p) => orderClauseB(sentence, p).map((t) => t.text)),
    options,
    tiles,
  };
}

export function checkBuilt(item: ConnItem, built: readonly string[]): boolean {
  return item.accepted.some((order) => order.length === built.length && order.every((w, i) => w === built[i]));
}
