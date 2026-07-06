import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Filter, Search } from 'lucide-react'
import { api } from '../api'

const SEV_LABELS = { critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo' }

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export default function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api.incidents.list({ status: filterStatus }).then(data => {
      setIncidents(data)
      setLoading(false)
    })
  }, [filterStatus])

  const filtered = incidents.filter(inc => {
    if (filterSeverity && inc.severity !== filterSeverity) return false
    if (search && !inc.title.toLowerCase().includes(search.toLowerCase()) &&
        !inc.equipment_name.toLowerCase().includes(search.toLowerCase()) &&
        !inc.rack.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Incidentes</div>
          <div className="page-subtitle">{incidents.filter(i => i.status === 'open').length} abertos · {incidents.filter(i => i.status === 'resolved').length} resolvidos</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/incidents/new')}>
          <AlertTriangle size={14} />
          Novo Incidente
        </button>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 32 }}
              placeholder="Buscar por título, equipamento ou rack..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-control" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="open">Abertos</option>
            <option value="resolved">Resolvidos</option>
          </select>
          <select className="form-control" style={{ width: 'auto' }} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
            <option value="">Todas as severidades</option>
            <option value="critical">Crítico</option>
            <option value="high">Alto</option>
            <option value="medium">Médio</option>
            <option value="low">Baixo</option>
          </select>
        </div>

        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div className="page-loading">Carregando incidentes...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <AlertTriangle size={32} />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>
                {search || filterStatus || filterSeverity ? 'Nenhum resultado encontrado' : 'Nenhum incidente'}
              </div>
              <p>{search ? 'Tente outros termos de busca.' : 'Registre o primeiro incidente para começar.'}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Equipamento</th>
                  <th>Rack</th>
                  <th>Severidade</th>
                  <th>Status</th>
                  <th>Criado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inc => (
                  <tr key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}>
                    <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{inc.id}</span></td>
                    <td style={{ fontWeight: 500 }}>{inc.title}</td>
                    <td><span className="mono" style={{ fontSize: 12 }}>{inc.equipment_name}</span></td>
                    <td><span className="mono" style={{ fontSize: 12 }}>{inc.rack}</span></td>
                    <td><span className={`badge badge-${inc.severity}`}>{SEV_LABELS[inc.severity]}</span></td>
                    <td><span className={`badge badge-${inc.status}`}>{inc.status === 'open' ? 'Aberto' : 'Resolvido'}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(inc.created_at)}</td>
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
