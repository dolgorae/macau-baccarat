import { formatMoney } from '../../config/tables';
import { numberColor, spinStats } from '../../engine/roulette';
import { useGame } from '../../store/game';
import { availableChips, totalRouletteBet, useRoulette } from '../../store/roulette';
import { Chip } from '../Chip';
import { TimerRing } from '../TableParts';

export function NumberBall({ n, size = 28 }: { n: number; size?: number }) {
  return (
    <span className={`rl-ball ${numberColor(n)}`} style={{ width: size, height: size, fontSize: size * 0.46 }}>
      {n}
    </span>
  );
}

/** The electronic results display: newest on top, red numbers right, black left, zero centred. */
export function ResultsColumn({ count = 16 }: { count?: number }) {
  const results = useRoulette((s) => s.results);
  const recent = results.slice(-count).reverse();
  return (
    <div className="rl-results-column">
      {recent.map((n, i) => (
        <div key={results.length - i} className={`rl-results-row ${numberColor(n)}${i === 0 ? ' latest' : ''}`}>
          <span>{n}</span>
        </div>
      ))}
    </div>
  );
}

export function ResultsStrip({ count = 12 }: { count?: number }) {
  const results = useRoulette((s) => s.results);
  return (
    <div className="rl-results-strip">
      {results
        .slice(-count)
        .reverse()
        .map((n, i) => (
          <NumberBall key={results.length - i} n={n} size={i === 0 ? 30 : 22} />
        ))}
    </div>
  );
}

function Bar({ parts }: { parts: { label: string; value: number; className: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="rl-bar">
      {parts.map((p) => (
        <div key={p.label} className={`rl-bar-part ${p.className}`} style={{ flex: p.value || 0.0001 }}>
          {p.value / total >= 0.12 && (
            <span>
              {p.label} {Math.round((p.value / total) * 100)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Hot/cold numbers and colour/parity/range splits over the last 100 spins. */
export function SpinStatsPanel() {
  const results = useRoulette((s) => s.results);
  const st = spinStats(results);
  return (
    <div className="rl-stats">
      <div className="rl-stats-title">최근 {st.count}회</div>
      <div className="rl-hotcold">
        <div>
          <span className="rl-hot">HOT</span>
          {st.hot.map((n) => (
            <NumberBall key={n} n={n} size={24} />
          ))}
        </div>
        <div>
          <span className="rl-cold">COLD</span>
          {st.cold.map((n) => (
            <NumberBall key={n} n={n} size={24} />
          ))}
        </div>
      </div>
      <Bar
        parts={[
          { label: 'RED', value: st.red, className: 'red' },
          { label: '0', value: st.zero, className: 'green' },
          { label: 'BLACK', value: st.black, className: 'black' },
        ]}
      />
      <Bar
        parts={[
          { label: 'ODD', value: st.odd, className: 'neutral' },
          { label: 'EVEN', value: st.even, className: 'neutral alt' },
        ]}
      />
      <Bar
        parts={[
          { label: '1-18', value: st.low, className: 'neutral' },
          { label: '19-36', value: st.high, className: 'neutral alt' },
        ]}
      />
      <Bar
        parts={[
          { label: '1st', value: st.dozens[0], className: 'neutral' },
          { label: '2nd', value: st.dozens[1], className: 'neutral alt' },
          { label: '3rd', value: st.dozens[2], className: 'neutral' },
        ]}
      />
    </div>
  );
}

export function RouletteControls() {
  const table = useRoulette((s) => s.table)!;
  const phase = useRoulette((s) => s.phase);
  const bets = useRoulette((s) => s.bets);
  const selectedChip = useRoulette((s) => s.selectedChip);
  const lastBets = useRoulette((s) => s.lastBets);
  const betLog = useRoulette((s) => s.betLog);
  const timeLeft = useRoulette((s) => s.timeLeft);
  const paused = useRoulette((s) => s.timerPaused);
  const stack = useGame((s) => s.stack);
  const { selectChip, clearBets, rebet, doubleBets, undo, spinWheel, tick } = useRoulette.getState();
  const betting = phase === 'betting';
  const staked = totalRouletteBet(bets);

  return (
    <div className="controls">
      <div className="stack-display">
        <span>CHIPS</span>
        <b>{formatMoney(betting ? availableChips(stack, bets) : stack)}</b>
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
        <button className="deal" onClick={spinWheel} disabled={!betting}>
          {staked ? 'SPIN' : '구경하기'}
        </button>
      </div>
      <TimerRing active={betting} timeLeft={timeLeft} paused={paused} onTick={tick} />
    </div>
  );
}

export function RouletteSession() {
  const stack = useGame((s) => s.stack);
  const buyIn = useGame((s) => s.buyIn);
  const history = useRoulette((s) => s.history);
  const net = stack - buyIn;
  const wins = history.filter((h) => h.net > 0).length;
  return (
    <div className="rl-session">
      <dl className="session-stats">
        <dt>바이인</dt>
        <dd>{formatMoney(buyIn)}</dd>
        <dt>현재 칩</dt>
        <dd>{formatMoney(stack)}</dd>
        <dt>손익</dt>
        <dd className={net > 0 ? 'pos' : net < 0 ? 'neg' : ''}>
          {net > 0 ? '+' : ''}
          {formatMoney(net)}
        </dd>
        <dt>스핀 / 승</dt>
        <dd>
          {history.length} / {wins}
        </dd>
      </dl>
      <ol className="hand-history">
        {history.length === 0 && <li className="empty">아직 베팅한 스핀이 없습니다</li>}
        {history.map((h) => (
          <li key={h.spinNo}>
            <span className="h-no">#{h.spinNo}</span>
            <NumberBall n={h.number} size={20} />
            <span className="h-score">{formatMoney(h.stake)}</span>
            <span className={`h-net ${h.net > 0 ? 'pos' : h.net < 0 ? 'neg' : ''}`}>
              {h.net > 0 ? '+' : ''}
              {formatMoney(h.net)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
