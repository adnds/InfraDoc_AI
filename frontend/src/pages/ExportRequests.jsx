import { useEffect, useState } from 'react'
import { Download, CheckCircle, XCircle, Clock, X, Eye } from 'lucide-react'
import { useToast } from '../components/Toast'

const BASE = '/api'
const req = async (path, opts = {}) => {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function fmt(iso) { return new Date(iso).toLocaleString('pt-BR') }

function StatusBadge({ status }) {
  if (status === 'approved') return <span className="badge badge-online">✓ Aprovado</span>
  if (status === 'rejected') return <span className="badge badge-critical">✗ Negado</span>
  if (status === 'pending') return <span className="badge badge-medium">⏳ Pendente</span>
  return <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>—</span>
}

function ReviewModal({ request, onClose, onReview }) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (status) => {
    setLoading(true)
    await onReview(request.id, status, note)
    setLoading(false)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-title">Revisar Solicitação</div>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Solicitante</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', marginBottom: 10 }}>{request.requested_by}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Incidente</div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{request.incident_title}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>#{request.incident_id}</div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>Motivo informado</div>
            <div style={{ background: 'var(--bg-base)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, border: '1px solid var(--border)' }}>
              {request.reason}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nota da revisão <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
            <textarea className="form-control" rows={3} placeholder="Ex: Aprovado para uso interno. / Negado — motivo insuficiente." value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={() => handle('rejected')} disabled={loading}>
            <XCircle size={13} /> Negar
          </button>
          <button className="btn btn-primary" onClick={() => handle('approved')} disabled={loading} style={{ background: 'var(--green)', color: '#0d1117' }}>
            <CheckCircle size={13} /> Aprovar
          </button>
        </div>
      </div>
    </div>
  )
}

function MyRequests({ user }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/export-requests?requested_by=${user?.username}`)
      .then(r => r.json())
      .then(data => { setRequests(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading">Carregando...</div>
  if (requests.length === 0) return (
    <div className="empty-state">
      <Clock size={32} />
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>Nenhuma solicitação</div>
      <p>Suas solicitações de exportação aparecerão aqui.</p>
    </div>
  )

  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="data-table">
        <thead>
          <tr><th>Incidente</th><th>Motivo</th><th>Status</th><th>Data</th></tr>
        </thead>
        <tbody>
          {requests.map(r => (
            <tr key={r.id}>
              <td>
                <div style={{ fontWeight: 500 }}>{r.incident_title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>#{r.incident_id}</div>
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 300 }}>{r.reason}</td>
              <td>
                <StatusBadge status={r.status} />
                {r.review_note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{r.review_note}</div>}
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ExportRequests({ user }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [reviewTarget, setReviewTarget] = useState(null)
  const toast = useToast()
  const isAdmin = user?.role === 'admin'

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter) params.set('status', filter)
    req(`/export-requests?${params}`).then(data => { setRequests(data); setLoading(false) })
  }

  useEffect(() => { load() }, [filter])

  const handleReview = async (reqId, status, note) => {
    await req(`/export-requests/${reqId}/review`, {
      method: 'PATCH',
      body: { status, reviewed_by: user?.username, review_note: note || null }
    })
    toast(status === 'approved' ? 'Solicitação aprovada!' : 'Solicitação negada.', status === 'approved' ? 'success' : 'error')
    setReviewTarget(null)
    load()
  }

  if (!isAdmin) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-title">Minhas Solicitações</div>
            <div className="page-subtitle">Acompanhe o status das suas solicitações de exportação</div>
          </div>
        </div>
        <div className="page-body"><MyRequests user={user} /></div>
      </>
    )
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Solicitações de Exportação</div>
          <div className="page-subtitle">
            {pendingCount > 0
              ? <span style={{ color: 'var(--yellow)' }}>⚠ {pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
              : 'Nenhuma pendente'}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['pending', '⏳ Pendentes'], ['approved', '✓ Aprovadas'], ['rejected', '✗ Negadas'], ['', 'Todas']].map(([val, label]) => (
            <button key={val} className={`btn ${filter === val ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 12 }} onClick={() => setFilter(val)}>
              {label}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div className="page-loading">Carregando...</div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <Download size={32} />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>Nenhuma solicitação</div>
              <p>Solicitações de exportação dos técnicos aparecerão aqui.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Solicitante</th>
                  <th>Incidente</th>
                  <th>Motivo</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td><span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{r.requested_by}</span></td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{r.incident_title}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>#{r.incident_id}</div>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>{r.reason}</div>
                      {r.review_note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Nota: {r.review_note}</div>}
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt(r.created_at)}</td>
                    <td>
                      {r.status === 'pending' ? (
                        <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => setReviewTarget(r)}>
                          <Eye size={11} /> Revisar
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>por {r.reviewed_by}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {reviewTarget && <ReviewModal request={reviewTarget} onClose={() => setReviewTarget(null)} onReview={handleReview} />}
    </>
  )
}
