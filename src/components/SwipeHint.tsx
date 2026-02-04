'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'valoquick_swipe_hint_shown';

export default function SwipeHint() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show on mobile/touch devices
    const isTouchDevice = 'ontouchstart' in window || window.innerWidth < 768;
    if (!isTouchDevice) return;

    // Check if already shown
    const alreadyShown = localStorage.getItem(STORAGE_KEY);
    if (alreadyShown) return;

    // Show hint after a short delay
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    // Auto-hide after 6 seconds
    const hideTimer = setTimeout(() => {
      dismissHint();
    }, 7500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const dismissHint = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
          className="swipe-hint"
          onClick={dismissHint}
        >
          <div className="flex items-start gap-3">
            {/* Swipe icon with animation */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-brand swipe-hint-arrow"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary mb-0.5">
                Swipe to hide fields
              </p>
              <p className="text-xs text-text-tertiary">
                Swipe left on any field to hide it from your report. Swipe right to restore.
              </p>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={dismissHint}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-surface-200 text-text-tertiary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tap to dismiss hint */}
          <p className="text-[10px] text-text-tertiary text-center mt-2 opacity-60">
            Tap to dismiss
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
