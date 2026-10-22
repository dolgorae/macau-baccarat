import { motion } from 'framer-motion';
import type { Card } from '../engine/cards';
import { CardBack, CardFace } from './CardFace';

interface Props {
  card: Card;
  faceUp: boolean;
  /** The third card is placed sideways, as dealt at the table. */
  sideways?: boolean;
}

export function PlayingCard({ card, faceUp, sideways }: Props) {
  return (
    <motion.div
      className={`table-card${sideways ? ' sideways' : ''}`}
      initial={{ x: 420, y: -260, rotate: -30, opacity: 0 }}
      animate={{ x: 0, y: 0, rotate: sideways ? 90 : 0, opacity: 1 }}
      exit={{ x: 0, y: -320, opacity: 0, transition: { duration: 0.35 } }}
      transition={{ type: 'spring', stiffness: 170, damping: 22 }}
    >
      <motion.div
        className="table-card-inner"
        initial={false}
        animate={{ rotateY: faceUp ? 180 : 0 }}
        transition={{ duration: 0.45 }}
      >
        <CardBack className="card-side card-back" />
        <CardFace card={card} className="card-side card-front" />
      </motion.div>
    </motion.div>
  );
}
