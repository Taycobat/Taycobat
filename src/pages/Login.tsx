import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { t, languages } from '../lib/i18n'
import { useLangStore } from '../store/langStore'
import { useAuthStore } from '../store/authStore'
import LanguageSelector from '../components/LanguageSelector'
import SplashScreen from '../components/SplashScreen'

export default function Login() {
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuthStore()
  const { lang } = useLangStore()
  const dir = languages.find((l) => l.code === lang)?.dir ?? 'ltr'
  const isRtl = dir === 'rtl'

  const [showSplash, setShowSplash] = useState(false)
  const [splashName, setSplashName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Already logged in — redirect to dashboard
  if (!authLoading && session) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(t(lang, 'loginError'))
    } else {
      const prenom = data.user?.user_metadata?.prenom || data.user?.user_metadata?.full_name || ''
      setSplashName(prenom)
      setShowSplash(true)
      setTimeout(() => navigate('/dashboard'), 1500)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError(t(lang, 'passwordMismatch'))
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setLoading(false)
    if (error) {
      setError(t(lang, 'signupError'))
    } else {
      setSuccess(t(lang, 'signupSuccess'))
    }
  }

  return (
    <>
    <AnimatePresence>{showSplash && <SplashScreen message={splashName ? `Bonjour ${splashName}...` : 'Chargement de votre espace...'} />}</AnimatePresence>
    <div dir={dir} className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#1E40AF] via-[#1D4ED8] to-[#1e3a8a]">
        {/* Decorative shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-white/5" />
          <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-white/3" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="44" viewBox="0 0 200 44">
              <text x="0" y="34" fill="#ffffff" fontSize="36" fontWeight="900" fontFamily="Arial Black, Arial" letterSpacing="-2">TAYCO</text>
              <rect x="130" y="4" width="3" height="32" fill="#ffffff"/>
              <text x="139" y="24" fill="rgba(255,255,255,0.7)" fontSize="14" fontWeight="600" fontFamily="Arial" letterSpacing="4">BAT</text>
            </svg>
          </motion.div>

          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="space-y-6"
          >
            <h1 className="text-5xl xl:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              {t(lang, 'welcome').split('TAYCOBAT')[0]}
              <span className="text-blue-200">TAYCOBAT</span>
              {t(lang, 'welcome').split('TAYCOBAT')[1]}
            </h1>
            <p className="text-xl text-blue-100/80 max-w-md leading-relaxed">
              {t(lang, 'subtitle')}
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex gap-12"
          >
            {[
              { value: '500+', label: 'Chantiers' },
              { value: '12', label: 'Pays' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-blue-200/60 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col bg-gray-50 min-h-screen">
        {/* Top bar */}
        <div className={`flex items-center justify-between p-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
          {/* Mobile logo */}
          <div className="lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="140" height="32" viewBox="0 0 200 44">
              <text x="0" y="34" fill="#1E40AF" fontSize="36" fontWeight="900" fontFamily="Arial Black, Arial" letterSpacing="-2">TAYCO</text>
              <rect x="130" y="4" width="3" height="32" fill="#1E40AF"/>
              <text x="139" y="24" fill="#64748B" fontSize="14" fontWeight="600" fontFamily="Arial" letterSpacing="4">BAT</text>
            </svg>
          </div>
          <div className="lg:block hidden" />
          <LanguageSelector />
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-[420px]"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                {mode === 'login' ? t(lang, 'login') : t(lang, 'signup')}
              </h2>
              <p className="text-gray-500 mt-2">
                {mode === 'login' ? t(lang, 'subtitle') : t(lang, 'subtitle')}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm"
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-sm"
              >
                {success}
              </motion.div>
            )}

            <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.25 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t(lang, 'fullName')}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] transition-all"
                    required
                    dir={dir}
                  />
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t(lang, 'email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] transition-all"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t(lang, 'password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] transition-all"
                  required
                  dir="ltr"
                />
              </div>

              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.25 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t(lang, 'confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] transition-all"
                    required
                    dir="ltr"
                  />
                </motion.div>
              )}

              {mode === 'login' && (
                <div className={`flex justify-end ${isRtl ? 'justify-start' : ''}`}>
                  <button
                    type="button"
                    className="text-sm text-[#1E40AF] hover:text-blue-700 font-medium transition-colors cursor-pointer"
                  >
                    {t(lang, 'forgotPassword')}
                  </button>
                </div>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 bg-[#1E40AF] hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mx-auto text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : mode === 'login' ? (
                  t(lang, 'login')
                ) : (
                  t(lang, 'signup')
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400">{t(lang, 'or')}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Toggle mode */}
            <p className="text-center text-sm text-gray-500">
              {mode === 'login' ? t(lang, 'noAccount') : t(lang, 'hasAccount')}{' '}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login')
                  setError('')
                  setSuccess('')
                }}
                className="text-[#1E40AF] hover:text-blue-700 font-semibold transition-colors cursor-pointer"
              >
                {mode === 'login' ? t(lang, 'signup') : t(lang, 'login')}
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
    </>
  )
}
