import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { CURRENCY, formatMoney } from '../config/tables';
import { useTableFit } from '../hooks/useViewport';
import { useGame } from '../store/game';
import { BetLayout } from './BetLayout';
import { DepositDialog, TopUpDialog } from './CashDialogs';
import { MobileLayout } from './MobileLayout';
import { Roadmap } from './Roadmap';
import { SessionPanel } from './SessionPanel';
import { SettingsDialog } from './SettingsDialog';
import { SqueezeModal } from './SqueezeModal';
import { Controls, DealerMessage, HandArea, LimitSign, ShoeBox } from './TableParts';

function TopBar({ onSettings }: { onSettings: () => void }) {
  const table = useGame((s) => s.table)!;
  const wallet = useGame((s) => s.wallet);
  const handNo = useGame((s) => s.handNo);
  const leaveTable = useGame((s) => s.leaveTable);
  const [dialog, setDialog] = useState<'topup' | 'deposit' | null>(null);
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
        <button onClick={() => setDialog('deposit')}>입금</button>
        <button onClick={() => setDialog('topup')} disabled={wallet <= 0}>
          칩 교환
        </button>
        <button onClick={onSettings}>설정</button>
        <button className="leave" onClick={leaveTable}>
          테이블 떠나기
        </button>
      </div>
      {dialog === 'topup' && <TopUpDialog unit={table.main.min} onClose={() => setDialog(null)} />}
      {dialog === 'deposit' && <DepositDialog onClose={() => setDialog(null)} />}
    </header>
  );
}

function DesktopLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <>
      <TopBar onSettings={() => setSettingsOpen(true)} />
      <div className="table-body">
        <main className="table-main">
          <Roadmap />
          <div className="felt">
            <LimitSign />
            <DealerMessage />
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
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </>
  );
}

export function Table() {
  const phase = useGame((s) => s.phase);
  const { mobile, scale, width, height } = useTableFit();

  return (
    <div className="fit-viewport">
      <div
        className={`table-screen${mobile ? ' mobile' : ''}`}
        style={{ width, height, transform: `scale(${scale})` }}
      >
        {mobile ? <MobileLayout /> : <DesktopLayout />}
        <AnimatePresence>{phase === 'squeeze' && <SqueezeModal />}</AnimatePresence>
      </div>
    </div>
  );
}
