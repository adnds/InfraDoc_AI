import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../components/Toast'

const EQUIPMENT_TYPES = [
  { value: 'server', label: '🖥️ Servidor' },
  { value: 'switch', label: '🔀 Switch' },
  { value: 'firewall', label: '🛡️ Firewall' },
  { value: 'pdu', label: '🔌 PDU' },
  { value: 'ups', label: '🔋 No-break' },
  { value: 'storage', label: '💾 Storage' },
  { value: 'router', label: '📡 Roteador' },
  { value: 'other', label: '⚙️ Outro' },
]

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Crítico', desc: 'Sistema fora do ar', color: 'var(--red)' },
  { value: 'high', label: 'Alto', desc: 'Impacto significativo', color: 'var(--orange)' },
  { value: 'medium', label: 'Médio', desc: 'Degradação parcial', color: 'var(--yellow)' },
  { value: 'low', label: 'Baixo', desc: 'Monitoramento', color: 'var(--blue)' },
]

const RACKS = ['A1','A2','A3','A4','B1','B2','B3','B4','C1','C2','C3','C4','DC-Externo']
const SYMPTOM_SUGGESTIONS = {
  server: ['Servidor respondendo lento', 'Servidor caindo/reiniciando', 'Problema de rede/conectividade', 'Alto consumo de CPU', 'Alto consumo de memória', 'Disco cheio', 'Erros em aplicação'],
  switch: ['Portas com erros', 'Perda de pacotes', 'Loop de rede detectado', 'Conectividade intermitente', 'CPU do switch alto'],
  firewall: ['Tráfego bloqueado inesperadamente', 'Alta latência', 'Regras conflitantes', 'Log de erros recorrentes'],
  pdu: ['Sobrecarga de circuito', 'Alarme de temperatura', 'Falha em tomada', 'Leitura de carga incorreta'],
  ups: ['Bateria baixa', 'Alarme de sobrecarga', 'Autonomia reduzida', 'Falha de bypass'],
}

export default function NewIncident() {
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    rack: '',
    equipment_type: '',
    equipment_name: '',
    severity: '',
    symptoms: '',
    history: ''
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const isValid = form.title && form.rack && form.equipment_type && form.equipment_name && form.severity && form.symptoms

  const handleSubmit = async () => {
    if (!isValid) return
    setLoading(true)
    try {
      const inc = await api.incidents.create(form)
      toast('Incidente registrado com diagnóstico gerado!', 'success')
      navigate(`/incidents/${inc.id}`)
    } catch (e) {
      toast('Erro ao criar incidente.', 'error')
      setLoading(false)
    }
  }

  const suggestions = SYMPTOM_SUGGESTIONS[form.equipment_type] || []

  return (
    <>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost" style={{ marginBottom: 4, padding: '4px 0' }} onClick={() => navigate('/incidents')}>
            <ArrowLeft size={13} /> Voltar
          </button>
          <div className="page-title">Registrar Incidente</div>
          <div className="page-subtitle">Preencha as informações para gerar diagnóstico automático</div>
        </div>
        <div className="ai-tag"><Zap size={10} /> diagnóstico via IA</div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 720 }}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Título do Incidente <span className="form-required">*</span></label>
            <input className="form-control" placeholder="Ex: Servidor SRV-APP-01 reiniciando inesperadamente" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          {/* Rack + Equipment type */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Rack <span className="form-required">*</span></label>
              <select className="form-control" value={form.rack} onChange={e => set('rack', e.target.value)}>
                <option value="">Selecione o rack</option>
                {RACKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Equipamento <span className="form-required">*</span></label>
              <select className="form-control" value={form.equipment_type} onChange={e => { set('equipment_type', e.target.value); set('symptoms', '') }}>
                <option value="">Selecione o tipo</option>
                {EQUIPMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Equipment name */}
          <div className="form-group">
            <label className="form-label">Nome do Equipamento <span className="form-required">*</span></label>
            <input className="form-control mono" placeholder="Ex: SRV-APP-01, SW-CORE-01" value={form.equipment_name} onChange={e => set('equipment_name', e.target.value)} />
          </div>

          {/* Severity */}
          <div className="form-group">
            <label className="form-label">Severidade <span className="form-required">*</span></label>
            <div className="severity-grid">
              {SEVERITY_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  className={`severity-option ${form.severity === opt.value ? `selected-${opt.value}` : ''}`}
                  onClick={() => set('severity', opt.value)}
                >
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</div>
                  <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Symptoms */}
          <div className="form-group">
            <label className="form-label">Sintomas Observados <span className="form-required">*</span></label>
            {suggestions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {suggestions.map(s => (
                  <button
                    key={s}
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: '3px 10px' }}
                    onClick={() => set('symptoms', form.symptoms ? form.symptoms + '\n' + s : s)}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
            <textarea
              className="form-control"
              rows={4}
              placeholder="Descreva os sintomas observados, comportamento do equipamento, erros reportados..."
              value={form.symptoms}
              onChange={e => set('symptoms', e.target.value)}
            />
          </div>

          {/* History */}
          <div className="form-group">
            <label className="form-label">Histórico / Contexto <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Últimas mudanças realizadas, ocorrências anteriores, janelas de manutenção recentes..."
              value={form.history}
              onChange={e => set('history', e.target.value)}
            />
          </div>

          <hr className="divider" />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/incidents')}>Cancelar</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!isValid || loading}
              style={{ opacity: (!isValid || loading) ? 0.5 : 1 }}
            >
              <Zap size={14} />
              {loading ? 'Gerando diagnóstico...' : 'Registrar e Diagnosticar'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
