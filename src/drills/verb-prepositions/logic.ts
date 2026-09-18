import { declineArticle } from '../../grammar/articles';
import {
  PREPS,
  VERB_CASES,
  VERB_PREPS,
  VP_SETS,
  findVerbPrep,
  gapPhrase,
  splitGap,
  vpId,
  type Prep,
  type VerbCase,
  type VerbPrep,
  type VpSentence,
} from '../../grammar/verb-prepositions';
import { pick, shuffle, type Rng } from '../../util/rng';
import type { FilterSelection } from '../drill';

export const DRILL_ID = 'verb-prepositions';

export const STAGE_NAMES = ['choose', 'type', 'prep + case'] as const;

const CASE_SHORT: Record<VerbCase, string> = { akk: 'Akk', dat: 'Dat' };

export interface VpItem {
  cellId: string;
  stage: number;
  entry: VerbPrep;
  sentence: VpSentence;
  /** Sentence text around the gap. */
  before: string;
  after: string;
  /** The article in the right case: shown at choose and type, asked at prep + case. */
  article: string;
  /** The canonical gap: "auf den". */
  answer: string;
  /** Four prepositions for the choose stage, exactly one of them accepted. */
  options: Prep[];
}

export function allCells(selection: FilterSelection = {}): string[] {
  const cases = selection.case ?? VERB_CASES;
  const sets = selection.set ?? VP_SETS;
  return VERB_PREPS.filter((e) => cases.includes(e.case) && sets.includes(e.set)).map(vpId);
}

export function cellLabel(id: string): string {
  const e = findVerbPrep(id);
  return `${e.verb} ${e.prep} + ${CASE_SHORT[e.case]}`;
}

/** The cell's own preposition first, then its interchangeable one. */
export function acceptedPreps(e: VerbPrep): { prep: Prep; case: VerbCase }[] {
  return [{ prep: e.prep, case: e.case }, ...(e.also ? [e.also] : [])];
}

/** Prepositions the same verb takes with another meaning (freuen auf → über). */
export function siblingPreps(e: VerbPrep): Prep[] {
  const accepted = acceptedPreps(e).map((a) => a.prep);
  return VERB_PREPS.filter((x) => x.verb === e.verb && !accepted.includes(x.prep)).map((x) => x.prep);
}

const OPTIONS = 4;

export function generate(id: string, stage: number, rng: Rng): VpItem {
  const entry = findVerbPrep(id);
  const sentence = pick(entry.sentences, rng);
  const [before, after] = splitGap(sentence.de);
  const accepted = acceptedPreps(entry).map((a) => a.prep);
  const siblings = siblingPreps(entry);
  const others = shuffle(
    PREPS.filter((p) => !accepted.includes(p) && !siblings.includes(p)),
    rng,
  );
  const wrong = [...siblings, ...others].slice(0, OPTIONS - 1);

  return {
    cellId: id,
    stage,
    entry,
    sentence,
    before,
    after,
    article: declineArticle(sentence.det, entry.case, sentence.gender),
    answer: gapPhrase(sentence, entry.prep, entry.case),
    options: shuffle([entry.prep, ...wrong], rng),
  };
}

/** Trimmed, lower-case, single spaces. */
export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * type: the preposition alone. Only the cell's own one, because the article on screen
 * already fixes the case (von ihrer Reise, never über ihrer).
 * prep + case: preposition and article; an interchangeable preposition counts with its own case.
 */
export function checkAnswer(item: VpItem, answer: string): boolean {
  const a = normalizeAnswer(answer);
  if (item.stage < 2) return a === item.entry.prep;
  return acceptedPreps(item.entry).some((p) => a === gapPhrase(item.sentence, p.prep, p.case));
}
