import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setSoundEnabled, sfx } from '../audio/sfx';
import { BET_SPOTS, type Bets, type BetSpotId, CURRENCY, emptyBets, formatMoney, TABLES, type TableConfig } from '../config/tables';
import { type HandResult, playHand } from '../engine/baccarat';
import type { Card } from '../engine/cards';
import { belowMinimum, checkAdd, SPOT_LABEL, totalBet } from '../engine/limits';
import { type Settlement, settle } from '../engine/payout';
import type { RoadHand } from '../engine/roads';
import { createShoe, cutCardOut, type Shoe } from '../engine/shoe';

export type Phase = 'shuffling' | 'betting' | 'dealing' | 'squeeze' | 'result';
export type Side = 'player' | 'banker';
export type SqueezeMode = 'mine' | 'all' | 'off';

export interface TableCard {
  card: Card;
  faceUp: boolean;
}

export interface Settings {
  squeeze: SqueezeMode;
  timer: boolean;
  timerSeconds: number;
  sound: boolean;
}

export interface HandRecord {
  handNo: number;
  outcome: HandResult['outcome'];
  playerTotal: number;
  bankerTotal: number;
  stake: number;
  net: number;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'error' | 'info' | 'win';
}

interface GameState {
  // persisted
  wallet: number;
  cashIn: number;
  settings: Settings;
  lifetime: { hands: number; wagered: number };

  screen: 'lobby' | 'table';
  table: TableConfig | null;
  stack: number;
  buyIn: number;
  bets: Bets;
  lastBets: Bets | null;
  betLog: { spot: BetSpotId; amount: number }[];
  selectedChip: number;
  phase: Phase;
  timeLeft: number;
  timerPaused: boolean;
  noBetStreak: number;
  dealerMessage: string;
  toast: Toast | null;

  shoe: Shoe | null;
  lastHand: boolean;
  handNo: number;
  roads: RoadHand[];
  cards: Record<Side, TableCard[]>;
  squeeze: { side: Side; indices: number[] } | null;
  result: HandResult | null;
  settlement: Settlement | null;
  history: HandRecord[];

  enterTable: (tableId: string, buyIn: number) => void;
  leaveTable: () => void;
  addChips: (amount: number) => void;
  atm: (amount: number) => void;
  selectChip: (value: number) => void;
  placeBet: (spot: BetSpotId) => void;
  removeBet: (spot: BetSpotId) => void;
  undo: () => void;
  clearBets: () => void;
  rebet: () => void;
  doubleBets: () => void;
  deal: () => void;
  tick: () => void;
  openCard: (side: Side, index: number) => void;
  finishSqueeze: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  notify: (text: string, kind?: Toast['kind']) => void;
}

const START_CASH = 300_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let squeezeResolve: (() => void) | null = null;
let toastId = 0;

