'use client';

import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { useCallback, useState, useEffect } from 'react';

interface SwipeableFieldProps {
  fieldName: string;
  isHidden: boolean;
  onHide: (fieldName: string) => void;
  onRestore: (fieldName: string) => void;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 80; // pixels to trigger hide/restore

export default function SwipeableField({
  fieldName,
  isHidden,
  onHide,
  onRestore,
  children,
}: SwipeableFieldProps) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Transform x motion to opacity for visual feedback
  const hideIndicatorOpacity = useTransform(x, [-100, -40, 0], [0.4, 0.1, 0]);
  const restoreIndicatorOpacity = useTransform(x, [0, 40, 100], [0, 0.1, 0.4]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;

      // Use velocity to make it feel more natural - fast swipes can trigger with less distance
      const effectiveOffset = offset + velocity * 0.1;

      if (effectiveOffset < -SWIPE_THRESHOLD && !isHidden) {
        // Swipe left to hide
        onHide(fieldName);
      } else if (effectiveOffset > SWIPE_THRESHOLD && isHidden) {
        // Swipe right to restore
        onRestore(fieldName);
      }

      // Spring back to center
      controls.start({
        x: 0,
        transition: {
          type: 'spring',
          stiffness: 500,
          damping: 30,
          mass: 0.8,
        },
      });
    },
    [isHidden, onHide, onRestore, fieldName, controls]
  );

  const handleDesktopHide = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onHide(fieldName);
    },
    [onHide, fieldName]
  );

  const handleDesktopRestore = useCallback(() => {
    if (isHidden && !isMobile) {
      onRestore(fieldName);
    }
  }, [isHidden, isMobile, onRestore, fieldName]);

  return (
    <div
      className={`swipeable-field relative ${isHidden ? 'field-hidden' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Swipe indicators (mobile) */}
      {isMobile && (
        <>
          {/* Hide indicator (red) - shows when swiping left */}
          <motion.div
            className="absolute inset-0 bg-red-500 rounded-xl pointer-events-none z-0"
            style={{ opacity: hideIndicatorOpacity }}
          />
          {/* Restore indicator (green) - shows when swiping right on hidden field */}
          {isHidden && (
            <motion.div
              className="absolute inset-0 bg-green-500 rounded-xl pointer-events-none z-0"
              style={{ opacity: restoreIndicatorOpacity }}
            />
          )}
        </>
      )}

      <motion.div
        drag={isMobile ? 'x' : false}
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative z-10"
        whileDrag={{ cursor: 'grabbing' }}
      >
        <div
          className={`transition-all duration-300 ${
            isHidden ? 'opacity-40 field-content-hidden' : ''
          }`}
          onClick={handleDesktopRestore}
          style={{ cursor: isHidden && !isMobile ? 'pointer' : 'default' }}
        >
          {children}
        </div>
      </motion.div>

      {/* Desktop minus button */}
      {!isMobile && !isHidden && (
        <button
          type="button"
          onClick={handleDesktopHide}
          className={`field-hide-btn ${isHovered ? 'field-hide-btn-visible' : ''}`}
          title="Hide this field"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
      )}

      {/* Desktop restore hint */}
      {!isMobile && isHidden && isHovered && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <span className="text-xs text-text-tertiary bg-surface-200/80 px-2 py-1 rounded-lg backdrop-blur-sm">
            Click to restore
          </span>
        </div>
      )}
    </div>
  );
}
