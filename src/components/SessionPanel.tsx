import { formatMoney } from '../config/tables';
import { totalBet } from '../engine/limits';
import { useGame } from '../store/game';

const OUTCOME_ZH = { B: '莊', P: '閒', T: '和' } as const;

export function SessionPanel() {
  const stack = useGame((s) => s.stack);
  const bets = useGame((s) => s.bets);
  const buyIn = useGame((s) => s.buyIn);
  const history = useGame((s) => s.history);
  const phase = useGame((s) => s.phase);

  // Stakes in play count as still yours until the hand settles.
  const inPlay = phase === 'betting' || phase === 'shuffling' ? totalBet(bets) : 0;
  const net = stack + inPlay - buyIn;
  const wins = history.filter((h) => h.net > 0).length;
  // history is newest-first; replay oldest-first for the running high/low
  let run = 0;
  let hi = 0;
  let lo = 0;
  for (const h of [...history].reverse()) {
    run += h.net;
    hi = Math.max(hi, run);
    lo = Math.min(lo, run);
  }

  return (
    <aside className="session-panel">
      <h3>세션</h3>
      <dl className="session-stats">
        <dt>바이인</dt>
        <dd>{formatMoney(buyIn)}</dd>
        <dt>현재 칩</dt>
        <dd>{formatMoney(stack + inPlay)}</dd>
        <dt>손익</dt>
        <dd className={net > 0 ? 'pos' : net < 0 ? 'neg' : ''}>
          {net > 0 ? '+' : ''}
          {formatMoney(net)}
        </dd>
        <dt>핸드 / 승</dt>
        <dd>
          {history.length} / {wins}
        </dd>
        <dt>최고 / 최저</dt>
        <dd>
          <span className="pos">+{formatMoney(hi)}</span> / <span className="neg">{formatMoney(lo)}</span>
        </dd>
      </dl>

      <h3>최근 핸드</h3>
      <ol className="hand-history">
        {history.length === 0 && <li className="empty">아직 베팅한 핸드가 없습니다</li>}
        {history.map((h) => (
          <li key={h.handNo}>
            <span className="h-no">#{h.handNo}</span>
            <span className={`h-outcome ${h.outcome}`}>{OUTCOME_ZH[h.outcome]}</span>
            <span className="h-score">
              {h.playerTotal}:{h.bankerTotal}
            </span>
            <span className={`h-net ${h.net > 0 ? 'pos' : h.net < 0 ? 'neg' : ''}`}>
              {h.net > 0 ? '+' : ''}
              {formatMoney(h.net)}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
