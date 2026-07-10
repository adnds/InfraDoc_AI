import { useState, useEffect } from 'react'
import { Activity, Filter, Zap } from 'lucide-react'
import { api } from '../api'

function fmt(iso) { return new Date(iso).toLocaleString('pt-BR') }

export default function AILogs({ user }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterSuccess, setFilterSuccess] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await api.aiLogs.list({
          ai_type: filterType || undefined,
          success: filterSuccess === '' ? undefined : (filterSuccess === '1' ? 1 : 0),
          limit: 200
        })
        setLogs(data)
      } catch {
        setLogs([])
      }
      setLoading(false)
    }
    load()
  }, [filterType, filterSuccess])

  const isAdmin = user?.role === 'admin'
  
  if (!isAdmin) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-title">Logs de IA</div>
          </div>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <Zap size={32} />
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>Acesso Restrito</div>
            <p>Apenas administradores podem visualizar logs de IA.</p>
          </div>
        </div>
      </>
    )
  }

  const successCount = logs.filter(l => l.success).length
  const errorCount = logs.length - successCount
  const avgResponseTime = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length)
    : 0

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Logs de IA</div>
          <div className="page-subtitle">
            {logs.length} chamadas · {successCount} sucesso · {errorCount} erro · {avgResponseTime}ms médio
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: 12 }}>Tipo de IA</label>
            <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">Todos</option>
              <option value="diagnosis">Diagnóstico</option>
              <option value="kb_draft">Artigo KB</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: 12 }}>Status</label>
            <select className="form-control" value={filterSuccess} onChange={e => setFilterSuccess(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">Todos</option>
              <option value="1">✓ Sucesso</option>
              <option value="0">✗ Erro</option>
            </select>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div className="page-loading">Carregando logs...</div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <Activity size={32} />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>Nenhum log encontrado</div>
              <p>As chamadas de IA aparecerão aqui quando ocorrerem.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Resultado</th>
                  <th>Incidente / KB</th>
                  <th>Tempo (ms)</th>
                  <th>Modelo</th>
                  <th>Erro / Detalhes</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500 }}>
                      {log.ai_type === 'diagnosis' ? '🔍 Diagnóstico' : '📚 Artigo KB'}
                    </td>
                    <td>
                      <span className={`badge ${log.success ? 'badge-online' : 'badge-offline'}`}>
                        {log.success ? '✓ Sucesso' : '✗ Erro'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                      {log.incident_id && <span>inc-{log.incident_id}</span>}
                      {log.kb_id && <span>kb-{log.kb_id}</span>}
                    </td>
                    <td style={{ fontSize: 12, textAlign: 'right' }}>
                      <span className="badge badge-low">{log.response_time_ms}ms</span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {log.model ? log.model.split('/').pop() : 'N/A'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.error_message ? (
                        <span title={log.error_message}>{log.error_message}</span>
                      ) : (
                        <span style={{ color: 'var(--green)' }}>✓ Resposta gerada corretamente</span>
                      )}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Sobre os logs:</strong> Toda chamada à API da Groq (sucesso ou erro) é registrada aqui com timestamp, tipo (diagnóstico ou artigo KB), tempo de resposta e mensagem de erro se houver. Isso permite monitorar a saúde e confiabilidade da integração com IA em tempo real.
        </div>
      </div>
    </>
  )
}
