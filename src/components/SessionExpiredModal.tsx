'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

export default function SessionExpiredModal() {
  const { sessionExpired, signIn } = useAuth();

  if (!sessionExpired) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-card p-6 sm:p-8 max-w-md w-full text-center"
        >
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
            Session Active Elsewhere
          </h2>

          {/* Message */}
          <p className="text-sm sm:text-base text-text-secondary mb-6">
            Your account is signed in on another device.
            Each account can only be active on one device at a time.
          </p>

          {/* Sign In Button */}
          <button
            onClick={() => signIn()}
            className="w-full btn btn-primary py-3 rounded-xl font-semibold"
          >
            Sign In on This Device
          </button>

          <p className="text-xs text-text-tertiary mt-4">
            This will sign you out of the other device automatically.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
