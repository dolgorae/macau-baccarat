import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { handTotal } from '../engine/cards';
import { useGame } from '../store/game';
import { CardFace } from './CardFace';
import { SqueezeCard } from './SqueezeCard';

const SIDE_LABEL = { player: { en: 'PLAYER', zh: '閒' }, banker: { en: 'BANKER', zh: '莊' } } as const;

export function SqueezeModal() {
  const squeeze = useGame((s) => s.squeeze);
  const cards = useGame((s) => s.cards);
  const openCard = useGame((s) => s.openCard);
  const finishSqueeze = useGame((s) => s.finishSqueeze);

  const side = squeeze?.side;
  const indices = squeeze?.indices ?? [];
  const mine = side ? cards[side] : [];
  const other = side === 'player' ? 'banker' : 'player';
  const otherOpen = side ? cards[other].filter((c) => c.faceUp).map((c) => c.card) : [];
  const allOpen = indices.length > 0 && indices.every((i) => mine[i]?.faceUp);
  const openedCards = mine.filter((c) => c.faceUp).map((c) => c.card);

  useEffect(() => {
    if (!squeeze || !allOpen) return;
    const t = setTimeout(finishSqueeze, 1100);
    return () => clearTimeout(t);
  }, [squeeze, allOpen, finishSqueeze]);

  useEffect(() => {
    if (!squeeze) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const current = useGame.getState().cards[squeeze.side];
        squeeze.indices.forEach((i) => !current[i]?.faceUp && openCard(squeeze.side, i));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [squeeze, openCard]);

  if (!squeeze || !side) return null;
  const label = SIDE_LABEL[side];
  const previous = mine.filter((_, i) => !indices.includes(i));

  return (
    <motion.div className="squeeze-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={`squeeze-panel ${side}`}>
        <header className="squeeze-header">
          <div className={`squeeze-title ${side}`}>
            <span className="zh">{label.zh}</span> {label.en} {indices.length === 1 ? '— 세 번째 카드' : ''}
          </div>
          <div className="squeeze-other">
            {SIDE_LABEL[other].en}
            <div className="mini-cards">
              {otherOpen.map((c) => (
                <CardFace key={c.id} card={c} className="mini-card" />
              ))}
            </div>
            <b>{otherOpen.length ? handTotal(otherOpen) : '?'}</b>
          </div>
        </header>

        <div className="squeeze-cards">
          {previous.map((c) => (
            <div key={c.card.id} className="squeeze-previous">
              <CardFace card={c.card} />
            </div>
          ))}
          {indices.map((i) =>
            mine[i] ? (
              <SqueezeCard key={mine[i].card.id} card={mine[i].card} opened={mine[i].faceUp} onOpen={() => openCard(side, i)} />
            ) : null,
          )}
        </div>

        <footer className="squeeze-footer">
          {allOpen ? (
            <div className={`squeeze-total ${side}`}>
              {label.en} <b>{handTotal(openedCards)}</b>
            </div>
          ) : (
            <p className="hint">
              카드 가장자리를 잡고 천천히 끌어서 젖히세요 · 더블클릭 또는 <kbd>Space</kbd>로 바로 오픈
            </p>
          )}
        </footer>
      </div>
    </motion.div>
  );
}
