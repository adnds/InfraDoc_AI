import { useEffect, useState } from 'react'
import { Server, Zap, Shield, Database, Cpu, Radio, Plus, X } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../components/Toast'

const ICON_MAP = {
  server: Cpu,
  switch: Radio,
  firewall: Shield,
  pdu: Zap,
  ups: Database,
  storage: Server,
  router: Radio,
  other: Server
}

const TYPE_LABELS = { server: 'Servidor', switch: 'Switch', firewall: 'Firewall', pdu: 'PDU', ups: 'No-break', storage: 'Storage', router: 'Roteador', other: 'Outro' }

const TYPE_COLORS = {
  server: 'var(--blue)',
  switch: 'var(--accent)',
  firewall: 'var(--red)',
  pdu: 'var(--yellow)',
  ups: 'var(--orange)',
  storage: 'var(--text-secondary)',
  router: 'var(--accent)',
  other: 'var(--text-muted)'
}

function AddAssetModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'server', rack: 'A1', ip: '', serial: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Adicionar Asset</div>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome <span className="form-required">*</span></label>
              <input className="form-control mono" value={form.name} onChange={e => set('name', e.target.value)} placeholder="SRV-NEW-01" />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo <span className="form-required">*</span></label>
              <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Rack <span className="form-required">*</span></label>
              <input className="form-control mono" value={form.rack} onChange={e => set('rack', e.target.value)} placeholder="A1" />
            </div>
            <div className="form-group">
              <label className="form-label">IP</label>
              <input className="form-control mono" value={form.ip} onChange={e => set('ip', e.target.value)} placeholder="10.0.0.x" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Número de Série</label>
            <input className="form-control mono" value={form.serial} onChange={e => set('serial', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.name || !form.rack}>Adicionar</button>
        </div>
      </div>
    </div>
  )
}

export default function Assets() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filterRack, setFilterRack] = useState('')
  const toast = useToast()

  const load = () => api.assets.list().then(data => { setAssets(data); setLoading(false) })
  useEffect(() => { load() }, [])

  const handleAdd = async (form) => {
    await api.assets.create(form)
    toast('Asset adicionado!', 'success')
    setShowAdd(false)
    load()
  }

  const handleStatusToggle = async (asset) => {
    const next = asset.status === 'online' ? 'monitoring' : asset.status === 'monitoring' ? 'degraded' : asset.status === 'degraded' ? 'offline' : 'online'
    await api.assets.updateStatus(asset.id, next)
    toast(`${asset.name} → ${next}`, 'info')
    load()
  }

  const filtered = filterRack ? assets.filter(a => a.rack === filterRack) : assets
  const racks = [...new Set(assets.map(a => a.rack))].sort()

  // Group by rack
  const byRack = {}
  filtered.forEach(a => {
    if (!byRack[a.rack]) byRack[a.rack] = []
    byRack[a.rack].push(a)
  })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Inventário</div>
          <div className="page-subtitle">{assets.length} assets · {assets.filter(a => a.status === 'online').length} online · {assets.filter(a => a.status === 'degraded').length} degradados</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} />
          Adicionar Asset
        </button>
      </div>

      <div className="page-body">
        <div style={{ marginBottom: 16 }}>
          <select className="form-control" style={{ width: 'auto' }} value={filterRack} onChange={e => setFilterRack(e.target.value)}>
            <option value="">Todos os racks</option>
            {racks.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="page-loading">Carregando inventário...</div>
        ) : (
          <div className="rack-grid">
            {Object.entries(byRack).map(([rack, rackAssets]) => (
              <div key={rack} className="rack-card">
                <div className="rack-card-header">
                  <Server size={14} color="var(--accent)" />
                  Rack {rack}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                    {rackAssets.length} item{rackAssets.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {rackAssets.map(asset => {
                  const Icon = ICON_MAP[asset.type] || Server
                  return (
                    <div key={asset.id} className="rack-item">
                      <div className="rack-item-icon" style={{ background: `${TYPE_COLORS[asset.type]}18` }}>
                        <Icon size={14} color={TYPE_COLORS[asset.type]} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="rack-item-name">{asset.name}</div>
                        <div className="rack-item-ip">{asset.ip || TYPE_LABELS[asset.type]}</div>
                      </div>
                      <div
                        className={`status-dot ${asset.status}`}
                        title={`Status: ${asset.status} — clique para alternar`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleStatusToggle(asset)}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
    </>
  )
}
