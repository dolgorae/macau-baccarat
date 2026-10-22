import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CURRENCY, formatMoney } from '../../config/tables';
import { useElementSize, useTableFit } from '../../hooks/useViewport';
import { useGame } from '../../store/game';
import { useRoulette } from '../../store/roulette';
import { DepositDialog, TopUpDialog } from '../CashDialogs';
import { SettingsDialog } from '../SettingsDialog';
import { type Orientation, RouletteBoard } from './RouletteBoard';
import { ResultsColumn, ResultsStrip, RouletteControls, RouletteSession, SpinStatsPanel } from './RouletteParts';
import { RouletteWheel } from './RouletteWheel';

type Dialog = 'settings' | 'deposit' | 'topup';

function LimitLine() {
  const table = useRoulette((s) => s.table)!;
  return (
    <>
      Inside {formatMoney(table.insideMinTotal)} · Outside {formatMoney(table.outsideMin)} · Straight max {formatMoney(table.max[1])}
    </>
  );
}

function Dialogs({ dialog, onClose }: { dialog: Dialog | null; onClose: () => void }) {
  const table = useRoulette((s) => s.table)!;
  if (dialog === 'settings') return <SettingsDialog onClose={onClose} />;
  if (dialog === 'deposit') return <DepositDialog onClose={onClose} />;
  if (dialog === 'topup') return <TopUpDialog unit={table.outsideMin} onClose={onClose} />;
  return null;
}

function Message() {
  const message = useRoulette((s) => s.message);
  const phase = useRoulette((s) => s.phase);
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div key={message} className={`dealer-message ${phase}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Wheel({ size }: { size: number }) {
  const spin = useRoulette((s) => s.spin);
  const phase = useRoulette((s) => s.phase);
  const settlement = useRoulette((s) => s.settlement);
  return <RouletteWheel spin={spin} spinning={phase === 'spinning'} result={phase === 'result' ? (settlement?.number ?? null) : null} size={size} />;
}

/** The board takes the space it is given (width up to `maxWidth`; the vertical board also fits the height). */
function FittedBoard({ orientation, maxWidth }: { orientation: Orientation; maxWidth: number }) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  return (
    <div ref={ref} className="rl-board-slot">
      {width > 0 && <RouletteBoard orientation={orientation} width={Math.min(width, maxWidth)} maxHeight={height} />}
    </div>
  );
}

function DesktopLayout() {
  const table = useRoulette((s) => s.table)!;
  const wallet = useGame((s) => s.wallet);
  const leave = useRoulette((s) => s.leave);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  return (
    <>
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark">澳門</span>
          <div>
            <div className="brand-title">
              {table.name} · {table.tier}
            </div>
            <div className="brand-sub">
              {CURRENCY} · Single Zero · <LimitLine />
            </div>
          </div>
        </div>
        <div className="top-actions">
          <div className="wallet">
            현금 <b>{CURRENCY} {formatMoney(wallet)}</b>
          </div>
          <button onClick={() => setDialog('deposit')}>입금</button>
          <button onClick={() => setDialog('topup')} disabled={wallet <= 0}>
            칩 교환
          </button>
          <button onClick={() => setDialog('settings')}>설정</button>
          <button className="leave" onClick={leave}>
            테이블 떠나기
          </button>
        </div>
      </header>
      <div className="rl-desktop">
        <aside className="rl-left">
          <Wheel size={320} />
          <h3>세션</h3>
          <RouletteSession />
        </aside>
        <main className="rl-main">
          <SpinStatsPanel />
          <div className="felt rl-felt">
            <Message />
            <div className="rl-felt-row">
              <FittedBoard orientation="horizontal" maxWidth={980} />
              <ResultsColumn count={14} />
            </div>
          </div>
          <RouletteControls />
        </main>
      </div>
      <Dialogs dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

/** On a phone the board fills the screen; the wheel comes up over it while the ball is in play. */
function WheelOverlay() {
  const phase = useRoulette((s) => s.phase);
  const spinId = useRoulette((s) => s.spin?.id);
  // The overlay belongs to one spin; once dismissed (or timed out after the result) it stays hidden for that spin.
  const [hiddenFor, setHiddenFor] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (phase !== 'result') return;
    const t = setTimeout(() => setHiddenFor(spinId), 1800);
    return () => clearTimeout(t);
  }, [phase, spinId]);
  const show = (phase === 'spinning' || phase === 'result') && hiddenFor !== spinId;
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="rl-wheel-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHiddenFor(spinId)}>
          <Wheel size={320} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MobileLayout() {
  const table = useRoulette((s) => s.table)!;
  const wallet = useGame((s) => s.wallet);
  const leave = useRoulette((s) => s.leave);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const open = (d: Dialog) => {
    setMenuOpen(false);
    setDialog(d);
  };

  return (
    <>
      <header className="m-top-bar">
        <span className="brand-mark">澳門</span>
        <div className="m-title">
          <div className="m-limit">
            Roulette <span className="m-mode">{table.tier}</span>
          </div>
          <div className="m-sub">
            <LimitLine />
          </div>
        </div>
        <button className="m-menu-button" onClick={() => setMenuOpen(true)} aria-label="메뉴">
          ☰
        </button>
      </header>
      <div className="m-body">
        <ResultsStrip />
        <div className="felt rl-felt">
          <Message />
          <FittedBoard orientation="vertical" maxWidth={420} />
        </div>
        <RouletteControls />
      </div>
      <WheelOverlay />
      <AnimatePresence>
        {menuOpen && (
          <motion.div className="m-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)}>
            <motion.div
              className="m-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="m-sheet-handle" />
              <div className="m-wallet">
                현금 <b>{CURRENCY} {formatMoney(wallet)}</b>
              </div>
              <div className="m-menu-grid">
                <button onClick={() => open('deposit')}>입금</button>
                <button onClick={() => open('topup')} disabled={wallet <= 0}>
                  칩 교환
                </button>
                <button onClick={() => open('settings')}>설정</button>
                <button
                  className="leave"
                  onClick={() => {
                    setMenuOpen(false);
                    leave();
                  }}
                >
                  테이블 떠나기
                </button>
              </div>
              <div className="m-sheet-scroll">
                <SpinStatsPanel />
                <h3 className="m-sheet-title">세션</h3>
                <RouletteSession />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Dialogs dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

export function RouletteTable() {
  const { mobile, scale, width, height } = useTableFit();
  return (
    <div className="fit-viewport">
      <div className={`table-screen roulette${mobile ? ' mobile' : ''}`} style={{ width, height, transform: `scale(${scale})` }}>
        {mobile ? <MobileLayout /> : <DesktopLayout />}
      </div>
    </div>
  );
}
