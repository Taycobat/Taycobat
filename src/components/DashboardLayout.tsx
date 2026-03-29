import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Onboarding from './Onboarding'

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-[#f8f9fb]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <Onboarding />
    </div>
  )
}
