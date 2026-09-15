import { describe, expect, it } from 'vitest';
import {
  acceptedPatterns,
  allCells,
  checkBuilt,
  distractorPatterns,
  generate,
  orderClauseB,
  renderSentence,
} from '../src/drills/connector-position/logic';
import { CONNECTORS, findConnector } from '../src/grammar/connectors';
import { SENTENCES } from '../src/grammar/sentences';
import { seededRng } from '../src/util/rng';

const sortedWords = (xs: readonly { text: string }[]) => xs.map((t) => t.text).sort().join(' ');

describe('sentence bank', () => {
  it('every connector has at least 2 sentences, and every sentence has a known connector', () => {
    for (const c of CONNECTORS) {
      expect(SENTENCES.filter((s) => s.connector === c.word).length, c.word).toBeGreaterThanOrEqual(2);
    }
    for (const s of SENTENCES) expect(() => findConnector(s.connector)).not.toThrow();
  });

  it('clause B always has something between subject and verb-final position', () => {
    for (const s of SENTENCES) expect(`${s.rest}${s.nonfinite ?? ''}`.trim(), s.a).not.toBe('');
  });

  it('no distractor renders the same as an accepted order', () => {
    for (const s of SENTENCES) {
      const c = findConnector(s.connector);
      const ok = acceptedPatterns(c).map((p) => renderSentence(s, orderClauseB(s, p)));
      for (const p of distractorPatterns(c)) {
        expect(ok, `${s.connector}: ${p}`).not.toContain(renderSentence(s, orderClauseB(s, p)));
      }
    }
  });

  it('renders the canonical examples from the reference sheet', () => {
    const find = (conn: string, a: string) => SENTENCES.find((s) => s.connector === conn && s.a === a)!;
    const render = (conn: string, a: string) => {
      const s = find(conn, a);
      return renderSentence(s, orderClauseB(s, acceptedPatterns(findConnector(conn))[0]!));
    };
    expect(render('weil', 'Ich komme nicht mit')).toBe('Ich komme nicht mit, weil ich krank bin.');
    expect(render('denn', 'Ich komme nicht mit')).toBe('Ich komme nicht mit, denn ich bin krank.');
    expect(render('deshalb', 'Ich bin krank')).toBe('Ich bin krank, deshalb bleibe ich heute zu Hause.');
    expect(render('nämlich', 'Ich komme nicht mit')).toBe('Ich komme nicht mit. Ich bin nämlich krank.');
    expect(render('weil', 'Sie lernt Deutsch')).toBe('Sie lernt Deutsch, weil sie in Wien studieren will.');
  });
});

describe('connector drill items', () => {
  it('has one cell per connector, filterable by class', () => {
    expect(allCells()).toHaveLength(CONNECTORS.length);
    expect(allCells({ cls: ['konnektivpartikel'] })).toEqual(['nämlich']);
  });

  it('1000 random items are well-formed', () => {
    const rng = seededRng(99);
    const cells = allCells();
    for (let i = 0; i < 1000; i++) {
      const id = cells[Math.floor(rng() * cells.length)]!;
      const item = generate(id, i % 3, rng);

      // choose: distinct, exactly one correct, at least 3 options, identical word sets
      const rendered = item.options.map((o) => renderSentence(item.sentence, o.tokens));
      expect(new Set(rendered).size, id).toBe(rendered.length);
      expect(item.options.filter((o) => o.correct)).toHaveLength(1);
      expect(item.options.length, id).toBeGreaterThanOrEqual(3);
      const words = sortedWords(item.correct);
      for (const o of item.options) expect(sortedWords(o.tokens)).toBe(words);

      // build: the tiles in the canonical order are accepted; tiles are the same words
      expect(item.tiles.slice().sort().join(' ')).toBe(words);
      expect(checkBuilt(item, item.correct.map((t) => t.text))).toBe(true);
      expect(renderSentence(item.sentence, item.correct)).not.toMatch(/undefined|\s\s|\s[.,]/);
    }
  });

  it('accepts both correct orders for an Adverbkonnektor and rejects the others', () => {
    const item = generate('deshalb', 2, seededRng(3));
    const s = item.sentence;
    expect(checkBuilt(item, orderClauseB(s, 'invert').map((t) => t.text))).toBe(true);
    expect(checkBuilt(item, orderClauseB(s, 'hide').map((t) => t.text))).toBe(true);
    expect(checkBuilt(item, orderClauseB(s, 'inert').map((t) => t.text))).toBe(false);
    expect(checkBuilt(item, orderClauseB(s, 'kick').map((t) => t.text))).toBe(false);
  });
});
