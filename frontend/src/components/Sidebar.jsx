import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, AlertTriangle, Server, PlusCircle, FileText, Activity, Users, LogOut, Shield, BookOpen, Download } from 'lucide-react'

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Incidentes', icon: AlertTriangle, path: '/incidents' },
  { label: 'Novo Incidente', icon: PlusCircle, path: '/incidents/new' },
  { label: 'Inventário', icon: Server, path: '/assets' },
  { label: 'Relatórios', icon: FileText, path: '/reports' },
  { label: 'Base de Conhecimento', icon: BookOpen, path: '/kb' },
]

export default function Sidebar({ openCount = 0, user, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <Activity size={16} />
          InfraDoc<span>AI</span>
        </div>
        <div className="logo-sub">v1.0 · diagnóstico inteligente</div>
      </div>

      <div className="sidebar-nav">
        <div className="nav-section-label">Menu</div>
        {NAV.map(item => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)
          return (
            <div key={item.path} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => navigate(item.path)}>
              <item.icon size={15} />
              {item.label}
              {item.label === 'Incidentes' && openCount > 0 && (
                <span className="nav-badge">{openCount}</span>
              )}
            </div>
          )
        })}

        {user?.role === 'admin' && (
          <>
            <div className="nav-section-label" style={{ marginTop: 8 }}>Administração</div>
            <div
              className={`nav-item ${location.pathname === '/users' ? 'active' : ''}`}
              onClick={() => navigate('/users')}
            >
              <Users size={15} />
              Usuários
            </div>
            <div
              className={`nav-item ${location.pathname === '/export-requests' ? 'active' : ''}`}
              onClick={() => navigate('/export-requests')}
            >
              <Download size={15} />
              Exportações
            </div>
          </>
        )}
      </div>

      {/* User info + logout */}
      <div style={{ padding: '12px 12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {user?.role === 'admin'
              ? <Shield size={13} color="var(--accent)" />
              : <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {user?.role === 'admin' ? 'Administrador' : 'Técnico'}
            </div>
          </div>
        </div>

        <button
          className="nav-item"
          style={{ width: '100%', color: 'var(--red)', fontSize: 12 }}
          onClick={onLogout}
        >
          <LogOut size={13} />
          Sair
        </button>

        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
          <span style={{ color: 'var(--accent)' }}>●</span> API online · modo mock
        </div>
      </div>
    </nav>
  )
}
