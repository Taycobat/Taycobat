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
      className="fixed inset-0 z-[200] bg-gradient-to-b from-white to-blue-50/40 flex flex-col items-center justify-center"
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
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="220" height="48" viewBox="0 0 200 44">
            <text x="0" y="34" fill="#1E40AF" fontSize="36" fontWeight="900" fontFamily="Arial Black, Arial" letterSpacing="-2">TAYCO</text>
            <rect x="130" y="4" width="3" height="32" fill="#1E40AF"/>
            <text x="139" y="24" fill="#64748B" fontSize="14" fontWeight="600" fontFamily="Arial" letterSpacing="4">BAT</text>
          </svg>
        </motion.div>
      </motion.div>

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
          className="h-full bg-gradient-to-r from-[#1E40AF] to-blue-400 rounded-full"
        />
      </div>
    </motion.div>
  )
}
