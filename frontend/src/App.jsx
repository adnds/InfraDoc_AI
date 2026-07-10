import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import { ToastProvider } from './components/Toast'
import Dashboard from './pages/Dashboard'
import Incidents from './pages/Incidents'
import NewIncident from './pages/NewIncident'
import IncidentDetail from './pages/IncidentDetail'
import Assets from './pages/Assets'
import Reports from './pages/Reports'
import Login from './pages/Login'
import Users from './pages/Users'
import KnowledgeBase from './pages/KnowledgeBase'
import ExportRequests from './pages/ExportRequests'
import AILogs from './pages/AILogs'
import { api } from './api'

function Shell({ user, onLogout }) {
  const [openCount, setOpenCount] = useState(0)
  const [pendingUsers, setPendingUsers] = useState(0)
  const [groqConnected, setGroqConnected] = useState(null)

  useEffect(() => {
    api.incidents.list({ status: 'open' }).then(data => setOpenCount(data.length)).catch(() => {})
    if (user?.role === 'admin') {
      api.users.list({ status: 'pending' }).then(data => setPendingUsers(data.length)).catch(() => {})
    }
    // Verificar conexão com Groq na inicialização
    fetch('/api/health/groq').then(r => r.json()).then(data => {
      setGroqConnected(data.connected)
    }).catch(() => setGroqConnected(false))
  }, [])

  return (
    <div className="app-shell">
      <Sidebar openCount={openCount} pendingUsers={pendingUsers} groqConnected={groqConnected} user={user} onLogout={onLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents user={user} />} />
          <Route path="/incidents/new" element={<NewIncident user={user} />} />
          <Route path="/incidents/:id" element={<IncidentDetail user={user} />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/reports" element={<Reports user={user} />} />
          <Route path="/users" element={<Users user={user} />} />
          <Route path="/kb" element={<KnowledgeBase user={user} />} />
          <Route path="/export-requests" element={<ExportRequests user={user} />} />
          <Route path="/ai-logs" element={<AILogs user={user} />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('infradoc_user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (userData) => {
    localStorage.setItem('infradoc_user', JSON.stringify(userData))
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('infradoc_user')
    setUser(null)
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        {!user
          ? <Login onLogin={handleLogin} />
          : <Shell user={user} onLogout={handleLogout} />
        }
      </ToastProvider>
    </BrowserRouter>
  )
}
