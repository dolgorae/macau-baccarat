import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CURRENCY, formatMoney } from '../config/tables';
import { handTotal } from '../engine/cards';
import { totalBet } from '../engine/limits';
import { cardsRemaining } from '../engine/shoe';
import { type Side, useGame } from '../store/game';
import { AmountDialog } from './AmountDialog';
import { BetLayout } from './BetLayout';
import { Chip } from './Chip';
import { PlayingCard } from './PlayingCard';
import { Roadmap } from './Roadmap';
import { SessionPanel } from './SessionPanel';
import { SettingsDialog } from './SettingsDialog';
import { SqueezeModal } from './SqueezeModal';

function HandArea({ side }: { side: Side }) {
  const cards = useGame((s) => s.cards[side]);
  const result = useGame((s) => s.result);
  const open = cards.filter((c) => c.faceUp).map((c) => c.card);
  const winner = result && result.outcome === (side === 'player' ? 'P' : 'B');
  const tie = result?.outcome === 'T';

  return (
    <div className={`hand-area ${side}${winner ? ' winner' : ''}${tie ? ' tie' : ''}`}>
      <div className="hand-label">
        <span className="zh">{side === 'player' ? '閒' : '莊'}</span>
        {side.toUpperCase()}
        <span className={`hand-total${open.length ? ' visible' : ''}`}>{open.length ? handTotal(open) : ''}</span>
      </div>
      <div className="hand-cards">
        <AnimatePresence>
          {cards.map((c, i) => (
            <PlayingCard key={c.card.id} card={c.card} faceUp={c.faceUp} sideways={i === 2} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ShoeBox() {
  const shoe = useGame((s) => s.shoe);
  const lastHand = useGame((s) => s.lastHand);
  if (!shoe) return null;
  const left = cardsRemaining(shoe);
  const pct = (left / shoe.cards.length) * 100;
  return (
    <div className="shoe-box" title={`남은 카드 ${left}장`}>
      <div className="shoe-body">
        <div className="shoe-fill" style={{ width: `${pct}%` }} />
        <div className="shoe-cut" style={{ left: `${((shoe.cards.length - shoe.cutIndex) / shoe.cards.length) * 100}%` }} />
      </div>
      <div className="shoe-label">
        SHOE · {left}장{lastHand && <span className="last-hand"> · LAST HAND</span>}
      </div>
    </div>
  );
}

function LimitSign() {
  const table = useGame((s) => s.table)!;
  return (
    <div className="limit-sign">
      <div className="limit-tier">{table.tier}</div>
      <div className="limit-main">
        {CURRENCY} {formatMoney(table.main.min)} – {formatMoney(table.main.max)}
      </div>
      <div className="limit-mode">{table.mode === 'no-commission' ? '免佣 NO COMMISSION' : '5% COMMISSION'}</div>
    </div>
  );
}

function Timer() {
  const phase = useGame((s) => s.phase);
  const timeLeft = useGame((s) => s.timeLeft);
  const paused = useGame((s) => s.timerPaused);
  const settings = useGame((s) => s.settings);
  const tick = useGame((s) => s.tick);

  useEffect(() => {
    if (phase !== 'betting' || !settings.timer || paused) return;
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [phase, settings.timer, paused, tick]);

  if (!settings.timer || phase !== 'betting') return <div className="timer idle" />;
  const r = 26;
  const circ = 2 * Math.PI * r;
  const frac = timeLeft / settings.timerSeconds;
  return (
    <div className={`timer${timeLeft <= 5 ? ' urgent' : ''}${paused ? ' paused' : ''}`}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} className="timer-track" />
        <circle
          cx="32"
          cy="32"
          r={r}
          className="timer-progress"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <span>{paused ? '⏸' : timeLeft}</span>
    </div>
  );
}

function Controls() {
  const table = useGame((s) => s.table)!;
  const phase = useGame((s) => s.phase);
  const bets = useGame((s) => s.bets);
  const stack = useGame((s) => s.stack);
  const selectedChip = useGame((s) => s.selectedChip);
  const lastBets = useGame((s) => s.lastBets);
  const betLog = useGame((s) => s.betLog);
  const { selectChip, clearBets, rebet, doubleBets, undo, deal } = useGame.getState();
  const betting = phase === 'betting';
  const staked = totalBet(bets);

  return (
    <div className="controls">
      <div className="stack-display">
        <span>CHIPS</span>
        <b>{formatMoney(stack)}</b>
        <small>On table {formatMoney(staked)}</small>
      </div>
      <div className="chip-rack">
        {table.chips.map((v) => (
          <Chip key={v} value={v} size={62} selected={v === selectedChip} onClick={() => selectChip(v)} />
        ))}
      </div>
      <div className="actions">
        <button onClick={undo} disabled={!betting || !betLog.length}>되돌리기</button>
        <button onClick={clearBets} disabled={!betting || !staked}>지우기</button>
        <button onClick={rebet} disabled={!betting || !lastBets || staked > 0}>리벳</button>
        <button onClick={doubleBets} disabled={!betting || !staked}>더블</button>
        <button className="deal" onClick={deal} disabled={!betting}>
          {staked ? 'DEAL' : '구경하기'}
        </button>
      </div>
      <Timer />
    </div>
  );
}

function TopBar({ onSettings }: { onSettings: () => void }) {
  const table = useGame((s) => s.table)!;
  const wallet = useGame((s) => s.wallet);
  const handNo = useGame((s) => s.handNo);
  const { leaveTable, addChips, atm } = useGame.getState();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  return (
    <header className="top-bar">
      <div className="brand">
        <span className="brand-mark">澳門</span>
        <div>
          <div className="brand-title">Baccarat · {table.name}</div>
          <div className="brand-sub">
            {CURRENCY} {formatMoney(table.main.min)} – {formatMoney(table.main.max)} · 8 Decks · Hand #{handNo + 1}
          </div>
        </div>
      </div>
      <ShoeBox />
      <div className="top-actions">
        <div className="wallet">
          현금 <b>{CURRENCY} {formatMoney(wallet)}</b>
        </div>
        <button onClick={() => setDepositOpen(true)}>입금</button>
        <button onClick={() => setTopUpOpen(true)} disabled={wallet <= 0}>
          칩 교환
        </button>
        <button onClick={onSettings}>설정</button>
        <button className="leave" onClick={leaveTable}>
          테이블 떠나기
        </button>
      </div>
      {topUpOpen && (
        <AmountDialog
          title="칩 교환"
          description="현금을 칩으로 바꿉니다. 베팅 중이 아닐 때도 언제든 가능합니다."
          presets={[
            { label: '전액', value: wallet },
            ...[10, 50, 100]
              .map((m) => table.main.min * m)
              .filter((v) => v < wallet)
              .map((v) => ({ label: formatMoney(v), value: v })),
          ]}
          max={wallet}
          confirmLabel="교환"
          onConfirm={addChips}
          onClose={() => setTopUpOpen(false)}
        />
      )}
      {depositOpen && (
        <AmountDialog
          title="입금 (ATM)"
          description="입금한 금액은 누적 입금에 기록되어 손익 계산에 반영됩니다."
          presets={[100_000, 500_000, 1_000_000, 5_000_000, 10_000_000].map((v) => ({ label: formatMoney(v), value: v }))}
          confirmLabel="입금 후 바로 칩 교환"
          onConfirm={(amount) => {
            atm(amount);
            addChips(amount);
          }}
          secondary={{ label: '현금으로만 입금', onConfirm: atm }}
          onClose={() => setDepositOpen(false)}
        />
      )}
    </header>
  );
}

/** The table is laid out for this height and scaled to fit the window; the width stretches to fill. */
const DESIGN_HEIGHT = 900;
const MIN_DESIGN_WIDTH = 1280;

function useFitToWindow() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const scale = Math.min(size.h / DESIGN_HEIGHT, size.w / MIN_DESIGN_WIDTH);
  return { scale, width: size.w / scale, height: size.h / scale };
}

export function Table() {
  const dealerMessage = useGame((s) => s.dealerMessage);
  const phase = useGame((s) => s.phase);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fit = useFitToWindow();

  return (
    <div className="fit-viewport">
      <div className="table-screen" style={{ width: fit.width, height: fit.height, transform: `scale(${fit.scale})` }}>
        <TopBar onSettings={() => setSettingsOpen(true)} />
        <div className="table-body">
          <main className="table-main">
            <Roadmap />
            <div className="felt">
              <LimitSign />
              <AnimatePresence mode="wait">
                {dealerMessage && (
                  <motion.div
                    key={dealerMessage}
                    className={`dealer-message ${phase}`}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {dealerMessage}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="card-zone">
                <HandArea side="player" />
                <HandArea side="banker" />
              </div>
              <BetLayout />
            </div>
            <Controls />
          </main>
          <SessionPanel />
        </div>
        <AnimatePresence>{phase === 'squeeze' && <SqueezeModal />}</AnimatePresence>
        {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      </div>
    </div>
  );
}
