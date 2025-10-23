import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'md', message, fullScreen = false }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const spinnerVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  };

  const containerVariants = {
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (fullScreen) {
    return (
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="flex flex-col items-center gap-4"
          variants={containerVariants}
          animate="animate"
        >
          <motion.div variants={spinnerVariants} animate="animate">
            <Loader2 className={`${sizeMap[size]} text-primary`} />
          </motion.div>
          {message && (
            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {message}
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex items-center gap-2"
      variants={containerVariants}
      animate="animate"
    >
      <motion.div variants={spinnerVariants} animate="animate">
        <Loader2 className={`${sizeMap[size]} text-primary`} />
      </motion.div>
      {message && (
        <motion.span
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {message}
        </motion.span>
      )}
    </motion.div>
  );
}

