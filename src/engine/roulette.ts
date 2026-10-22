import { type Coverage, ROULETTE_PAYOUT, type RouletteTableConfig } from '../config/roulette';
import { CURRENCY, formatMoney } from '../config/tables';

/** European single-zero wheel, clockwise from zero. */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12,
  35, 3, 26,
];

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type NumberColor = 'red' | 'black' | 'green';

export const numberColor = (n: number): NumberColor => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black');

export type BetKind =
  | 'straight'
  | 'split'
  | 'street'
  | 'trio'
  | 'corner'
  | 'firstFour'
  | 'line'
  | 'dozen'
  | 'column'
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'low'
  | 'high';

export interface RouletteBet {
  key: string;
  kind: BetKind;
  numbers: number[];
}

export const OUTSIDE_KINDS: BetKind[] = ['dozen', 'column', 'red', 'black', 'odd', 'even', 'low', 'high'];
export const isOutside = (bet: RouletteBet) => OUTSIDE_KINDS.includes(bet.kind);

export const coverage = (bet: RouletteBet) => bet.numbers.length as Coverage;
export const payoutOdds = (bet: RouletteBet) => ROULETTE_PAYOUT[coverage(bet)];

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function insideBet(kind: BetKind, numbers: number[]): RouletteBet {
  const sorted = [...numbers].sort((a, b) => a - b);
  return { key: `${kind}:${sorted.join('-')}`, kind, numbers: sorted };
}

export const OUTSIDE_BETS: Record<string, RouletteBet> = Object.fromEntries(
  (
    [
      ['dozen1', 'dozen', range(1, 12)],
      ['dozen2', 'dozen', range(13, 24)],
      ['dozen3', 'dozen', range(25, 36)],
      ['column1', 'column', range(0, 11).map((c) => 3 * c + 1)],
      ['column2', 'column', range(0, 11).map((c) => 3 * c + 2)],
      ['column3', 'column', range(0, 11).map((c) => 3 * c + 3)],
      ['low', 'low', range(1, 18)],
      ['high', 'high', range(19, 36)],
      ['even', 'even', range(1, 36).filter((n) => n % 2 === 0)],
      ['odd', 'odd', range(1, 36).filter((n) => n % 2 === 1)],
      ['red', 'red', range(1, 36).filter((n) => RED.has(n))],
      ['black', 'black', range(1, 36).filter((n) => !RED.has(n))],
    ] as const
  ).map(([key, kind, numbers]) => [key, { key, kind, numbers: [...numbers] }]),
);

export const straightBet = (n: number) => insideBet('straight', [n]);

/*
 * Board coordinates for inside bets. The number grid is 12 columns (u: 0–12) by 3 rows (v: 0–3);
 * row 0 holds 3, 6, … 36, row 2 holds 1, 4, … 34. Zero sits left of u = 0. In the usual horizontal
 * layout u runs left→right and v top→bottom; the mobile layout just rotates this.
 */
const numAt = (c: number, r: number) => 3 * c + 3 - r;
const EDGE = 0.22;

/** Inside bet for a point on the number grid (u may dip below 0 into the zero box). */
export function insideBetAt(u: number, v: number): RouletteBet {
  if (u < -EDGE) return straightBet(0);
  u = Math.max(0, Math.min(12 - 1e-9, u));
  v = Math.max(0, Math.min(3, v));
  const c = Math.min(11, Math.floor(u));
  const r = Math.min(2, Math.floor(v));
  const fu = u - c;
  const fv = v - r;

  // Boundary indexes: bu = column line (0 = zero line), bv = row line (3 = bottom edge → streets/lines).
  let bu: number | null = fu < EDGE ? c : fu > 1 - EDGE ? c + 1 : null;
  let bv: number | null = fv < EDGE ? r : fv > 1 - EDGE ? r + 1 : null;
  if (bu === 12) bu = null;
  if (bv === 0) bv = null;

  if (bu === null && bv === null) return straightBet(numAt(c, r));
  if (bu === null) {
    if (bv === 3) return insideBet('street', [numAt(c, 2), numAt(c, 1), numAt(c, 0)]);
    return insideBet('split', [numAt(c, bv! - 1), numAt(c, bv!)]);
  }
  if (bv === null) {
    if (bu === 0) return insideBet('split', [0, numAt(0, r)]);
    return insideBet('split', [numAt(bu - 1, r), numAt(bu, r)]);
  }
  if (bu === 0) {
    if (bv === 3) return insideBet('firstFour', [0, 1, 2, 3]);
    return insideBet('trio', [0, numAt(0, bv - 1), numAt(0, bv)]);
  }
  if (bv === 3) return insideBet('line', [...range(3 * (bu - 1) + 1, 3 * bu + 3)]);
  return insideBet('corner', [numAt(bu - 1, bv - 1), numAt(bu, bv - 1), numAt(bu - 1, bv), numAt(bu, bv)]);
}

