import { create } from 'zustand';
import { sfx } from '../audio/sfx';
import { ROULETTE_TABLES, type RouletteTableConfig } from '../config/roulette';
import { CURRENCY, formatMoney } from '../config/tables';
import { randomInt } from '../engine/rng';
import {
  betLabel,
  checkRouletteAdd,
  numberColor,
  type RouletteBet,
  rouletteBelowMinimum,
  type RouletteSettlement,
  settleSpin,
} from '../engine/roulette';
import { useGame } from './game';

export type RoulettePhase = 'betting' | 'spinning' | 'result';

/** How long the wheel turns before the ball drops. The wheel animation uses the same duration. */
export const SPIN_MS = 7000;
const RESULT_MS = 3800;

export interface SpinRecord {
  spinNo: number;
  number: number;
  stake: number;
  net: number;
}

interface RouletteState {
  table: RouletteTableConfig | null;
  /** Stakes by bet key. Chips stay counted in the player's stack until the wheel spins. */
  bets: Record<string, number>;
  defs: Record<string, RouletteBet>;
  betLog: { key: string; amount: number }[];
  lastBets: { bets: Record<string, number>; defs: Record<string, RouletteBet> } | null;
  selectedChip: number;
  phase: RoulettePhase;
  timeLeft: number;
  timerPaused: boolean;
  noBetStreak: number;
  message: string;
  /** Results this session, newest last. */
  results: number[];
  spin: { id: number; number: number } | null;
  settlement: RouletteSettlement | null;
  history: SpinRecord[];

