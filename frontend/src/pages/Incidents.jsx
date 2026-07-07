import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Filter, Search, Check, X, Trash2, Clock } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../components/Toast'

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

function ApprovalBadge({ status }) {
  if (status === 'pending') return <span className="badge badge-medium">⏳ Pendente</span>
  if (status === 'rejected') return <span className="badge badge-critical">✗ Rejeitado</span>
  return null
}

export default function Incidents({ user }) {
  const [incidents, setIncidents] = useState([])
  const [myPending, setMyPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterApproval, setFilterApproval] = useState('')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const navigate = useNavigate()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'

  const load = () => {
    setLoading(true)
    const params = { status: filterStatus }
    if (isAdmin && filterApproval) params.approval_status = filterApproval
    api.incidents.list(params).then(data => {
      setIncidents(data)
      setLoading(false)
    })
  }

  const loadMyPending = () => {
    if (isAdmin || !user?.username) return
    api.incidents.list({ created_by: user.username }).then(data => {
      setMyPending(data.filter(i => i.approval_status === 'pending'))
    }).catch(() => {})
  }

  useEffect(() => { load() }, [filterStatus, filterApproval])
  useEffect(() => { loadMyPending() }, [])

  const filtered = incidents.filter(inc => {
    if (filterSeverity && inc.severity !== filterSeverity) return false
    if (search && !inc.title.toLowerCase().includes(search.toLowerCase()) &&
        !inc.equipment_name.toLowerCase().includes(search.toLowerCase()) &&
        !inc.rack.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleApprove = async (e, inc) => {
    e.stopPropagation()
    setBusyId(inc.id)
    try {
      await api.incidents.approve(inc.id, user?.username)
      toast('Incidente aprovado.', 'success')
      load()
    } catch {
      toast('Erro ao aprovar incidente.', 'error')
    }
    setBusyId(null)
  }

  const handleReject = async (e, inc) => {
    e.stopPropagation()
    setBusyId(inc.id)
    try {
      await api.incidents.reject(inc.id, user?.username)
      toast('Incidente rejeitado.', 'info')
      load()
    } catch {
      toast('Erro ao rejeitar incidente.', 'error')
    }
    setBusyId(null)
  }

  const handleDelete = async (e, inc) => {
    e.stopPropagation()
    if (!window.confirm(`Excluir o incidente "${inc.title}"? Essa ação não pode ser desfeita.`)) return
    setBusyId(inc.id)
    try {
      await api.incidents.remove(inc.id)
      toast('Incidente excluído.', 'success')
      load()
      loadMyPending()
    } catch {
      toast('Erro ao excluir incidente.', 'error')
    }
    setBusyId(null)
  }

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

        {/* Aviso pro técnico sobre os próprios incidentes pendentes */}
        {!isAdmin && myPending.length > 0 && (
          <div style={{ background: 'var(--yellow-dim)', border: '1px solid rgba(227,179,65,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={13} />
            Você tem {myPending.length} incidente{myPending.length > 1 ? 's' : ''} aguardando aprovação de um administrador: {myPending.map(i => i.title).join(', ')}
          </div>
        )}

        {/* Filtros */}
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
          {isAdmin && (
            <select className="form-control" style={{ width: 'auto' }} value={filterApproval} onChange={e => setFilterApproval(e.target.value)}>
              <option value="">Aprovados</option>
              <option value="pending">⏳ Pendentes de aprovação</option>
              <option value="rejected">✗ Rejeitados</option>
              <option value="all">Todos (qualquer status)</option>
            </select>
          )}
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
                  {isAdmin && <th>Aprovação</th>}
                  <th>Criado</th>
                  {isAdmin && <th>Ações</th>}
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
                    {isAdmin && <td><ApprovalBadge status={inc.approval_status} /></td>}
                    <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(inc.created_at)}</td>
                    {isAdmin && (
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {inc.approval_status === 'pending' && (
                            <>
                              <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--green)' }} disabled={busyId === inc.id} onClick={e => handleApprove(e, inc)} title="Aprovar">
                                <Check size={12} />
                              </button>
                              <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--red)' }} disabled={busyId === inc.id} onClick={e => handleReject(e, inc)} title="Rejeitar">
                                <X size={12} />
                              </button>
                            </>
                          )}
                          <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }} disabled={busyId === inc.id} onClick={e => handleDelete(e, inc)} title="Excluir">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    )}
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
