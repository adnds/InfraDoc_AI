import { useEffect, useState } from 'react'
import { BookOpen, Plus, Search, Eye, ThumbsUp, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
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

const TYPE_LABELS = { server: 'Servidor', switch: 'Switch', firewall: 'Firewall', pdu: 'PDU', ups: 'No-break', storage: 'Storage', router: 'Roteador', other: 'Outro' }
const TYPES = Object.entries(TYPE_LABELS)

function fmt(iso) { return new Date(iso).toLocaleString('pt-BR') }

function AddModal({ onClose, onSave, user }) {
  const [form, setForm] = useState({
    title: '', equipment_type: 'server', keywords: '',
    symptoms: '', root_cause: '', solution: '', resolved_by: user?.username || ''
  })
  const [error, setError] = useState('')
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError('') }

  const handle = () => {
    if (!form.title || !form.symptoms || !form.root_cause || !form.solution) {
      setError('Preencha todos os campos obrigatórios.'); return
    }
    onSave(form)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div className="modal-title">Novo Artigo — Base de Conhecimento</div>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Título <span className="form-required">*</span></label>
            <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Servidor reiniciando após expansão de RAM" autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo de Equipamento <span className="form-required">*</span></label>
              <select className="form-control" value={form.equipment_type} onChange={e => set('equipment_type', e.target.value)}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Palavras-chave</label>
              <input className="form-control mono" value={form.keywords} onChange={e => set('keywords', e.target.value)} placeholder="ram, reiniciando, memoria" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Sintomas <span className="form-required">*</span></label>
            <textarea className="form-control" rows={2} value={form.symptoms} onChange={e => set('symptoms', e.target.value)} placeholder="Descreva os sintomas que levam a este problema..." />
          </div>
          <div className="form-group">
            <label className="form-label">Causa Raiz <span className="form-required">*</span></label>
            <textarea className="form-control" rows={2} value={form.root_cause} onChange={e => set('root_cause', e.target.value)} placeholder="Qual é a causa confirmada do problema?" />
          </div>
          <div className="form-group">
            <label className="form-label">Solução Aplicada <span className="form-required">*</span></label>
            <textarea className="form-control" rows={4} value={form.solution} onChange={e => set('solution', e.target.value)} placeholder="Passo a passo da solução que funcionou..." />
          </div>
          <div className="form-group">
            <label className="form-label">Resolvido por</label>
            <input className="form-control mono" value={form.resolved_by} onChange={e => set('resolved_by', e.target.value)} placeholder="usuario.tecnico" />
          </div>
          {error && <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handle}>Publicar Artigo</button>
        </div>
      </div>
    </div>
  )
}

function ArticleCard({ article, onDelete, onHelpful, isAdmin }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden', marginBottom: 12
    }}>
      {/* Header */}
      <div
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span className={`badge badge-low`} style={{ fontSize: 10 }}>
              {TYPE_LABELS[article.equipment_type] || article.equipment_type}
            </span>
            {article.keywords.split(',').slice(0, 3).map(k => k.trim()).filter(Boolean).map(k => (
              <span key={k} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
                {k}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {article.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {article.symptoms.length > 100 ? article.symptoms.slice(0, 100) + '...' : article.symptoms}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
            <span title="Visualizações"><Eye size={12} style={{ display: 'inline', marginRight: 3 }} />{article.views}</span>
            <span title="Útil"><ThumbsUp size={12} style={{ display: 'inline', marginRight: 3 }} />{article.helpful}</span>
          </div>
          {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div className="diagnosis-section-title">Sintomas</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{article.symptoms}</div>
            </div>
            <div>
              <div className="diagnosis-section-title">Causa Raiz</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{article.root_cause}</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="diagnosis-section-title">Solução Aplicada</div>
            <pre style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)',
              background: 'var(--bg-base)', padding: 12, borderRadius: 6,
              border: '1px solid var(--border)', whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0
            }}>{article.solution}</pre>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {article.resolved_by && <span>Por <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{article.resolved_by}</span> · </span>}
              {fmt(article.created_at)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => onHelpful(article.id)}>
                <ThumbsUp size={11} /> Útil ({article.helpful})
              </button>
              {isAdmin && (
                <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => onDelete(article.id)}>
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function KnowledgeBase({ user }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const toast = useToast()
  const isAdmin = user?.role === 'admin'

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterType) params.set('equipment_type', filterType)
    req(`/kb?${params}`).then(data => { setArticles(data); setLoading(false) })
  }

  useEffect(() => { load() }, [search, filterType])

  const handleAdd = async (form) => {
    await req('/kb', { method: 'POST', body: form })
    toast('Artigo publicado na base de conhecimento!', 'success')
    setShowAdd(false)
    load()
  }

  const handleDelete = async (id) => {
    await req(`/kb/${id}`, { method: 'DELETE' })
    toast('Artigo removido.', 'success')
    load()
  }

  const handleHelpful = async (id) => {
    await req(`/kb/${id}/helpful`, { method: 'POST' })
    toast('Obrigado pelo feedback!', 'success')
    load()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Base de Conhecimento</div>
          <div className="page-subtitle">{articles.length} artigo{articles.length !== 1 ? 's' : ''} · soluções documentadas pela equipe</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Novo Artigo
        </button>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Buscar por título, sintoma ou palavra-chave..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos os tipos</option>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="page-loading">Carregando base de conhecimento...</div>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={32} />
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>
              {search || filterType ? 'Nenhum artigo encontrado' : 'Base vazia'}
            </div>
            <p>{search ? 'Tente outros termos.' : 'Publique o primeiro artigo com uma solução documentada.'}</p>
          </div>
        ) : (
          <div>
            {articles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                onDelete={handleDelete}
                onHelpful={handleHelpful}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSave={handleAdd} user={user} />}
    </>
  )
}
