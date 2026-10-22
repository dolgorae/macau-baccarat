import { describe, expect, it } from 'vitest';
import { ROULETTE_TABLES } from '../config/roulette';
import {
  insideAnchor,
  insideBetAt,
  numberColor,
  OUTSIDE_BETS,
  payoutOdds,
  type RouletteBet,
  rouletteBelowMinimum,
  settleSpin,
  spinStats,
  straightBet,
  WHEEL_ORDER,
} from './roulette';

describe('wheel', () => {
  it('has every number once', () => {
    expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i));
  });

  it('alternates red and black around the wheel', () => {
    for (let i = 1; i < WHEEL_ORDER.length - 1; i++) {
      expect(numberColor(WHEEL_ORDER[i])).not.toBe(numberColor(WHEEL_ORDER[i + 1]));
    }
  });
});

describe('board hit-testing', () => {
  const at = (u: number, v: number) => insideBetAt(u, v);

  it('maps cell centres to straight-ups', () => {
    expect(at(0.5, 2.5).numbers).toEqual([1]);
    expect(at(0.5, 0.5).numbers).toEqual([3]);
    expect(at(11.5, 0.5).numbers).toEqual([36]);
    expect(at(-0.6, 1.5).numbers).toEqual([0]);
  });

  it('maps lines and corners to split, street, corner and line bets', () => {
    expect(at(0.95, 2.5)).toMatchObject({ kind: 'split', numbers: [1, 4] });
    expect(at(0.5, 1.95)).toMatchObject({ kind: 'split', numbers: [1, 2] });
    expect(at(0.5, 2.95)).toMatchObject({ kind: 'street', numbers: [1, 2, 3] });
    expect(at(1.0, 2.0)).toMatchObject({ kind: 'corner', numbers: [1, 2, 4, 5] });
    expect(at(1.0, 3.0)).toMatchObject({ kind: 'line', numbers: [1, 2, 3, 4, 5, 6] });
  });

  it('handles the zero line', () => {
    expect(at(0.05, 0.5)).toMatchObject({ kind: 'split', numbers: [0, 3] });
    expect(at(-0.1, 2.0)).toMatchObject({ kind: 'trio', numbers: [0, 1, 2] });
    expect(at(0.0, 1.0)).toMatchObject({ kind: 'trio', numbers: [0, 2, 3] });
    expect(at(0.0, 3.0)).toMatchObject({ kind: 'firstFour', numbers: [0, 1, 2, 3] });
  });

  it('anchors chips where the bet was placed', () => {
    expect(insideAnchor(at(1.0, 2.0))).toEqual({ u: 1, v: 2 });
    expect(insideAnchor(at(0.5, 2.95))).toEqual({ u: 0.5, v: 3 });
    expect(insideAnchor(at(0.0, 1.0))).toEqual({ u: 0, v: 1 });
  });
});

describe('payouts', () => {
  // Every point on the board, sampled finely, gives a bet whose expected return is -1/37.
  it('gives every bet the single-zero house edge of 2.70%', () => {
    const bets: RouletteBet[] = [...Object.values(OUTSIDE_BETS)];
    for (let u = -0.6; u < 12; u += 0.05) for (let v = 0; v <= 3; v += 0.05) bets.push(insideBetAt(u, v));
    const kinds = new Set(bets.map((b) => b.kind));
    expect(kinds.size).toBe(15);
    for (const bet of bets) {
      const ev = (bet.numbers.length / 37) * (payoutOdds(bet) + 1) - 1;
      expect(ev).toBeCloseTo(-1 / 37, 10);
    }
  });

  it('settles a spin', () => {
    const corner = insideBetAt(1, 2);
    const defs = { [corner.key]: corner, red: OUTSIDE_BETS.red, [straightBet(5).key]: straightBet(5) };
    const s = settleSpin({ [corner.key]: 100, red: 200, [straightBet(5).key]: 50 }, defs, 5);
    expect(s.winners.sort()).toEqual([corner.key, 'red', straightBet(5).key].sort());
    expect(s.totalReturned).toBe(900 + 400 + 1800);
    expect(settleSpin({ red: 200 }, defs, 0).net).toBe(-200);
  });
});

describe('table minimums', () => {
  const table = ROULETTE_TABLES[0];
  it('returns inside bets below the inside total and short outside bets', () => {
    const s = straightBet(7);
    const defs = { [s.key]: s, red: OUTSIDE_BETS.red };
    expect(rouletteBelowMinimum(table, { [s.key]: 50, red: 100 }, defs)).toEqual([s.key]);
    expect(rouletteBelowMinimum(table, { [s.key]: 100, red: 50 }, defs)).toEqual(['red']);
    expect(rouletteBelowMinimum(table, { [s.key]: 100, red: 100 }, defs)).toEqual([]);
  });
});

describe('stats', () => {
  it('counts colours and hot numbers', () => {
    const st = spinStats([0, 1, 1, 2, 32]);
    expect(st).toMatchObject({ count: 5, red: 3, black: 1, zero: 1 });
    expect(st.hot[0]).toBe(1);
  });
});
