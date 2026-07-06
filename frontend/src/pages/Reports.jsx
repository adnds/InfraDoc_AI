import { useEffect, useState } from 'react'
import { FileText, Printer, Send, X, CheckCircle, Clock, XCircle, Lock } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../components/Toast'

const SEV_LABELS = { critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo' }
const TYPE_LABELS = { server: 'Servidor', switch: 'Switch', firewall: 'Firewall', pdu: 'PDU', ups: 'No-break', storage: 'Storage', router: 'Roteador', other: 'Outro' }

function fmt(iso) { return new Date(iso).toLocaleString('pt-BR') }

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

function RequestModal({ incident, user, onClose, onSent }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (!reason.trim()) { setError('O motivo é obrigatório.'); return }
    if (reason.trim().length < 15) { setError('Descreva o motivo com pelo menos 15 caracteres.'); return }
    setLoading(true)
    try {
      await req('/export-requests', {
        method: 'POST',
        body: {
          incident_id: incident.id,
          incident_title: incident.title,
          requested_by: user.username,
          reason: reason.trim()
        }
      })
      onSent()
    } catch {
      setError('Erro ao enviar solicitação.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div className="modal-title">Solicitar Exportação</div>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 12 }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Incidente selecionado:</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{incident.title}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>#{incident.id}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Motivo da Exportação <span className="form-required">*</span></label>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              Informe por que você precisa exportar este relatório. O administrador irá revisar sua solicitação.
            </div>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Ex: Necessário para apresentação ao cliente sobre o incidente ocorrido em 04/07/2026 no rack A2..."
              value={reason}
              onChange={e => { setReason(e.target.value); setError('') }}
              autoFocus
            />
            <div style={{ fontSize: 11, color: reason.length < 15 ? 'var(--text-muted)' : 'var(--green)', marginTop: 4, textAlign: 'right' }}>
              {reason.length} caracteres {reason.length >= 15 ? '✓' : '(mínimo 15)'}
            </div>
          </div>
          {error && <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handle} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            <Send size={13} /> {loading ? 'Enviando...' : 'Enviar Solicitação'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'approved') return <span className="badge badge-online">✓ Aprovado</span>
  if (status === 'rejected') return <span className="badge badge-critical">✗ Negado</span>
  return <span className="badge badge-medium">⏳ Pendente</span>
}

export default function Reports({ user }) {
  const [incidents, setIncidents] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestTarget, setRequestTarget] = useState(null)
  const [myRequests, setMyRequests] = useState([])
  const toast = useToast()
  const isAdmin = user?.role === 'admin'

  const loadMyRequests = () => {
    if (!isAdmin) {
      req(`/export-requests?requested_by=${user?.username}`).then(setMyRequests).catch(() => {})
    }
  }

  useEffect(() => {
    Promise.all([api.incidents.list(), api.stats()]).then(([inc, st]) => {
      setIncidents(inc)
      setStats(st)
      setLoading(false)
    })
    loadMyRequests()
  }, [])

  const getMyRequestStatus = (incidentId) => {
    return myRequests.find(r => r.incident_id === incidentId)
  }

  const generateTextReport = (inc) => {
    return `RELATÓRIO DE INCIDENTE — InfraDoc AI
${'='.repeat(50)}
ID: #${inc.id}
Data: ${fmt(inc.created_at)}
Status: ${inc.status === 'open' ? 'ABERTO' : 'RESOLVIDO'}

IDENTIFICAÇÃO
Título: ${inc.title}
Rack: ${inc.rack}
Equipamento: ${inc.equipment_name} (${TYPE_LABELS[inc.equipment_type] || inc.equipment_type})
Severidade: ${SEV_LABELS[inc.severity]}

SINTOMAS REPORTADOS
${inc.symptoms}

${inc.history ? `HISTÓRICO / CONTEXTO\n${inc.history}\n` : ''}
DIAGNÓSTICO IA (modo mock)
${inc.diagnosis || 'N/A'}

CAUSA RAIZ PROVÁVEL
${inc.root_cause || 'N/A'}

PRÓXIMOS PASSOS RECOMENDADOS
${inc.next_steps || 'N/A'}

${'='.repeat(50)}
Gerado em: ${new Date().toLocaleString('pt-BR')}
InfraDoc AI v1.0`
  }

  const downloadReport = (inc) => {
    const text = generateTextReport(inc)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `incidente-${inc.id}-${inc.equipment_name}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportClick = (inc) => {
    if (isAdmin) { downloadReport(inc); return }
    const existing = getMyRequestStatus(inc.id)
    if (existing?.status === 'approved') { downloadReport(inc); return }
    if (existing?.status === 'pending') { toast('Sua solicitação já está aguardando aprovação.', 'info'); return }
    setRequestTarget(inc)
    setShowRequestModal(true)
  }

  const handleRequestSent = () => {
    toast('Solicitação enviada! Aguarde aprovação do administrador.', 'success')
    setShowRequestModal(false)
    loadMyRequests()
  }

  if (loading) return <div className="page-loading">Carregando relatórios...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Relatórios</div>
          <div className="page-subtitle">Exportar relatórios de incidentes e resumo de infraestrutura</div>
        </div>
      </div>

      <div className="page-body">
        {/* Summary */}
        {stats && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Resumo Executivo da Infraestrutura</div>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => window.print()}>
                <Printer size={13} /> Imprimir
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total Incidentes', value: stats.total_incidents },
                { label: 'Incidentes Abertos', value: stats.open_incidents },
                { label: 'Assets em Inventário', value: stats.total_assets },
                { label: 'Assets Degradados', value: stats.degraded_assets },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '12px 16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Por Severidade</div>
                {stats.by_severity.length === 0
                  ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum incidente aberto</div>
                  : stats.by_severity.map(s => (
                    <div key={s.severity} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                      <span className={`badge badge-${s.severity}`}>{SEV_LABELS[s.severity]}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{s.count}</span>
                    </div>
                  ))}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Top Racks</div>
                {stats.by_rack.length === 0
                  ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum incidente</div>
                  : stats.by_rack.map(r => (
                    <div key={r.rack} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>Rack {r.rack}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Info bar for technicians */}
        {!isAdmin && (
          <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(56,139,253,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={13} />
            Para exportar um relatório, clique em <strong>Solicitar</strong> e informe o motivo. O administrador irá aprovar sua solicitação.
          </div>
        )}

        {/* Incidents table */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Relatórios por Incidente</div>
          </div>
          {incidents.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>Nenhum incidente</div>
              <p>Crie incidentes para gerar relatórios.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Equipamento</th>
                  <th>Severidade</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ação</th>
                  {!isAdmin && <th>Permissão</th>}
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => {
                  const myReq = !isAdmin ? getMyRequestStatus(inc.id) : null
                  const canExport = isAdmin || myReq?.status === 'approved'

                  return (
                    <tr key={inc.id} onClick={() => setSelected(selected?.id === inc.id ? null : inc)}>
                      <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{inc.id}</span></td>
                      <td style={{ fontWeight: 500 }}>{inc.title}</td>
                      <td><span className="mono" style={{ fontSize: 12 }}>{inc.equipment_name}</span></td>
                      <td><span className={`badge badge-${inc.severity}`}>{SEV_LABELS[inc.severity]}</span></td>
                      <td><span className={`badge badge-${inc.status}`}>{inc.status === 'open' ? 'Aberto' : 'Resolvido'}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(inc.created_at)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        {canExport ? (
                          <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => downloadReport(inc)}>
                            ↓ Exportar
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 11, opacity: myReq?.status === 'pending' ? 0.6 : 1 }}
                            onClick={() => handleExportClick(inc)}
                            disabled={myReq?.status === 'pending'}
                          >
                            <Send size={11} /> {myReq?.status === 'pending' ? 'Aguardando' : 'Solicitar'}
                          </button>
                        )}
                      </td>
                      {!isAdmin && (
                        <td><StatusBadge status={myReq?.status || 'none'} /></td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Preview */}
        {selected && (
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Preview — #{selected.id}</div>
            </div>
            <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-base)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'auto', lineHeight: 1.7, maxHeight: 400 }}>
              {generateTextReport(selected)}
            </pre>
          </div>
        )}
      </div>

      {showRequestModal && requestTarget && (
        <RequestModal
          incident={requestTarget}
          user={user}
          onClose={() => setShowRequestModal(false)}
          onSent={handleRequestSent}
        />
      )}
    </>
  )
}
