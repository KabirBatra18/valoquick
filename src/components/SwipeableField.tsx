'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useCallback, useState, useEffect, useRef } from 'react';

interface SwipeableFieldProps {
  fieldName: string;
  isHidden: boolean;
  onHide: (fieldName: string) => void;
  onRestore: (fieldName: string) => void;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 60;

export default function SwipeableField({
  fieldName,
  isHidden,
  onHide,
  onRestore,
  children,
}: SwipeableFieldProps) {
  const x = useMotionValue(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  // Stable refs for callbacks used in native event listeners
  const isHiddenRef = useRef(isHidden);
  const onHideRef = useRef(onHide);
  const onRestoreRef = useRef(onRestore);
  const fieldNameRef = useRef(fieldName);
  useEffect(() => { isHiddenRef.current = isHidden; }, [isHidden]);
  useEffect(() => { onHideRef.current = onHide; }, [onHide]);
  useEffect(() => { onRestoreRef.current = onRestore; }, [onRestore]);
  useEffect(() => { fieldNameRef.current = fieldName; }, [fieldName]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Transform x motion to opacity for visual feedback
  const hideIndicatorOpacity = useTransform(x, [-100, -30, 0], [0.35, 0.12, 0]);
  const restoreIndicatorOpacity = useTransform(x, [0, 30, 100], [0, 0.12, 0.35]);

  // Native DOM touch listeners — passive: false on touchmove allows
  // preventDefault() to actually block scrolling during a swipe,
  // which eliminates the stutter from scroll + transform fighting.
  useEffect(() => {
    if (!isMobile || !containerRef.current) return;

    const el = containerRef.current;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - touchStartX.current;
      const deltaY = e.touches[0].clientY - touchStartY.current;

      if (!isSwiping.current && Math.abs(deltaX) > 10) {
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          isSwiping.current = true;
        }
      }

      if (isSwiping.current) {
        e.preventDefault();  // works because { passive: false }
        e.stopPropagation(); // prevents page-level tab swipe
        x.set(deltaX * 0.7);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (isSwiping.current) {
        e.stopPropagation();
      }

      const currentX = x.get();

      if (currentX < -SWIPE_THRESHOLD && !isHiddenRef.current) {
        onHideRef.current(fieldNameRef.current);
      } else if (currentX > SWIPE_THRESHOLD && isHiddenRef.current) {
        onRestoreRef.current(fieldNameRef.current);
      }

      // Spring back — animate the motionValue directly for butter-smooth result
      animate(x, 0, { type: 'spring', stiffness: 600, damping: 35, mass: 0.6 });
      isSwiping.current = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile, x]);

  const handleDesktopHide = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
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
      ref={containerRef}
      className={`swipeable-field relative ${isHidden ? 'field-hidden' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ willChange: isMobile ? 'transform' : undefined }}
    >
      {/* Desktop minus button */}
      {!isMobile && !isHidden && (
        <button
          type="button"
          onClick={handleDesktopHide}
          className={`field-hide-btn ${isHovered ? 'field-hide-btn-visible' : ''}`}
          title="Hide this field"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
      )}

      {/* Swipe indicators (mobile) */}
      {isMobile && (
        <>
          <motion.div
            className="absolute inset-0 bg-red-500 rounded-xl pointer-events-none z-0"
            style={{ opacity: hideIndicatorOpacity }}
          />
          {isHidden && (
            <motion.div
              className="absolute inset-0 bg-emerald-500 rounded-xl pointer-events-none z-0"
              style={{ opacity: restoreIndicatorOpacity }}
            />
          )}
        </>
      )}

      <motion.div
        style={{ x, willChange: 'transform' }}
        className="relative z-10"
      >
        <div
          className={`transition-opacity duration-300 ${isHidden ? 'opacity-40 field-content-hidden' : ''}`}
          onClick={handleDesktopRestore}
          style={{ cursor: isHidden && !isMobile ? 'pointer' : 'default' }}
        >
          {children}
        </div>
      </motion.div>

      {/* Desktop restore hint */}
      {!isMobile && isHidden && isHovered && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <span className="text-xs text-text-tertiary bg-surface-200/90 px-2 py-1 rounded-lg backdrop-blur-sm">
            Click to restore
          </span>
        </div>
      )}
    </div>
  );
}
