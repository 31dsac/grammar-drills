/** The four classes from Grammar/reference/konnektoren.html (grammis). */
export type ConnectorClass = 'konjunktor' | 'adverbkonnektor' | 'subjunktor' | 'konnektivpartikel';

export const CONNECTOR_CLASSES: readonly ConnectorClass[] = [
  'konjunktor',
  'adverbkonnektor',
  'subjunktor',
  'konnektivpartikel',
];

export const CLASS_INFO: Record<ConnectorClass, { label: string; name: string; rule: string }> = {
  konjunktor: {
    label: 'Position 0: no change',
    name: 'Konjunktor',
    rule: 'Sits between the clauses without taking a slot. Subject, verb, rest: nothing moves.',
  },
  adverbkonnektor: {
    label: 'Position 1: verb comes next',
    name: 'Adverbkonnektor',
    rule: 'Takes the Vorfeld itself, so the finite verb comes straight after it and the subject moves behind the verb.',
  },
  subjunktor: {
    label: 'Verb to the end',
    name: 'Subjunktor',
    rule: 'Opens a subordinate clause and sends the finite verb to the end of that clause.',
  },
  konnektivpartikel: {
    label: 'After the verb, never first',
    name: 'Konnektivpartikel',
    rule: 'Cannot stand alone in the Vorfeld. It sits after the finite verb, in an ordinary main clause.',
  },
};

export interface Connector {
  word: string;
  cls: ConnectorClass;
  gloss: string;
}

export const CONNECTORS: readonly Connector[] = [
  { word: 'und', cls: 'konjunktor', gloss: 'and' },
  { word: 'oder', cls: 'konjunktor', gloss: 'or' },
  { word: 'aber', cls: 'konjunktor', gloss: 'but' },
  { word: 'denn', cls: 'konjunktor', gloss: 'because (for)' },
  { word: 'sondern', cls: 'konjunktor', gloss: 'but rather' },

  { word: 'deshalb', cls: 'adverbkonnektor', gloss: 'therefore' },
  { word: 'deswegen', cls: 'adverbkonnektor', gloss: 'that is why' },
  { word: 'darum', cls: 'adverbkonnektor', gloss: 'that is why' },
  { word: 'also', cls: 'adverbkonnektor', gloss: 'so' },
  { word: 'trotzdem', cls: 'adverbkonnektor', gloss: 'nevertheless' },
  { word: 'dennoch', cls: 'adverbkonnektor', gloss: 'nonetheless' },
  { word: 'dann', cls: 'adverbkonnektor', gloss: 'then' },
  { word: 'danach', cls: 'adverbkonnektor', gloss: 'afterwards' },
  { word: 'außerdem', cls: 'adverbkonnektor', gloss: 'besides' },
  { word: 'sonst', cls: 'adverbkonnektor', gloss: 'otherwise' },

  { word: 'weil', cls: 'subjunktor', gloss: 'because' },
  { word: 'da', cls: 'subjunktor', gloss: 'since (formal)' },
  { word: 'dass', cls: 'subjunktor', gloss: 'that' },
  { word: 'wenn', cls: 'subjunktor', gloss: 'if / whenever' },
  { word: 'ob', cls: 'subjunktor', gloss: 'whether' },
  { word: 'obwohl', cls: 'subjunktor', gloss: 'although' },
  { word: 'als', cls: 'subjunktor', gloss: 'when (once, past)' },
  { word: 'damit', cls: 'subjunktor', gloss: 'so that' },
  { word: 'während', cls: 'subjunktor', gloss: 'while' },
  { word: 'bevor', cls: 'subjunktor', gloss: 'before' },
  { word: 'nachdem', cls: 'subjunktor', gloss: 'after' },
  { word: 'falls', cls: 'subjunktor', gloss: 'in case' },
  { word: 'sobald', cls: 'subjunktor', gloss: 'as soon as' },

  { word: 'nämlich', cls: 'konnektivpartikel', gloss: 'you see / because' },
];

export function findConnector(word: string): Connector {
  const c = CONNECTORS.find((x) => x.word === word);
  if (!c) throw new Error(`Unknown connector: ${word}`);
  return c;
}
