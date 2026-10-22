import { describe, expect, it } from 'vitest';
import { emptyBets } from '../config/tables';
import { bankerDraws, type HandResult, playHand } from './baccarat';
import type { Card } from './cards';
import { settle } from './payout';
import { askRoad, bigRoadEntries, derivedRoad, placeOnGrid } from './roads';
import { createShoe } from './shoe';

const card = (value: number, suit: Card['suit'] = 'S'): Card => ({ rank: value === 0 ? 13 : value, suit, id: 0 });

function handFrom(values: number[]): HandResult {
  let i = 0;
  return playHand(() => card(values[i++]));
}

describe('third-card rule', () => {
  it('stands on naturals', () => {
    const h = handFrom([8, 3, 0, 0]);
    expect(h.natural).toBe(true);
    expect(h.player).toHaveLength(2);
    expect(h.banker).toHaveLength(2);
    expect(h.outcome).toBe('P');
  });

  it('player draws on 0–5, banker 3 stands only against an 8', () => {
    const h = handFrom([2, 1, 3, 2, 8]); // P 5 draws 8 → 3; B 3 stands vs 8
    expect(h.player).toHaveLength(3);
    expect(h.banker).toHaveLength(2);
    expect(h.outcome).toBe('T');
  });

  it('banker draws on 0–5 when the player stands', () => {
    const h = handFrom([3, 2, 3, 3, 1]); // P 6 stands, B 5 draws
    expect(h.player).toHaveLength(2);
    expect(h.banker).toHaveLength(3);
  });

  it('matches the full tableau', () => {
    expect(bankerDraws(6, 6)).toBe(true);
    expect(bankerDraws(6, 5)).toBe(false);
    expect(bankerDraws(5, 4)).toBe(true);
    expect(bankerDraws(5, 3)).toBe(false);
    expect(bankerDraws(4, 1)).toBe(false);
    expect(bankerDraws(4, 2)).toBe(true);
    expect(bankerDraws(7, null)).toBe(false);
  });
});

describe('exact 8-deck probabilities', () => {
  // Enumerates every coup without replacement, weighted by the shoe's composition.
  function enumerate() {
    const counts = [128, 32, 32, 32, 32, 32, 32, 32, 32, 32];
    const p = { B: 0, P: 0, T: 0, B6: 0 };
    const need = Symbol('need');

    const explore = (prefix: number[], weight: number, left: number) => {
      let i = 0;
      let hand: HandResult;
      try {
        hand = playHand(() => {
          if (i >= prefix.length) throw need;
          return card(prefix[i++]);
        });
      } catch (e) {
        if (e !== need) throw e;
        for (let v = 0; v < 10; v++) {
          if (counts[v] === 0) continue;
          const w = weight * (counts[v] / left);
          counts[v]--;
          explore([...prefix, v], w, left - 1);
          counts[v]++;
        }
        return;
      }
      p[hand.outcome] += weight;
      if (hand.outcome === 'B' && hand.bankerTotal === 6) p.B6 += weight;
    };
    explore([], 1, 416);
    return p;
  }

  it('gives the published outcome probabilities and house edges', () => {
    const p = enumerate();
    expect(p.B).toBeCloseTo(0.458597, 5);
    expect(p.P).toBeCloseTo(0.446247, 5);
    expect(p.T).toBeCloseTo(0.095156, 5);

    const noCommBankerEdge = -((p.B - p.B6) + p.B6 * 0.5 - p.P);
    expect(noCommBankerEdge).toBeCloseTo(0.0146, 3);
    const playerEdge = -(p.P - p.B);
    expect(playerEdge).toBeCloseTo(0.0124, 3);
  });
});

describe('payouts', () => {
  const bets = { ...emptyBets(), banker: 1000, tie: 100, super6: 100 };

  it('pays half on a banker 6 in no-commission mode, plus Super 6', () => {
    const h = handFrom([0, 3, 2, 3, 0]); // P 2 draws 0 → 2, B 6 stands vs 0
    expect(h.outcome).toBe('B');
    expect(h.bankerTotal).toBe(6);
    const s = settle(bets, h, 'no-commission');
    expect(s.spots.find((x) => x.spot === 'banker')?.profit).toBe(500);
    expect(s.spots.find((x) => x.spot === 'super6')?.profit).toBe(1200);
    expect(s.net).toBe(500 + 1200 - 100);
  });

  it('takes 5% commission in commission mode', () => {
    const h = handFrom([2, 3, 0, 5]);
    const s = settle({ ...emptyBets(), banker: 1000 }, h, 'commission');
    expect(s.net).toBe(950);
  });

  it('pushes main bets on a tie', () => {
    const h = handFrom([2, 1, 3, 2, 8]);
    const s = settle({ ...emptyBets(), player: 500, tie: 100 }, h, 'no-commission');
    expect(s.spots.find((x) => x.spot === 'player')?.result).toBe('push');
    expect(s.net).toBe(800);
  });
});

describe('roads', () => {
  it('builds a dragon tail', () => {
    const placed = placeOnGrid(Array(8).fill('B'), (a, b) => a === b);
    expect(placed.map((p) => [p.col, p.row])).toEqual([
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 5], [2, 5],
    ]);
  });

  it('attaches ties to the previous result', () => {
    const e = bigRoadEntries([
      { outcome: 'T', playerPair: false, bankerPair: false, total: 0 },
      { outcome: 'B', playerPair: false, bankerPair: false, total: 0 },
      { outcome: 'T', playerPair: false, bankerPair: false, total: 0 },
      { outcome: 'T', playerPair: false, bankerPair: false, total: 0 },
      { outcome: 'P', playerPair: false, bankerPair: false, total: 0 },
    ]);
    expect(e.map((x) => [x.outcome, x.ties])).toEqual([['B', 3], ['P', 0]]);
  });

  it('computes derived roads', () => {
    const seq: ('B' | 'P')[] = ['B', 'B', 'P', 'P', 'P', 'B'];
    expect(derivedRoad(seq, 1)).toEqual(['R', 'U', 'U']);
    expect(derivedRoad(seq, 2)).toEqual([]);
    expect(askRoad(seq, 'B')[0]).toBe('R');
  });
});

describe('shoe', () => {
  it('burns per the exposed card and places the cut card near the back', () => {
    const shoe = createShoe();
    expect(shoe.cards).toHaveLength(416);
    expect(shoe.pos).toBe(1 + shoe.burnCount);
    expect(shoe.cards.length - shoe.cutIndex).toBeGreaterThanOrEqual(14);
    expect(shoe.cards.length - shoe.cutIndex).toBeLessThanOrEqual(20);
  });
});
