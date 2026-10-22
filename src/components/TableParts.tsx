import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { CURRENCY, formatMoney } from '../config/tables';
import { handTotal } from '../engine/cards';
import { totalBet } from '../engine/limits';
import { cardsRemaining } from '../engine/shoe';
import { type Side, useGame } from '../store/game';
import { Chip } from './Chip';
import { PlayingCard } from './PlayingCard';

// Table pieces shared by the PC and mobile layouts.

export function HandArea({ side }: { side: Side }) {
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

export function ShoeBox() {
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

export function LimitSign() {
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

export function Controls() {
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

export function DealerMessage() {
  const dealerMessage = useGame((s) => s.dealerMessage);
  const phase = useGame((s) => s.phase);
  return (
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
  );
}
