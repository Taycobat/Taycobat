import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/">
            <svg xmlns="http://www.w3.org/2000/svg" width="140" height="32" viewBox="0 0 200 44">
              <text x="0" y="34" fill="#1E40AF" fontSize="36" fontWeight="900" fontFamily="Arial Black, Arial" letterSpacing="-2">TAYCO</text>
              <rect x="130" y="4" width="3" height="32" fill="#1E40AF"/>
              <text x="139" y="24" fill="#64748B" fontSize="14" fontWeight="600" fontFamily="Arial" letterSpacing="4">BAT</text>
            </svg>
          </Link>
          <div className="flex gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              Accueil
            </Link>
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
          </div>
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
