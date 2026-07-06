import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { AlertTriangle, Server, CheckCircle, Clock, Zap } from 'lucide-react'
import { api } from '../api'

const SEVERITY_COLORS = {
  critical: '#f85149',
  high: '#f06501',
  medium: '#e3b341',
  low: '#388bfd'
}

const SEV_LABELS = { critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo' }

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.stats().then(setStats).catch(console.error)
  }, [])

  if (!stats) return <div className="page-loading">Carregando dashboard...</div>

  const severityData = stats.by_severity.map(s => ({
    name: SEV_LABELS[s.severity] || s.severity,
    value: s.count,
    color: SEVERITY_COLORS[s.severity] || '#888'
  }))

  const rackData = stats.by_rack.map(r => ({ name: r.rack, incidentes: r.count }))

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Visão geral da infraestrutura e incidentes ativos</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/incidents/new')}>
          <AlertTriangle size={14} />
          Novo Incidente
        </button>
      </div>

      <div className="page-body">
        {/* Stat cards */}
        <div className="stats-grid">
          <div className="stat-card danger">
            <div className="stat-label">Incidentes Abertos</div>
            <div className="stat-value">{stats.open_incidents}</div>
            <div className="stat-sub">requer atenção</div>
          </div>
          <div className="stat-card success">
            <div className="stat-label">Resolvidos</div>
            <div className="stat-value">{stats.resolved_incidents}</div>
            <div className="stat-sub">total histórico</div>
          </div>
          <div className="stat-card accent">
            <div className="stat-label">Total de Assets</div>
            <div className="stat-value">{stats.total_assets}</div>
            <div className="stat-sub">em inventário</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-label">Assets Degradados</div>
            <div className="stat-value">{stats.degraded_assets}</div>
            <div className="stat-sub">monitorar</div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-grid">
          <div className="card">
            <div className="card-title">Incidentes por Severidade (abertos)</div>
            {severityData.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nenhum incidente aberto
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                    {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="card-title">Incidentes por Rack</div>
            {rackData.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={rackData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
                  <Bar dataKey="incidentes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent incidents */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Incidentes Recentes</div>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/incidents')}>
              Ver todos →
            </button>
          </div>

          {stats.recent_incidents.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={32} />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>Tudo tranquilo</div>
              <p>Nenhum incidente registrado ainda.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Severidade</th>
                  <th>Status</th>
                  <th>Criado</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_incidents.map(inc => (
                  <tr key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}>
                    <td><span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{inc.id}</span></td>
                    <td style={{ maxWidth: 300 }}>{inc.title}</td>
                    <td><span className={`badge badge-${inc.severity}`}>{SEV_LABELS[inc.severity]}</span></td>
                    <td><span className={`badge badge-${inc.status}`}>{inc.status === 'open' ? 'Aberto' : 'Resolvido'}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{timeAgo(inc.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
