import { DER_WORDS, EIN_WORDS, declineArticle, type ArticleWord } from '../../grammar/articles';
import { adjectiveEnding, explainEnding } from '../../grammar/endings';
import { ADJECTIVES, FRAMES, NOUNS, isMass, nounForm, type Frame, type Noun } from '../../grammar/lexicon';
import {
  ARTICLE_TYPES,
  ARTICLE_TYPE_NAMES,
  CASES,
  CASE_NAMES,
  GENDERS,
  GENDER_NAMES,
  type ArticleType,
  type Case,
  type Ending,
  type Gender,
} from '../../grammar/types';
import { pick, type Rng } from '../../util/rng';
import type { FilterSelection } from '../drill';

export const DRILL_ID = 'adjective-endings';

export interface CellKey {
  type: ArticleType;
  case: Case;
  gender: Gender;
}

export interface AdjItem {
  cellId: string;
  stage: number;
  key: CellKey;
  /** Words before the article, e.g. "mit" or "Das sind". */
  before: string;
  after: string;
  /** Empty string when there is no article word. */
  article: string;
  stem: string;
  ending: Ending;
  noun: string;
  /** Dictionary form with article, for the hint: "die Milch". */
  nounHint: string;
  trigger: string;
  explanation: string;
}

export function cellId(k: CellKey): string {
  return `${k.type}|${k.case}|${k.gender}`;
}

export function parseCellId(id: string): CellKey {
  const [type, c, gender] = id.split('|');
  if (
    !ARTICLE_TYPES.includes(type as ArticleType) ||
    !CASES.includes(c as Case) ||
    !GENDERS.includes(gender as Gender)
  ) {
    throw new Error(`Bad adjective cell id: ${id}`);
  }
  return { type: type as ArticleType, case: c as Case, gender: gender as Gender };
}

export function allCells(selection: FilterSelection = {}): string[] {
  const types = selection.type ?? ARTICLE_TYPES;
  const cases = selection.case ?? CASES;
  const out: string[] = [];
  for (const type of ARTICLE_TYPES) {
    if (!types.includes(type)) continue;
    for (const c of CASES) {
      if (!cases.includes(c)) continue;
      for (const gender of GENDERS) out.push(cellId({ type, case: c, gender }));
    }
  }
  return out;
}

export function cellLabel(id: string): string {
  const k = parseCellId(id);
  return `${CASE_NAMES[k.case]} · ${GENDER_NAMES[k.gender]} · ${ARTICLE_TYPE_NAMES[k.type]}`;
}

function nounFits(noun: Noun, k: CellKey): boolean {
  if (k.gender === 'pl') return !isMass(noun);
  if (noun.gender !== k.gender) return false;
  // Without an article word, singular count nouns sound wrong (*mit kleinem Kind*).
  return k.type === 'none' ? isMass(noun) : true;
}

function articleWords(noun: Noun, k: CellKey): readonly ArticleWord[] {
  if (k.type === 'definite') return DER_WORDS;
  if (k.type === 'none') return [];
  if (k.gender === 'pl') return EIN_WORDS.filter((w) => w !== 'ein');
  // *ein warmes Wasser*, *mein starker Regen*: mass nouns only take kein.
  return isMass(noun) ? ['kein'] : EIN_WORDS;
}

type Candidate = { frame: Frame; noun: Noun };
const candidateCache = new Map<string, Candidate[]>();

export function candidates(k: CellKey): Candidate[] {
  const id = cellId(k);
  const cached = candidateCache.get(id);
  if (cached) return cached;
  const out: Candidate[] = [];
  for (const frame of FRAMES) {
    if (frame.case !== k.case) continue;
    for (const noun of NOUNS) {
      if (!nounFits(noun, k) || !frame.kinds.includes(noun.kind)) continue;
      if (!ADJECTIVES.some((a) => a.kinds.includes(noun.kind))) continue;
      out.push({ frame, noun });
    }
  }
  candidateCache.set(id, out);
  return out;
}

const DER_FOR_HINT = { m: 'der', f: 'die', n: 'das' } as const;

export function generate(id: string, stage: number, rng: Rng): AdjItem {
  const key = parseCellId(id);
  const pool = candidates(key);
  if (pool.length === 0) throw new Error(`No lexicon combination for ${id}`);
  const { frame, noun } = pick(pool, rng);
  const adjective = pick(
    ADJECTIVES.filter((a) => a.kinds.includes(noun.kind)),
    rng,
  );
  const plural = key.gender === 'pl';
  const words = articleWords(noun, key);
  const article = words.length === 0 ? '' : declineArticle(pick(words, rng), key.case, key.gender);

  return {
    cellId: id,
    stage,
    key,
    before: plural && frame.beforePl ? frame.beforePl : frame.before,
    after: frame.after ?? '',
    article,
    stem: adjective.stem,
    ending: adjectiveEnding(key.type, key.case, key.gender),
    noun: nounForm(noun, key.case, plural),
    nounHint: plural ? `die ${noun.pl}` : `${DER_FOR_HINT[noun.gender]} ${noun.base}`,
    trigger: frame.trigger,
    explanation: explainEnding(key.type, key.case, key.gender),
  };
}

/** Typed answers: case/whitespace-insensitive; "-en", "en" and "kleinen" all accepted. */
export function checkTyped(item: AdjItem, answer: string): boolean {
  const a = answer.trim().toLowerCase().replace(/^-/, '');
  return a === item.ending || a === (item.stem + item.ending).toLowerCase();
}

export function phrase(item: AdjItem, adjective: string): string {
  const np = [item.article, adjective, item.noun].filter(Boolean).join(' ');
  return `${item.before} ${np}${item.after}`;
}
