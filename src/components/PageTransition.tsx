import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  key?: string | number;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
}

const directionVariants = {
  left: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 }
  },
  right: {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 }
  },
  up: {
    initial: { opacity: 0, y: 100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -100 }
  },
  down: {
    initial: { opacity: 0, y: -100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 100 }
  }
};

export function PageTransition({
  children,
  key,
  direction = 'left',
  duration = 0.3
}: PageTransitionProps) {
  const variants = directionVariants[direction];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={{
          duration,
          ease: 'easeInOut'
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Fade transition component
 */
interface FadeTransitionProps {
  children: ReactNode;
  key?: string | number;
  duration?: number;
}

export function FadeTransition({
  children,
  key,
  duration = 0.3
}: FadeTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Scale transition component
 */
interface ScaleTransitionProps {
  children: ReactNode;
  key?: string | number;
  duration?: number;
}

export function ScaleTransition({
  children,
  key,
  duration = 0.3
}: ScaleTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Stagger children animation
 */
interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
}

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  delayChildren = 0.2
}: StaggerContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        staggerChildren: staggerDelay,
        delayChildren
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger item component
 */
interface StaggerItemProps {
  children: ReactNode;
  index?: number;
}

export function StaggerItem({ children, index = 0 }: StaggerItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: 'easeOut'
      }}
    >
      {children}
    </motion.div>
  );
}

