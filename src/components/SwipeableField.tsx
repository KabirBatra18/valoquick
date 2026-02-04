'use client';

import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { useCallback, useState, useEffect, useRef } from 'react';

interface SwipeableFieldProps {
  fieldName: string;
  isHidden: boolean;
  onHide: (fieldName: string) => void;
  onRestore: (fieldName: string) => void;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 60; // pixels to trigger hide/restore

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch tracking for manual swipe detection
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

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
  const hideIndicatorOpacity = useTransform(x, [-100, -30, 0], [0.5, 0.15, 0]);
  const restoreIndicatorOpacity = useTransform(x, [0, 30, 100], [0, 0.15, 0.5]);

  // Manual touch handlers for mobile - works over inputs
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Only start tracking swipe if horizontal movement is greater than vertical
    if (!isSwiping.current && Math.abs(deltaX) > 10) {
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        isSwiping.current = true;
      }
    }

    if (isSwiping.current) {
      // Prevent vertical scroll while swiping horizontally
      e.preventDefault();
      // Update the motion value for visual feedback
      x.set(deltaX * 0.5); // Dampen the movement
    }
  }, [x]);

  const handleTouchEnd = useCallback(() => {
    const currentX = x.get();

    if (currentX < -SWIPE_THRESHOLD && !isHidden) {
      onHide(fieldName);
    } else if (currentX > SWIPE_THRESHOLD && isHidden) {
      onRestore(fieldName);
    }

    // Spring back
    controls.start({
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.8,
      },
    });
    x.set(0);
    isSwiping.current = false;
  }, [x, isHidden, onHide, onRestore, fieldName, controls]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;

      // Use velocity to make it feel more natural
      const effectiveOffset = offset + velocity * 0.1;

      if (effectiveOffset < -SWIPE_THRESHOLD && !isHidden) {
        onHide(fieldName);
      } else if (effectiveOffset > SWIPE_THRESHOLD && isHidden) {
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
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {/* Desktop minus button - positioned on the LEFT to avoid dropdown conflict */}
      {!isMobile && !isHidden && (
        <button
          type="button"
          onClick={handleDesktopHide}
          className={`field-hide-btn ${isHovered ? 'field-hide-btn-visible' : ''}`}
          title="Hide this field"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
      )}

      {/* Swipe indicators (mobile) */}
      {isMobile && (
        <>
          {/* Hide indicator (red) - shows when swiping left */}
          <motion.div
            className="absolute inset-0 bg-red-500/20 rounded-xl pointer-events-none z-0"
            style={{ opacity: hideIndicatorOpacity }}
          />
          {/* Restore indicator (green) - shows when swiping right on hidden field */}
          {isHidden && (
            <motion.div
              className="absolute inset-0 bg-green-500/20 rounded-xl pointer-events-none z-0"
              style={{ opacity: restoreIndicatorOpacity }}
            />
          )}
        </>
      )}

      <motion.div
        drag={false} // Disable framer-motion drag, use manual touch handling
        animate={controls}
        style={{ x }}
        className="relative z-10"
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
