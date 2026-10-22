import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { CURRENCY, formatMoney } from '../config/tables';
import { cardsRemaining } from '../engine/shoe';
import { useGame } from '../store/game';
import { BetLayout } from './BetLayout';
import { DepositDialog, TopUpDialog } from './CashDialogs';
import { Roadmap } from './Roadmap';
import { SessionPanel } from './SessionPanel';
import { SettingsDialog } from './SettingsDialog';
import { Controls, DealerMessage, HandArea } from './TableParts';

type Dialog = 'settings' | 'deposit' | 'topup';

function MobileTopBar({ onMenu }: { onMenu: () => void }) {
  const table = useGame((s) => s.table)!;
  const handNo = useGame((s) => s.handNo);
  const shoe = useGame((s) => s.shoe);
  const lastHand = useGame((s) => s.lastHand);
  return (
    <header className="m-top-bar">
      <span className="brand-mark">澳門</span>
      <div className="m-title">
        <div className="m-limit">
          {CURRENCY} {formatMoney(table.main.min)} – {formatMoney(table.main.max)}
          <span className="m-mode">{table.mode === 'no-commission' ? '免佣' : '5%'}</span>
        </div>
        <div className="m-sub">
          Hand #{handNo + 1}
          {shoe && ` · 슈 ${cardsRemaining(shoe)}장`}
          {lastHand && <span className="last-hand"> · LAST HAND</span>}
        </div>
      </div>
      <button className="m-menu-button" onClick={onMenu} aria-label="메뉴">
        ☰
      </button>
    </header>
  );
}

function MobileMenu({ onClose, onOpen }: { onClose: () => void; onOpen: (d: Dialog) => void }) {
  const wallet = useGame((s) => s.wallet);
  const leaveTable = useGame((s) => s.leaveTable);
  const open = (d: Dialog) => {
    onClose();
    onOpen(d);
  };
  return (
    <motion.div className="m-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
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
              onClose();
              leaveTable();
            }}
          >
            테이블 떠나기
          </button>
        </div>
        <SessionPanel />
      </motion.div>
    </motion.div>
  );
}

export function MobileLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <MobileTopBar onMenu={() => setMenuOpen(true)} />
      <div className="m-body">
        <Roadmap compact />
        <div className="felt">
          <DealerMessage />
          <div className="card-zone">
            <HandArea side="player" />
            <HandArea side="banker" />
          </div>
          <BetLayout />
        </div>
        <Controls />
      </div>
      <AnimatePresence>{menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} onOpen={setDialog} />}</AnimatePresence>
      {dialog === 'settings' && <SettingsDialog onClose={close} />}
      {dialog === 'deposit' && <DepositDialog onClose={close} />}
      {dialog === 'topup' && <TopUpDialog onClose={close} />}
    </>
  );
}