  enter: (tableId: string, buyIn: number) => void;
  leave: () => void;
  selectChip: (value: number) => void;
  placeBet: (bet: RouletteBet) => void;
  removeBet: (key: string) => void;
  undo: () => void;
  clearBets: () => void;
  rebet: () => void;
  doubleBets: () => void;
  spinWheel: () => void;
  tick: () => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sum = (bets: Record<string, number>) => Object.values(bets).reduce((s, v) => s + v, 0);
let spinId = 0;

/** Chips the player can still put down (stack minus what is already on the layout). */
export const availableChips = (stack: number, bets: Record<string, number>) => stack - sum(bets);
export const totalRouletteBet = sum;

export const useRoulette = create<RouletteState>()((set, get) => {
  const game = () => useGame.getState();

  const openBetting = () =>
    set({ phase: 'betting', timeLeft: game().settings.timerSeconds, message: 'Place your bets', settlement: null });

  const runSpin = async () => {
    const { table } = get();
    if (!table) return;

    const under = rouletteBelowMinimum(table, get().bets, get().defs);
    if (under.length) {
      const bets = { ...get().bets };
      for (const k of under) delete bets[k];
      set({ bets });
      game().notify(`미니멈 미만 베팅 반환: ${under.map((k) => betLabel(get().defs[k])).join(', ')}`);
    }

    const bets = get().bets;
    const stake = sum(bets);
    useGame.setState((s) => ({ stack: s.stack - stake, busy: true }));
    const number = randomInt(37);
    set((s) => ({
      phase: 'spinning',
      spin: { id: ++spinId, number },
      message: 'No more bets',
      betLog: [],
      noBetStreak: stake ? 0 : s.noBetStreak + 1,
    }));

    await sleep(SPIN_MS);

    const settlement = settleSpin(bets, get().defs, number);
    const color = numberColor(number);
    useGame.setState((s) => ({ stack: s.stack + settlement.totalReturned, busy: false }));
    game().recordPlay(stake);
    set((s) => ({
      phase: 'result',
      settlement,
      results: [...s.results, number].slice(-500),
      history: stake ? [{ spinNo: s.results.length + 1, number, stake, net: settlement.net }, ...s.history].slice(0, 200) : s.history,
      lastBets: stake ? { bets, defs: get().defs } : s.lastBets,
      message: `${number} ${color === 'red' ? 'RED' : color === 'black' ? 'BLACK' : 'ZERO'}`,
    }));
    if (settlement.net > 0) {
      sfx.win();
      game().notify(`+${CURRENCY} ${formatMoney(settlement.net)}`, 'win');
    }

    await sleep(RESULT_MS);
    if (game().screen !== 'roulette') return;
    set({ bets: {}, defs: {} });
    openBetting();
  };

  const addBets = (add: Record<string, number>, defs: Record<string, RouletteBet>) => {
    const { table, phase } = get();
    if (!table || phase !== 'betting') return;
    const next = { ...get().bets };
    let available = availableChips(game().stack, next);
    for (const [key, amount] of Object.entries(add)) {
      const err = checkRouletteAdd(table, next[key] ?? 0, defs[key], amount, available);
      if (err) return game().notify(err);
      next[key] = (next[key] ?? 0) + amount;
      available -= amount;
    }
    sfx.chip();
    set((s) => ({ bets: next, defs: { ...s.defs, ...defs }, betLog: [], noBetStreak: 0, timerPaused: false }));
  };

  return {
    table: null,
    bets: {},
    defs: {},
    betLog: [],
    lastBets: null,
    selectedChip: 100,
    phase: 'betting',
    timeLeft: 0,
    timerPaused: false,
    noBetStreak: 0,
    message: '',
    results: [],
    spin: null,
    settlement: null,
    history: [],

    enter: (tableId, buyIn) => {
      const table = ROULETTE_TABLES.find((t) => t.id === tableId);
      if (!table || buyIn < table.minBuyIn) return;
      game().enterRoulette(buyIn);
      // A fresh table shows the last few spins it has already run, like walking up to a live table.
      const results = Array.from({ length: 30 }, () => randomInt(37));
      set({
        table,
        bets: {},
        defs: {},
        betLog: [],
        lastBets: null,
        selectedChip: table.chips[1] ?? table.chips[0],
        timerPaused: false,
        noBetStreak: 0,
        results,
        spin: { id: ++spinId, number: results[results.length - 1] },
        settlement: null,
        history: [],
      });
      openBetting();
    },

    leave: () => {
      if (get().phase !== 'betting') return game().notify('스핀 중에는 자리를 뜰 수 없습니다');
      set({ bets: {}, defs: {}, table: null });
      game().leaveRoulette();
    },

    selectChip: (value) => set({ selectedChip: value }),

    placeBet: (bet) => {
      const { table, phase, bets, selectedChip } = get();
      if (!table || phase !== 'betting') return;
      const err = checkRouletteAdd(table, bets[bet.key] ?? 0, bet, selectedChip, availableChips(game().stack, bets));
      if (err) return game().notify(err);
      sfx.chip();
      set((s) => ({
        bets: { ...s.bets, [bet.key]: (s.bets[bet.key] ?? 0) + selectedChip },
        defs: { ...s.defs, [bet.key]: bet },
        betLog: [...s.betLog, { key: bet.key, amount: selectedChip }],
        noBetStreak: 0,
        timerPaused: false,
      }));
    },

    removeBet: (key) => {
      const { bets, selectedChip, phase } = get();
      if (phase !== 'betting' || !bets[key]) return;
      sfx.chip();
      const left = Math.max(0, bets[key] - selectedChip);
      const next = { ...bets, [key]: left };
      if (!left) delete next[key];
      set({ bets: next });
    },

    undo: () => {
      const { betLog, phase, bets } = get();
      const last = betLog[betLog.length - 1];
      if (phase !== 'betting' || !last) return;
      const left = Math.max(0, (bets[last.key] ?? 0) - last.amount);
      const next = { ...bets, [last.key]: left };
      if (!left) delete next[last.key];
      set({ bets: next, betLog: betLog.slice(0, -1) });
    },

    clearBets: () => {
      if (get().phase === 'betting') set({ bets: {}, betLog: [] });
    },

    rebet: () => {
      const { lastBets } = get();
      if (lastBets) addBets(lastBets.bets, lastBets.defs);
    },

    doubleBets: () => addBets({ ...get().bets }, get().defs),

    spinWheel: () => {
      if (get().phase === 'betting') void runSpin();
    },

    tick: () => {
      const { phase, timeLeft, bets, noBetStreak } = get();
      if (phase !== 'betting') return;
      if (timeLeft > 1) {
        if (timeLeft <= 6) sfx.tick();
        return set({ timeLeft: timeLeft - 1 });
      }
      if (sum(bets) === 0 && noBetStreak >= 2) {
        return set({ timeLeft: game().settings.timerSeconds, timerPaused: true, message: '타이머 일시정지 — 베팅하면 다시 시작합니다' });
      }
      set({ timeLeft: 0 });
      void runSpin();
    },
  };
});
