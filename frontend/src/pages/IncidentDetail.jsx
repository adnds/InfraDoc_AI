import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, CheckCircle, RefreshCw, Clipboard, X } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../components/Toast'

const SEV_LABELS = { critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo' }
const TYPE_LABELS = { server: 'Servidor', switch: 'Switch', firewall: 'Firewall', pdu: 'PDU', ups: 'No-break', storage: 'Storage', router: 'Roteador', other: 'Outro' }

function fmt(iso) { return new Date(iso).toLocaleString('pt-BR') }

function ResolveModal({ onClose, onConfirm }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = () => {
    if (!note.trim()) { setError('A nota de encerramento é obrigatória.'); return }
    if (note.trim().length < 10) { setError('Descreva a solução com pelo menos 10 caracteres.'); return }
    setLoading(true)
    onConfirm(note.trim())
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-title">Encerrar Incidente</div>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{
            background: 'var(--green-dim)', border: '1px solid rgba(63,185,80,0.3)',
            borderRadius: 6, padding: '10px 14px', marginBottom: 20,
            fontSize: 12, color: 'var(--green)'
          }}>
            ✓ O status do incidente será alterado para <strong>Resolvido</strong> e o asset voltará para <strong>Online</strong>.
          </div>

          <div className="form-group">
            <label className="form-label">
              Nota de Encerramento <span className="form-required">*</span>
            </label>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              Descreva o que foi feito para resolver o problema. Este registro ficará salvo no histórico do incidente.
            </div>
            <textarea
              className="form-control"
              rows={5}
              placeholder="Ex: Identificado módulo de RAM com defeito no slot 3. Substituído por módulo reserva. Servidor estável há 2 horas sem reinicializações. Módulo defeituoso enviado para RMA."
              value={note}
              onChange={e => { setNote(e.target.value); setError('') }}
              autoFocus
            />
            <div style={{ fontSize: 11, color: note.length < 10 ? 'var(--text-muted)' : 'var(--green)', marginTop: 4, textAlign: 'right' }}>
              {note.length} caracteres {note.length < 10 ? `(mínimo 10)` : '✓'}
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handle}
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            <CheckCircle size={14} />
            {loading ? 'Encerrando...' : 'Confirmar Encerramento'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [incident, setIncident] = useState(null)
  const [showResolveModal, setShowResolveModal] = useState(false)

  useEffect(() => {
    api.incidents.get(id).then(setIncident).catch(() => navigate('/incidents'))
  }, [id])

  const handleResolve = async (note) => {
    const updated = await api.incidents.update(id, { status: 'resolved', diagnosis: incident.diagnosis + '\n\n📝 NOTA DE ENCERRAMENTO:\n' + note })
    setIncident(updated)
    toast('Incidente encerrado com sucesso!', 'success')
    setShowResolveModal(false)
  }

  const handleReopen = async () => {
    const updated = await api.incidents.update(id, { status: 'open' })
    setIncident(updated)
    toast('Incidente reaberto.', 'info')
  }

  const copySteps = () => {
    navigator.clipboard.writeText(incident.next_steps)
    toast('Próximos passos copiados!', 'success')
  }

  if (!incident) return <div className="page-loading">Carregando incidente...</div>

  // Extrai nota de encerramento se existir
  const closingNote = incident.diagnosis?.includes('📝 NOTA DE ENCERRAMENTO:')
    ? incident.diagnosis.split('📝 NOTA DE ENCERRAMENTO:')[1]?.trim()
    : null
  const diagnosisText = incident.diagnosis?.includes('📝 NOTA DE ENCERRAMENTO:')
    ? incident.diagnosis.split('\n\n📝 NOTA DE ENCERRAMENTO:')[0]
    : incident.diagnosis

  return (
    <>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost" style={{ marginBottom: 4, padding: '4px 0' }} onClick={() => navigate('/incidents')}>
            <ArrowLeft size={13} /> Voltar
          </button>
          <div style={{ display: 'flex', align: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="page-title">{incident.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{incident.id}</span>
            <span className={`badge badge-${incident.severity}`}>{SEV_LABELS[incident.severity]}</span>
            <span className={`badge badge-${incident.status}`}>{incident.status === 'open' ? 'Aberto' : 'Resolvido'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {incident.status === 'open' ? (
            <button className="btn btn-primary" onClick={() => setShowResolveModal(true)}>
              <CheckCircle size={14} />
              Marcar Resolvido
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={handleReopen}>
              <RefreshCw size={14} />
              Reabrir
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
          {/* Left column */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Informações do Incidente</div>
              <div className="incident-detail-grid">
                <div className="detail-field">
                  <div className="detail-label">Rack</div>
                  <div className="detail-value mono">{incident.rack}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-label">Equipamento</div>
                  <div className="detail-value mono">{incident.equipment_name}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-label">Tipo</div>
                  <div className="detail-value">{TYPE_LABELS[incident.equipment_type] || incident.equipment_type}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-label">Aberto em</div>
                  <div className="detail-value" style={{ fontSize: 12 }}>{fmt(incident.created_at)}</div>
                </div>
                {incident.updated_at !== incident.created_at && (
                  <div className="detail-field">
                    <div className="detail-label">Atualizado em</div>
                    <div className="detail-value" style={{ fontSize: 12 }}>{fmt(incident.updated_at)}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Sintomas Reportados</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
                {incident.symptoms}
              </div>
            </div>

            {incident.history && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-title">Histórico / Contexto</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {incident.history}
                </div>
              </div>
            )}

            {/* Nota de encerramento */}
            {closingNote && (
              <div style={{
                background: 'var(--green-dim)', border: '1px solid rgba(63,185,80,0.3)',
                borderRadius: 10, padding: '16px 20px'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--green)', marginBottom: 8 }}>
                  📝 Nota de Encerramento
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {closingNote}
                </div>
              </div>
            )}
          </div>

          {/* Right column - AI diagnosis */}
          <div>
            <div className="diagnosis-panel">
              <div className="diagnosis-header">
                <Zap size={13} />
                Diagnóstico IA
                <div className="ai-tag" style={{ marginLeft: 'auto', fontSize: 9 }}>mock</div>
              </div>
              <div className="diagnosis-body">
                {diagnosisText && (
                  <div className="diagnosis-section">
                    <div className="diagnosis-section-title">Diagnóstico</div>
                    <div className="diagnosis-text">{diagnosisText}</div>
                  </div>
                )}
                {incident.root_cause && (
                  <div className="diagnosis-section">
                    <div className="diagnosis-section-title">Causa Raiz Provável</div>
                    <div className="diagnosis-text">{incident.root_cause}</div>
                  </div>
                )}
                {incident.next_steps && (
                  <div className="diagnosis-section">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div className="diagnosis-section-title" style={{ marginBottom: 0 }}>Próximos Passos</div>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={copySteps}>
                        <Clipboard size={11} /> Copiar
                      </button>
                    </div>
                    <div className="diagnosis-steps">{incident.next_steps}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                ⚠️ <strong style={{ color: 'var(--text-secondary)' }}>Modo Mock:</strong> Este diagnóstico é gerado por regras estáticas.
              </div>
            </div>
          </div>
        </div>
      </div>

      {showResolveModal && (
        <ResolveModal
          onClose={() => setShowResolveModal(false)}
          onConfirm={handleResolve}
        />
      )}
    </>
  )
}
