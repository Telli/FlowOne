import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface EnhancedToastProps {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle
};

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900'
};

export function EnhancedToast({
  id,
  type,
  title,
  description,
  duration = 4000,
  onClose
}: EnhancedToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = iconMap[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, x: 100 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 100 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className={`${colorMap[type]} border rounded-lg p-4 shadow-lg flex items-start gap-3 max-w-md`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
      >
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      </motion.div>

      <div className="flex-1 min-w-0">
        <motion.h3
          className="font-semibold text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {title}
        </motion.h3>
        {description && (
          <motion.p
            className="text-xs opacity-90 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {description}
          </motion.p>
        )}
      </div>

      <motion.button
        onClick={handleClose}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <X className="w-4 h-4" />
      </motion.button>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-current opacity-30"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

/**
 * Toast container component
 */
interface ToastContainerProps {
  toasts: EnhancedToastProps[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <EnhancedToast {...toast} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

