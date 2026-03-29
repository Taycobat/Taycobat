import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import SplashScreen from './SplashScreen'

export default function ProtectedRoute() {
  const { session, user, loading } = useAuthStore()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowSplash(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [loading])

  if (loading || showSplash) {
    const prenom = user?.user_metadata?.prenom || ''
    return (
      <AnimatePresence>
        <SplashScreen
          message={prenom ? `Bonjour ${prenom}...` : 'Chargement de votre espace...'}
          duration={1200}
        />
      </AnimatePresence>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
