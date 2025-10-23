import { motion, MotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedCardProps extends MotionProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  delay?: number;
}

export function AnimatedCard({
  children,
  className = '',
  onClick,
  interactive = true,
  delay = 0,
  ...motionProps
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: 'easeOut'
      }}
      whileHover={interactive ? { y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' } : {}}
      whileTap={interactive ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`
        rounded-lg border border-border bg-card p-4 transition-colors
        ${interactive ? 'cursor-pointer hover:border-primary/50' : ''}
        ${className}
      `}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated card grid component
 */
interface AnimatedCardGridProps {
  children: ReactNode;
  columns?: number;
  gap?: number;
}

export function AnimatedCardGrid({
  children,
  columns = 3,
  gap = 4
}: AnimatedCardGridProps) {
  return (
    <motion.div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-${gap}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated card with icon
 */
interface AnimatedCardWithIconProps extends AnimatedCardProps {
  icon: ReactNode;
  title: string;
  description?: string;
}

export function AnimatedCardWithIcon({
  icon,
  title,
  description,
  ...props
}: AnimatedCardWithIconProps) {
  return (
    <AnimatedCard {...props}>
      <motion.div
        className="flex items-start gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <motion.div
          className="flex-shrink-0 text-primary"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {icon}
        </motion.div>

        <div className="flex-1 min-w-0">
          <motion.h3
            className="font-semibold text-sm text-foreground"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            {title}
          </motion.h3>

          {description && (
            <motion.p
              className="text-xs text-muted-foreground mt-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {description}
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatedCard>
  );
}

