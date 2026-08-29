'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { slideInRight, transition } from './motion';

export interface AnimatedStepPanelProps {
  stepKey: string;
  children: React.ReactNode;
}

export function AnimatedStepPanel({ stepKey, children }: AnimatedStepPanelProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={slideInRight.initial}
        animate={slideInRight.animate}
        exit={slideInRight.exit}
        transition={transition.normal}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
