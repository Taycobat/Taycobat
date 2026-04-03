import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const COOKIE_KEY = 'tayco_cookies_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY)
    if (!consent) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(COOKIE_KEY, 'accepted')
    setVisible(false)
  }

  function refuse() {
    localStorage.setItem(COOKIE_KEY, 'refused')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 shadow-2xl shadow-black/10 px-6 py-5"
        >
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-700 font-medium mb-1">Ce site utilise des cookies</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Nous utilisons des cookies essentiels au fonctionnement du site et des cookies analytiques
                pour ameliorer votre experience. Conformement au RGPD et aux recommandations de la CNIL,
                vous pouvez accepter ou refuser les cookies non essentiels.{' '}
                <a href="/politique-confidentialite" className="text-[#1E40AF] underline">En savoir plus</a>
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={refuse}
                className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl transition-colors cursor-pointer">
                Refuser
              </button>
              <button onClick={accept}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1E40AF] hover:bg-blue-700 rounded-xl transition-colors cursor-pointer">
                Accepter
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
