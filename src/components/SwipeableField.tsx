'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCallback } from 'react';

interface SwipeableFieldProps {
  fieldName: string;
  isHidden: boolean;
  onHide: (fieldName: string) => void;
  onRestore: (fieldName: string) => void;
  children: React.ReactNode;
}

export default function SwipeableField({
  fieldName,
  isHidden,
  onHide,
  onRestore,
  children,
}: SwipeableFieldProps) {
  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (isHidden) {
        onRestore(fieldName);
      } else {
        onHide(fieldName);
      }
    },
    [isHidden, onHide, onRestore, fieldName]
  );

  return (
    <div className="swipeable-field relative group">
      <AnimatePresence mode="wait">
        <motion.div
          key={isHidden ? 'hidden' : 'visible'}
          initial={{ opacity: 0.5, height: isHidden ? 'auto' : 'auto' }}
          animate={{ opacity: isHidden ? 0.35 : 1, height: 'auto' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className={`transition-all duration-200 ${isHidden ? 'field-content-hidden' : ''}`}>
            {children}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Toggle button — always visible at subtle opacity, prominent on hover/focus */}
      <button
        type="button"
        onClick={handleToggle}
        className={`absolute top-1/2 -translate-y-1/2 right-1 z-20 p-1.5 rounded-lg transition-all duration-200
          ${isHidden
            ? 'opacity-70 hover:opacity-100 text-emerald-400 hover:bg-emerald-500/10'
            : 'opacity-30 group-hover:opacity-70 hover:!opacity-100 text-text-tertiary hover:bg-red-500/10 hover:text-red-400'
          }`}
        title={isHidden ? 'Show this field' : 'Hide this field'}
      >
        {isHidden ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        )}
      </button>
    </div>
  );
}
