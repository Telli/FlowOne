import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  completed?: boolean;
  active?: boolean;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
}

export function ProgressIndicator({
  steps,
  currentStep,
  onStepClick
}: ProgressIndicatorProps) {
  return (
    <div className="w-full">
      {/* Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            className="flex flex-col items-center flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Step circle */}
            <motion.button
              onClick={() => onStepClick?.(index)}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                transition-all mb-2
                ${step.completed
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                    : 'bg-muted text-muted-foreground'
                }
              `}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              disabled={!onStepClick}
            >
              {step.completed ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <Check className="w-5 h-5" />
                </motion.div>
              ) : (
                index + 1
              )}
            </motion.button>

            {/* Step label */}
            <motion.span
              className={`text-xs font-medium text-center ${
                index === currentStep ? 'text-foreground' : 'text-muted-foreground'
              }`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.1 }}
            >
              {step.label}
            </motion.span>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <motion.div
                className="absolute h-1 bg-muted"
                style={{
                  width: `calc(100% / ${steps.length} - 20px)`,
                  left: `calc(50% + 20px)`,
                  top: '20px'
                }}
                initial={{ scaleX: 0 }}
                animate={{
                  scaleX: index < currentStep ? 1 : 0,
                  backgroundColor: index < currentStep ? '#10b981' : '#e5e7eb'
                }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <motion.div
        className="w-full h-1 bg-muted rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="h-full bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  );
}

/**
 * Linear progress bar component
 */
interface LinearProgressProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  animated?: boolean;
}

export function LinearProgress({
  value,
  label,
  showPercentage = true,
  animated = true
}: LinearProgressProps) {
  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">{Math.round(value)}%</span>
          )}
        </div>
      )}

      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary/80"
          initial={{ width: '0%' }}
          animate={{ width: `${value}%` }}
          transition={animated ? { duration: 0.5, ease: 'easeInOut' } : { duration: 0 }}
        />
      </div>
    </div>
  );
}

/**
 * Circular progress component
 */
interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function CircularProgress({
  value,
  size = 100,
  strokeWidth = 4,
  label
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-colors"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </svg>

      {label && (
        <motion.span
          className="text-sm font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}

