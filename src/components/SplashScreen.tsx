import { motion } from 'framer-motion'

interface Props {
  message?: string
  onDone?: () => void
  duration?: number
}

export default function SplashScreen({ message = 'Chargement...', onDone, duration = 1500 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      onAnimationComplete={(def) => { if ((def as { opacity?: number }).opacity === 0 && onDone) onDone() }}
      className="fixed inset-0 z-[200] bg-gradient-to-b from-white to-emerald-50/40 flex flex-col items-center justify-center"
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-8"
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 bg-[#1a9e52] rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/20"
        >
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </motion.div>
      </motion.div>

      {/* App name */}
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-2xl font-bold text-gray-900 tracking-tight mb-2"
      >
        TAYCOBAT
      </motion.h1>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-sm text-gray-400 mb-10"
      >
        {message}
      </motion.p>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: duration / 1000, ease: 'easeInOut' }}
          className="h-full bg-gradient-to-r from-[#1a9e52] to-emerald-400 rounded-full"
        />
      </div>
    </motion.div>
  )
}