/** Grid position of a number's cell centre (zero: u = -0.5, v = 1.5). */
function numberUV(n: number) {
  if (n === 0) return { u: -0.5, v: 1.5 };
  const c = Math.floor((n - 1) / 3);
  return { u: c + 0.5, v: 3 - (n - 3 * c) + 0.5 };
}

/** Where an inside bet's chips sit, in grid coordinates. */
export function insideAnchor(bet: RouletteBet): { u: number; v: number } {
  if (bet.kind === 'firstFour') return { u: 0, v: 3 };
  const pts = bet.numbers.filter((n) => n !== 0).map(numberUV);
  const avg = (k: 'u' | 'v') => pts.reduce((s, p) => s + p[k], 0) / pts.length;
  if (bet.kind === 'straight') return numberUV(bet.numbers[0]);
  if (bet.numbers.includes(0)) return { u: 0, v: avg('v') };
  if (bet.kind === 'street' || bet.kind === 'line') return { u: avg('u'), v: 3 };
  return { u: avg('u'), v: avg('v') };
}

export interface RouletteSettlement {
  number: number;
  /** Keys of the bets that won. */
  winners: string[];
  totalStake: number;
  totalReturned: number;
  net: number;
}

export function settleSpin(bets: Record<string, number>, defs: Record<string, RouletteBet>, number: number): RouletteSettlement {
  let totalStake = 0;
  let totalReturned = 0;
  const winners: string[] = [];
  for (const [key, stake] of Object.entries(bets)) {
    if (stake <= 0) continue;
    totalStake += stake;
    const bet = defs[key];
    if (bet.numbers.includes(number)) {
      winners.push(key);
      totalReturned += stake * (payoutOdds(bet) + 1);
    }
  }
  return { number, winners, totalStake, totalReturned, net: totalReturned - totalStake };
}

const KIND_LABEL: Record<BetKind, string> = {
  straight: '스트레이트',
  split: '스플릿',
  street: '스트리트',
  trio: '트리오',
  corner: '코너',
  firstFour: '퍼스트 포',
  line: '라인',
  dozen: '더즌',
  column: '컬럼',
  red: 'RED',
  black: 'BLACK',
  odd: 'ODD',
  even: 'EVEN',
  low: '1-18',
  high: '19-36',
};

export function betLabel(bet: RouletteBet) {
  return isOutside(bet) ? KIND_LABEL[bet.kind] : `${KIND_LABEL[bet.kind]} ${bet.numbers.join('·')}`;
}

/** Checks adding `amount` to `bet`. Returns an error message, or null if allowed. */
export function checkRouletteAdd(table: RouletteTableConfig, current: number, bet: RouletteBet, amount: number, available: number): string | null {
  if (amount > available) return '칩이 부족합니다';
  const max = table.max[coverage(bet)];
  if (current + amount > max) return `${betLabel(bet)} 최대 베팅은 ${CURRENCY} ${formatMoney(max)} 입니다`;
  return null;
}

/** Bets that break a table minimum when the wheel spins: under-minimum outside bets, or all inside bets if their total is short. */
export function rouletteBelowMinimum(table: RouletteTableConfig, bets: Record<string, number>, defs: Record<string, RouletteBet>) {
  const keys = Object.keys(bets).filter((k) => bets[k] > 0);
  const inside = keys.filter((k) => !isOutside(defs[k]));
  const insideTotal = inside.reduce((s, k) => s + bets[k], 0);
  const out: string[] = [];
  if (insideTotal > 0 && insideTotal < table.insideMinTotal) out.push(...inside);
  out.push(...inside.filter((k) => !out.includes(k) && bets[k] < table.insideMinPerSpot));
  out.push(...keys.filter((k) => isOutside(defs[k]) && bets[k] < table.outsideMin));
  return out;
}

export interface SpinStats {
  count: number;
  red: number;
  black: number;
  zero: number;
  odd: number;
  even: number;
  low: number;
  high: number;
  dozens: [number, number, number];
  hot: number[];
  cold: number[];
}

/** Scoreboard stats over the most recent results (newest last). */
export function spinStats(results: number[], window = 100): SpinStats {
  const recent = results.slice(-window);
  const freq = new Map<number, number>(range(0, 36).map((n) => [n, 0]));
  for (const n of recent) freq.set(n, freq.get(n)! + 1);
  const byFreq = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const count = (f: (n: number) => boolean) => recent.filter(f).length;
  return {
    count: recent.length,
    red: count((n) => numberColor(n) === 'red'),
    black: count((n) => numberColor(n) === 'black'),
    zero: count((n) => n === 0),
    odd: count((n) => n > 0 && n % 2 === 1),
    even: count((n) => n > 0 && n % 2 === 0),
    low: count((n) => n >= 1 && n <= 18),
    high: count((n) => n >= 19),
    dozens: [count((n) => n >= 1 && n <= 12), count((n) => n >= 13 && n <= 24), count((n) => n >= 25)],
    hot: recent.length ? byFreq.slice(0, 4).map(([n]) => n) : [],
    cold: recent.length ? byFreq.slice(-4).reverse().map(([n]) => n) : [],
  };
}
