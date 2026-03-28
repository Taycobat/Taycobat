import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { getDisplayName } from '../lib/user'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { label: 'Clients', path: '/clients', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Devis', path: '/devis', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Factures', path: '/factures', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { label: 'Chantiers', path: '/chantiers', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { label: 'Planning', path: '/planning', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Bibliothèque', path: '/bibliotheque', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { label: 'Signature', path: '/signature', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
  { label: 'Sous-traitants', path: '/sous-traitants', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { label: 'Notifications', path: '/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
]

const bottomItems = [
  { label: 'Conformité', path: '/conformite', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { label: 'Attestation TVA', path: '/attestation-tva', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  { label: 'Export FEC', path: '/export-fec', icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Tarifs', path: '/tarifs', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
  { label: 'Paramètres', path: '/parametres', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

function NavIcon({ d }: { d: string }) {
  const paths = d.split(' M').map((p, i) => (i === 0 ? p : 'M' + p))
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      {paths.map((p, i) => <path key={i} strokeLinecap="round" strokeLinejoin="round" d={p} />)}
    </svg>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const displayName = getDisplayName(user)
  const email = user?.email || ''

  async function handleLogout() { await supabase.auth.signOut(); navigate('/login') }

  return (
    <motion.aside initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.3 }}
      className="w-[260px] min-h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="px-6 h-16 flex items-center gap-3 border-b border-gray-100">
        <div className="w-9 h-9 bg-[#1a9e52] rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div><span className="text-[15px] font-bold text-gray-900 tracking-tight">TAYCO BAT</span>
          <span className="block text-[11px] text-gray-400 -mt-0.5">Gestion BTP</span></div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">Principal</div>
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${isActive ? 'bg-[#1a9e52]/10 text-[#1a9e52]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
            <NavIcon d={item.icon} />{item.label}
          </NavLink>
        ))}
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">Outils</div>
        {bottomItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${isActive ? 'bg-[#1a9e52]/10 text-[#1a9e52]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
            <NavIcon d={item.icon} />{item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a9e52] to-emerald-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">{displayName.charAt(0).toUpperCase()}</div>
          <div className="flex-1 min-w-0"><div className="text-sm font-medium text-gray-900 truncate">{displayName}</div><div className="text-[11px] text-gray-400 truncate">{email}</div></div>
          <button onClick={handleLogout} title="Déconnexion" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