const OUTCOME_TEXT = { P: 'PLAYER WINS', B: 'BANKER WINS', T: 'TIE' } as const;

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      const notify = (text: string, kind: Toast['kind'] = 'error') => set({ toast: { id: ++toastId, text, kind } });

      const startShoe = async () => {
        const shoe = createShoe();
        set({
          phase: 'shuffling',
          shoe,
          lastHand: false,
          roads: [],
          handNo: 0,
          cards: { player: [], banker: [] },
          dealerMessage: '새 슈를 셔플하고 있습니다…',
        });
        await sleep(1800);
        if (get().shoe !== shoe) return; // left the table mid-shuffle
        set({ dealerMessage: `번 카드 공개 → ${shoe.burnCount}장 번` });
        await sleep(2200);
        if (get().shoe !== shoe) return;
        openBetting();
      };

      const openBetting = () => {
        const { settings, lastHand } = get();
        set({
          phase: 'betting',
          timeLeft: settings.timerSeconds,
          dealerMessage: lastHand ? '마지막 핸드입니다 — Place your bets' : 'Place your bets',
        });
      };

      const shouldSqueeze = (side: Side) => {
        const { settings, bets } = get();
        if (settings.squeeze === 'off') return false;
        if (settings.squeeze === 'all') return true;
        return bets[side] > 0;
      };

      const flip = (side: Side, index: number) =>
        set((s) => ({
          cards: { ...s.cards, [side]: s.cards[side].map((c, i) => (i === index ? { ...c, faceUp: true } : c)) },
        }));

      const reveal = async (side: Side, indices: number[]) => {
        if (shouldSqueeze(side)) {
          set({ phase: 'squeeze', squeeze: { side, indices } });
          await new Promise<void>((resolve) => {
            squeezeResolve = resolve;
          });
          for (const i of indices) flip(side, i);
          set({ phase: 'dealing', squeeze: null });
          await sleep(500);
          return;
        }
        for (const i of indices) {
          flip(side, i);
          sfx.flip();
          await sleep(550);
        }
      };

      const dealCard = async (side: Side, card: Card) => {
        set((s) => ({ cards: { ...s.cards, [side]: [...s.cards[side], { card, faceUp: false }] } }));
        sfx.card();
        await sleep(380);
      };

      const runRound = async () => {
        const { table, shoe } = get();
        if (!table || !shoe) return;

        const under = belowMinimum(table, get().bets);
        if (under.length) {
          const refund = under.reduce((s, spot) => s + get().bets[spot], 0);
          const bets = { ...get().bets };
          for (const spot of under) bets[spot] = 0;
          set((s) => ({ bets, stack: s.stack + refund }));
          notify(`미니멈 미만 베팅 반환: ${under.map((s) => SPOT_LABEL[s]).join(', ')}`);
        }

        const bets = get().bets;
        const stake = totalBet(bets);
        set({ phase: 'dealing', dealerMessage: 'No more bets', betLog: [], noBetStreak: stake ? 0 : get().noBetStreak + 1 });
        await sleep(800);

        let pos = shoe.pos;
        const hand = playHand(() => shoe.cards[pos++]);
        const nextShoe = { ...shoe, pos };
        set({ shoe: nextShoe, dealerMessage: '' });

        await dealCard('player', hand.player[0]);
        await dealCard('banker', hand.banker[0]);
        await dealCard('player', hand.player[1]);
        await dealCard('banker', hand.banker[1]);
        await sleep(300);

        await reveal('player', [0, 1]);
        await reveal('banker', [0, 1]);

        if (hand.natural) {
          set({ dealerMessage: 'Natural!' });
          await sleep(600);
        }
        if (hand.player[2]) {
          set({ dealerMessage: 'Player 한 장 더' });
          await sleep(500);
          await dealCard('player', hand.player[2]);
          await reveal('player', [2]);
        }
        if (hand.banker[2]) {
          set({ dealerMessage: 'Banker 한 장 더' });
          await sleep(500);
          await dealCard('banker', hand.banker[2]);
          await reveal('banker', [2]);
        }

        const settlement = settle(bets, hand, get().table!.mode);
        const winTotal = hand.outcome === 'P' ? hand.playerTotal : hand.bankerTotal;
        set((s) => ({
          phase: 'result',
          result: hand,
          settlement,
          stack: s.stack + settlement.totalReturned,
          handNo: s.handNo + 1,
          roads: [...s.roads, { outcome: hand.outcome, playerPair: hand.playerPair, bankerPair: hand.bankerPair, total: winTotal }],
          history: stake
            ? [
                { handNo: s.handNo + 1, outcome: hand.outcome, playerTotal: hand.playerTotal, bankerTotal: hand.bankerTotal, stake, net: settlement.net },
                ...s.history,
              ].slice(0, 200)
            : s.history,
          lifetime: { hands: s.lifetime.hands + (stake ? 1 : 0), wagered: s.lifetime.wagered + stake },
          lastBets: stake ? bets : s.lastBets,
          dealerMessage:
            `${OUTCOME_TEXT[hand.outcome]}  ${hand.playerTotal} : ${hand.bankerTotal}` +
            (hand.outcome === 'B' && hand.bankerTotal === 6 && s.table!.mode === 'no-commission' ? '  (Banker 6 — 1:2)' : ''),
        }));
        if (settlement.net > 0) {
          sfx.win();
          notify(`+${CURRENCY} ${formatMoney(settlement.net)}`, 'win');
        }

        await sleep(3200);
        if (get().screen !== 'table') return;
        set({ cards: { player: [], banker: [] }, bets: emptyBets(), settlement: null, result: null });

        if (get().lastHand) {
          await startShoe();
          return;
        }
        if (cutCardOut(nextShoe)) {
          set({ lastHand: true });
          notify('컷카드가 나왔습니다 — 다음 핸드가 이 슈의 마지막입니다', 'info');
        }
        await sleep(400);
        openBetting();
      };

      const addBets = (add: Bets) => {
        const { table, bets, stack, phase } = get();
        if (!table || phase !== 'betting') return;
        let next = { ...bets };
        let left = stack;
        for (const spot of BET_SPOTS) {
          if (!add[spot]) continue;
          const err = checkAdd(table, next, spot, add[spot], left);
          if (err) return notify(err);
          next = { ...next, [spot]: next[spot] + add[spot] };
          left -= add[spot];
        }
        sfx.chip();
        set({ bets: next, stack: left, noBetStreak: 0, timerPaused: false, betLog: [] });
      };

      return {
        wallet: START_CASH,
        cashIn: START_CASH,
        settings: { squeeze: 'off', timer: true, timerSeconds: 20, sound: true },
        lifetime: { hands: 0, wagered: 0 },

        screen: 'lobby',
        table: null,
        stack: 0,
        buyIn: 0,
        bets: emptyBets(),
        lastBets: null,
        betLog: [],
        selectedChip: 100,
        phase: 'shuffling',
        timeLeft: 0,
        timerPaused: false,
        noBetStreak: 0,
        dealerMessage: '',
        toast: null,
        shoe: null,
        lastHand: false,
        handNo: 0,
        roads: [],
        cards: { player: [], banker: [] },
        squeeze: null,
        result: null,
        settlement: null,
        history: [],

        enterTable: (tableId, buyIn) => {
          const table = TABLES.find((t) => t.id === tableId);
          if (!table || buyIn > get().wallet || buyIn < table.minBuyIn) return;
          set((s) => ({
            screen: 'table',
            table,
            wallet: s.wallet - buyIn,
            stack: buyIn,
            buyIn,
            bets: emptyBets(),
            lastBets: null,
            history: [],
            selectedChip: table.chips[1] ?? table.chips[0],
            timerPaused: false,
            noBetStreak: 0,
          }));
          void startShoe();
        },

        leaveTable: () => {
          const { phase, stack, bets } = get();
          if (phase !== 'betting' && phase !== 'shuffling') return notify('핸드 진행 중에는 자리를 뜰 수 없습니다');
          set((s) => ({ wallet: s.wallet + stack + totalBet(bets), stack: 0, bets: emptyBets(), screen: 'lobby', table: null, shoe: null }));
        },

        addChips: (amount) => {
          if (amount <= 0 || amount > get().wallet) return notify('현금이 부족합니다');
          set((s) => ({ wallet: s.wallet - amount, stack: s.stack + amount, buyIn: s.buyIn + amount }));
          notify(`칩 ${CURRENCY} ${formatMoney(amount)} 추가`, 'info');
        },

        atm: (amount) => set((s) => ({ wallet: s.wallet + amount, cashIn: s.cashIn + amount })),

        selectChip: (value) => set({ selectedChip: value }),

        placeBet: (spot) => {
          const { table, bets, stack, selectedChip, phase } = get();
          if (!table || phase !== 'betting') return;
          const err = checkAdd(table, bets, spot, selectedChip, stack);
          if (err) return notify(err);
          sfx.chip();
          set((s) => ({
            bets: { ...s.bets, [spot]: s.bets[spot] + selectedChip },
            stack: s.stack - selectedChip,
            betLog: [...s.betLog, { spot, amount: selectedChip }],
            noBetStreak: 0,
            timerPaused: false,
          }));
        },

        removeBet: (spot) => {
          const { bets, selectedChip, phase } = get();
          if (phase !== 'betting' || !bets[spot]) return;
          const amount = Math.min(selectedChip, bets[spot]);
          sfx.chip();
          set((s) => ({ bets: { ...s.bets, [spot]: s.bets[spot] - amount }, stack: s.stack + amount }));
        },

        undo: () => {
          const { betLog, phase } = get();
          const last = betLog[betLog.length - 1];
          if (phase !== 'betting' || !last) return;
          set((s) => ({
            bets: { ...s.bets, [last.spot]: Math.max(0, s.bets[last.spot] - last.amount) },
            stack: s.stack + Math.min(last.amount, s.bets[last.spot]),
            betLog: s.betLog.slice(0, -1),
          }));
        },

        clearBets: () => {
          if (get().phase !== 'betting') return;
          set((s) => ({ stack: s.stack + totalBet(s.bets), bets: emptyBets(), betLog: [] }));
        },

        rebet: () => {
          const { lastBets } = get();
          if (lastBets) addBets(lastBets);
        },

        doubleBets: () => addBets(get().bets),

        deal: () => {
          if (get().phase !== 'betting') return;
          void runRound();
        },

        tick: () => {
          const { phase, timeLeft, bets, noBetStreak } = get();
          if (phase !== 'betting') return;
          if (timeLeft > 1) {
            if (timeLeft <= 6) sfx.tick();
            return set({ timeLeft: timeLeft - 1 });
          }
          // Stop dealing to an empty seat after a few unattended hands.
          if (totalBet(bets) === 0 && noBetStreak >= 2) {
            return set({ timeLeft: get().settings.timerSeconds, timerPaused: true, dealerMessage: '타이머 일시정지 — 베팅하면 다시 시작합니다' });
          }
          set({ timeLeft: 0 });
          void runRound();
        },

        openCard: (side, index) => {
          sfx.flip();
          set((s) => ({
            cards: { ...s.cards, [side]: s.cards[side].map((c, i) => (i === index ? { ...c, faceUp: true } : c)) },
          }));
        },

        finishSqueeze: () => {
          squeezeResolve?.();
          squeezeResolve = null;
        },

        updateSettings: (patch) => {
          if (patch.sound !== undefined) setSoundEnabled(patch.sound);
          set((s) => ({ settings: { ...s.settings, ...patch } }));
        },

        notify,
      };
    },
    {
      name: 'macau-baccarat',
      version: 1,
      // v1: squeeze defaults to off (cards open automatically).
      migrate: (persisted, version) => {
        const state = persisted as { settings?: Settings };
        if (version < 1 && state.settings) state.settings = { ...state.settings, squeeze: 'off' };
        return state as never;
      },
      // Chips at the table are cashed back into the wallet on reload; stakes already in play are forfeited.
      partialize: (s) => ({
        wallet: s.wallet,
        cashIn: s.cashIn,
        settings: s.settings,
        lifetime: s.lifetime,
        tableChips: s.stack + (s.phase === 'betting' || s.phase === 'shuffling' ? totalBet(s.bets) : 0),
      }),
      merge: (persisted, current) => {
        const { tableChips = 0, ...rest } = (persisted ?? {}) as Partial<GameState> & { tableChips?: number };
        return { ...current, ...rest, wallet: (rest.wallet ?? current.wallet) + tableChips };
      },
      onRehydrateStorage: () => (state) => {
        if (state) setSoundEnabled(state.settings.sound);
      },
    },
  ),
);
