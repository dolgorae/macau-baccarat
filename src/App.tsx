import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Lobby } from './components/Lobby';
import { Table } from './components/Table';
import { useGame } from './store/game';

function ToastHost() {
  const toast = useGame((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useGame.setState({ toast: null }), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className={`toast ${toast.kind}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          {toast.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const screen = useGame((s) => s.screen);
  return (
    <>
      {screen === 'lobby' ? <Lobby /> : <Table />}
      <ToastHost />
    </>
  );
}
