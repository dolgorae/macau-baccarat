import { AnimatePresence, motion } from 'framer-motion';
import { type BetSpotId, formatMoney, spotLimit } from '../config/tables';
import { useGame } from '../store/game';
import { ChipStack } from './Chip';

interface SpotDef {
  id: BetSpotId;
  en: string;
  zh: string;
  odds: string;
  className: string;
}

function BetSpot({ def }: { def: SpotDef }) {
  const amount = useGame((s) => s.bets[def.id]);
  const phase = useGame((s) => s.phase);
  const table = useGame((s) => s.table)!;
  const settled = useGame((s) => s.settlement?.spots.find((x) => x.spot === def.id));
  const placeBet = useGame((s) => s.placeBet);
  const removeBet = useGame((s) => s.removeBet);
  const limit = spotLimit(table, def.id);

  const state = settled?.result ?? '';
  return (
    <button
      className={`bet-spot ${def.className} ${state}`}
      disabled={phase !== 'betting'}
      onClick={() => placeBet(def.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        removeBet(def.id);
      }}
      title="클릭: 베팅 · 우클릭: 선택 칩만큼 회수"
    >
      <span className="spot-zh">{def.zh}</span>
      <span className="spot-en">{def.en}</span>
      <span className="spot-odds">{def.odds}</span>
      <span className="spot-limit">
        {formatMoney(limit.min)} – {formatMoney(limit.max)}
      </span>
      <AnimatePresence>
        {amount > 0 && state !== 'lose' && (
          <motion.div
            className="spot-chips"
            initial={{ y: 40, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, transition: { duration: 0.4 } }}
          >
            <ChipStack amount={amount} size={def.className.startsWith('side') ? 30 : 44} />
            <span className="spot-amount">{formatMoney(amount)}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {settled?.result === 'win' && (
          <motion.div className="spot-payout" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <ChipStack amount={settled.profit} size={def.className.startsWith('side') ? 30 : 44} />
            <span className="spot-amount win">+{formatMoney(settled.profit)}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {settled?.result === 'push' && <span className="spot-badge">PUSH</span>}
    </button>
  );
}

export function BetLayout() {
  const mode = useGame((s) => s.table!.mode);
  const noComm = mode === 'no-commission';

  const side: SpotDef[] = [
    { id: 'playerPair', en: 'P PAIR', zh: '閒對', odds: '1 : 11', className: 'side player-pair' },
    { id: 'tie', en: 'TIE', zh: '和', odds: '1 : 8', className: 'side tie' },
    ...(noComm ? [{ id: 'super6' as const, en: 'SUPER 6', zh: '幸運6', odds: '1 : 12', className: 'side super6' }] : []),
    { id: 'bankerPair', en: 'B PAIR', zh: '莊對', odds: '1 : 11', className: 'side banker-pair' },
  ];
  const main: SpotDef[] = [
    { id: 'player', en: 'PLAYER', zh: '閒', odds: '1 : 1', className: 'main player' },
    {
      id: 'banker',
      en: 'BANKER',
      zh: '莊',
      odds: noComm ? '1 : 1  ·  6點 1 : 0.5' : '1 : 0.95',
      className: 'main banker',
    },
  ];

  return (
    <div className="bet-layout">
      <div className="bet-row side-row">
        {side.map((d) => (
          <BetSpot key={d.id} def={d} />
        ))}
      </div>
      <div className="bet-row main-row">
        {main.map((d) => (
          <BetSpot key={d.id} def={d} />
        ))}
      </div>
    </div>
  );
}
