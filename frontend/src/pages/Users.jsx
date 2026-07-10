import { useState, useEffect } from 'react'
import { Users as UsersIcon, Trash2, Shield, Wrench, Plus, X, Lock, Check, Clock, Pencil, Power, ScrollText } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../components/Toast'

function fmt(iso) { return new Date(iso).toLocaleString('pt-BR') }

function StatusBadge({ status }) {
  if (status === 'approved') return <span className="badge badge-online">✓ Aprovado</span>
  if (status === 'rejected') return <span className="badge badge-critical">✗ Negado</span>
  return <span className="badge badge-medium">⏳ Pendente</span>
}

function EditUserModal({ target, onClose, onSave }) {
  const [form, setForm] = useState({ name: target.name, email: target.email })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (!form.name || !form.email) { setError('Preencha todos os campos.'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) { setError('E-mail inválido.'); return }
    setLoading(true)
    try {
      await onSave(form)
    } catch (e) {
      setError(e.message || 'Erro ao salvar.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Editar Usuário — {target.username}</div>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nome Completo</label>
            <input className="form-control" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError('') }} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-control" type="email" value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError('') }} />
          </div>
          {error && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handle} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}

function AddUserModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'technician' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError('') }

  const handle = async () => {
    if (!form.name || !form.username || !form.email || !form.password) { setError('Preencha todos os campos.'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) { setError('E-mail inválido.'); return }
    if (form.password.length < 6) { setError('Senha mínima de 6 caracteres.'); return }
    setLoading(true)
    try {
      await onSave(form)
    } catch (e) {
      setError(e.message || 'Erro ao criar usuário.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Novo Usuário</div>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(56,139,253,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: 'var(--blue)', marginBottom: 16 }}>
            Usuários criados diretamente por um administrador já entram <strong>aprovados</strong>, sem passar pela fila de aprovação.
          </div>
          <div className="form-group">
            <label className="form-label">Nome Completo <span className="form-required">*</span></label>
            <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome do técnico" autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Usuário <span className="form-required">*</span></label>
              <input className="form-control mono" value={form.username} onChange={e => set('username', e.target.value)} placeholder="usuario.tecnico" />
            </div>
            <div className="form-group">
              <label className="form-label">Perfil <span className="form-required">*</span></label>
              <select className="form-control" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="technician">Técnico</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">E-mail <span className="form-required">*</span></label>
            <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="usuario@empresa.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Senha <span className="form-required">*</span></label>
            <input className="form-control" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="mínimo 6 caracteres" />
          </div>
          {error && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handle} disabled={loading}>{loading ? 'Criando...' : 'Criar Usuário'}</button>
        </div>
      </div>
    </div>
  )
}

function AuditLogPanel() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auditLog.list(100).then(data => { setEntries(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const ACTION_LABELS = {
    create_user: 'Criou usuário', approve_user: 'Aprovou cadastro', reject_user: 'Negou cadastro',
    change_role: 'Alterou perfil', activate_user: 'Ativou usuário', deactivate_user: 'Desativou usuário',
    edit_user: 'Editou usuário', reset_password: 'Redefiniu senha', delete_user: 'Excluiu usuário',
  }

  return (
    <div className="card" style={{ padding: 0, marginTop: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <ScrollText size={14} color="var(--text-muted)" />
        <div className="card-title" style={{ marginBottom: 0 }}>Log de Auditoria</div>
      </div>
      {loading ? (
        <div className="page-loading">Carregando log...</div>
      ) : entries.length === 0 ? (
        <div style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma operação registrada ainda.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Quando</th><th>Ator</th><th>Ação</th><th>Detalhes</th></tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt(e.created_at)}</td>
                <td><span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{e.actor || 'desconhecido'}</span></td>
                <td style={{ fontSize: 12 }}>{ACTION_LABELS[e.action] || e.action}</td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ResetPasswordModal({ target, onClose, onSave }) {
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (!form.password || !form.confirm) { setError('Preencha os campos.'); return }
    if (form.password !== form.confirm) { setError('Senhas não coincidem.'); return }
    if (form.password.length < 6) { setError('Mínimo 6 caracteres.'); return }
    setLoading(true)
    try {
      await onSave(form.password)
    } catch (e) {
      setError(e.message || 'Erro ao redefinir senha.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">Redefinir Senha — {target.username}</div>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nova Senha</label>
            <input className="form-control" type="password" value={form.password} onChange={e => { setForm(f => ({...f, password: e.target.value})); setError('') }} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar Senha</label>
            <input className="form-control" type="password" value={form.confirm} onChange={e => { setForm(f => ({...f, confirm: e.target.value})); setError('') }} />
          </div>
          {error && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handle} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Users({ user }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [showAdd, setShowAdd] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const toast = useToast()
  const isAdmin = user?.role === 'admin'

  const load = () => {
    setLoading(true)
    api.users.list(filter ? { status: filter } : {})
      .then(data => { setUsers(data); setLoading(false) })
      .catch(() => { toast('Erro ao carregar usuários.', 'error'); setLoading(false) })
  }

  useEffect(() => { if (isAdmin) load() }, [filter])

  const handleAdd = async (form) => {
    await api.users.create({ ...form, created_by: user?.username })
    toast('Usuário criado e já aprovado!', 'success')
    setShowAdd(false)
    load()
  }

  const handleApprove = async (u) => {
    setBusyId(u.id)
    try {
      await api.users.approve(u.id, user?.username)
      toast(`${u.name} aprovado — já pode fazer login.`, 'success')
      load()
    } catch {
      toast('Erro ao aprovar usuário.', 'error')
    }
    setBusyId(null)
  }

  const handleReject = async (u) => {
    setBusyId(u.id)
    try {
      await api.users.reject(u.id, user?.username)
      toast(`Cadastro de ${u.name} negado.`, 'info')
      load()
    } catch {
      toast('Erro ao negar cadastro.', 'error')
    }
    setBusyId(null)
  }

  const handleDelete = async (u) => {
    if (u.username === 'admin') { toast('Não é possível excluir o admin padrão.', 'error'); return }
    if (u.id === user?.id) { toast('Você não pode excluir sua própria conta.', 'error'); return }
    if (!window.confirm(`Excluir o usuário "${u.name}"? Essa ação não pode ser desfeita.`)) return
    setBusyId(u.id)
    try {
      await api.users.remove(u.id, user?.username)
      toast('Usuário removido.', 'success')
      load()
    } catch {
      toast('Erro ao remover usuário.', 'error')
    }
    setBusyId(null)
  }

  const handleReset = async (password) => {
    await api.users.resetPassword(resetTarget.id, password, user?.username)
    toast(`Senha de ${resetTarget.username} redefinida.`, 'success')
    setResetTarget(null)
  }

  const handleEdit = async (form) => {
    await api.users.edit(editTarget.id, form, user?.username)
    toast('Usuário atualizado.', 'success')
    setEditTarget(null)
    load()
  }

  const handleToggleActive = async (u) => {
    if (u.username === 'admin' && u.is_active) { toast('Não é possível desativar o admin padrão.', 'error'); return }
    setBusyId(u.id)
    try {
      await api.users.setActive(u.id, !u.is_active, user?.username)
      toast(u.is_active ? `${u.name} desativado.` : `${u.name} reativado.`, 'info')
      load()
    } catch {
      toast('Erro ao alterar status do usuário.', 'error')
    }
    setBusyId(null)
  }

  const handleRoleToggle = async (u) => {
    if (u.username === 'admin') { toast('Não é possível alterar o perfil do admin padrão.', 'error'); return }
    const newRole = u.role === 'admin' ? 'technician' : 'admin'
    try {
      await api.users.updateRole(u.id, newRole, user?.username)
      toast('Perfil atualizado.', 'success')
      load()
    } catch {
      toast('Erro ao atualizar perfil.', 'error')
    }
  }

  if (!isAdmin) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-title">Usuários</div>
            <div className="page-subtitle">Gerenciamento de contas</div>
          </div>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <Shield size={32} />
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>Acesso Restrito</div>
            <p>Apenas administradores podem gerenciar usuários.</p>
          </div>
        </div>
      </>
    )
  }

  const pendingCount = users.filter(u => u.status === 'pending').length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Usuários</div>
          <div className="page-subtitle">
            {filter === 'pending' && pendingCount > 0
              ? <span style={{ color: 'var(--yellow)' }}>⚠ {pendingCount} cadastro{pendingCount > 1 ? 's' : ''} aguardando aprovação</span>
              : `${users.length} conta${users.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Novo Usuário
        </button>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['pending', '⏳ Pendentes'], ['approved', '✓ Aprovados'], ['rejected', '✗ Negados'], ['', 'Todos']].map(([val, label]) => (
            <button key={val} className={`btn ${filter === val ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 12 }} onClick={() => setFilter(val)}>
              {label}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div className="page-loading">Carregando usuários...</div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <UsersIcon size={32} />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, color: 'var(--text-secondary)' }}>
                {filter === 'pending' ? 'Nenhum cadastro pendente' : 'Nenhum usuário encontrado'}
              </div>
              <p>{filter === 'pending' ? 'Novos cadastros aparecerão aqui para aprovação.' : ''}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Usuário</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Conta</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 500 }}>
                      {u.name}
                      {u.id === user?.id && (
                        <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>você</span>
                      )}
                    </td>
                    <td><span className="mono" style={{ fontSize: 12 }}>{u.username}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-critical' : 'badge-low'}`}
                        style={{ cursor: u.username !== 'admin' ? 'pointer' : 'default' }}
                        onClick={() => u.username !== 'admin' && handleRoleToggle(u)}
                        title={u.username !== 'admin' ? 'Clique para alternar perfil' : ''}>
                        {u.role === 'admin' ? '⚙ Admin' : '🔧 Técnico'}
                      </span>
                    </td>
                    <td><StatusBadge status={u.status} /></td>
                    <td>{u.is_active ? <span className="badge badge-online">Ativa</span> : <span className="badge badge-offline">Inativa</span>}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(u.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {u.status === 'pending' && (
                          <>
                            <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--green)' }}
                              disabled={busyId === u.id} onClick={() => handleApprove(u)} title="Aprovar cadastro">
                              <Check size={12} />
                            </button>
                            <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--red)' }}
                              disabled={busyId === u.id} onClick={() => handleReject(u)} title="Negar cadastro">
                              <X size={12} />
                            </button>
                          </>
                        )}
                        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => setEditTarget(u)} title="Editar">
                          <Pencil size={11} />
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => setResetTarget(u)} title="Redefinir senha">
                          <Lock size={11} />
                        </button>
                        {u.id !== user?.id && !(u.username === 'admin' && u.is_active) && (
                          <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px', color: u.is_active ? 'var(--yellow)' : 'var(--green)' }}
                            disabled={busyId === u.id} onClick={() => handleToggleActive(u)} title={u.is_active ? 'Desativar' : 'Ativar'}>
                            <Power size={11} />
                          </button>
                        )}
                        {u.username !== 'admin' && u.id !== user?.id && (
                          <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }}
                            disabled={busyId === u.id} onClick={() => handleDelete(u)} title="Excluir">
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Como funciona:</strong> quando alguém se cadastra pela tela de login ("Criar Conta"), a conta fica <strong>pendente</strong> até um administrador aprovar aqui. Só depois disso o login passa a funcionar. Contas criadas diretamente por um admin (botão "Novo Usuário") já entram aprovadas. Toda operação administrativa (criar, editar, aprovar, ativar/desativar, redefinir senha, excluir) fica registrada no log de auditoria abaixo.
        </div>

        <button className="btn btn-secondary" style={{ marginTop: 12, fontSize: 12 }} onClick={() => setShowAuditLog(s => !s)}>
          <ScrollText size={13} /> {showAuditLog ? 'Ocultar' : 'Ver'} Log de Auditoria
        </button>

        {showAuditLog && <AuditLogPanel />}
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {resetTarget && <ResetPasswordModal target={resetTarget} onClose={() => setResetTarget(null)} onSave={handleReset} />}
      {editTarget && <EditUserModal target={editTarget} onClose={() => setEditTarget(null)} onSave={handleEdit} />}
    </>
  )
}
