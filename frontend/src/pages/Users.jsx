import { useState, useEffect } from 'react'
import { Users as UsersIcon, Trash2, Shield, Wrench, Plus, X, Lock } from 'lucide-react'
import { useToast } from '../components/Toast'

const STORAGE_KEY = 'infradoc_users'

function getUsers() {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
}

function AddUserModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'technician' })
  const [error, setError] = useState('')
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError('') }

  const handle = () => {
    if (!form.name || !form.username || !form.email || !form.password) { setError('Preencha todos os campos.'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) { setError('E-mail inválido.'); return }
    if (form.password.length < 6) { setError('Senha mínima de 6 caracteres.'); return }
    const users = getUsers()
    if (users.find(u => u.username === form.username)) { setError('Usuário já existe.'); return }
    onSave(form)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Novo Usuário</div>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
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
          <button className="btn btn-primary" onClick={handle}>Criar Usuário</button>
        </div>
      </div>
    </div>
  )
}

function ResetPasswordModal({ target, onClose, onSave }) {
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')

  const handle = () => {
    if (!form.password || !form.confirm) { setError('Preencha os campos.'); return }
    if (form.password !== form.confirm) { setError('Senhas não coincidem.'); return }
    if (form.password.length < 6) { setError('Mínimo 6 caracteres.'); return }
    onSave(form.password)
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
          <button className="btn btn-primary" onClick={handle}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

function fmt(iso) { return new Date(iso).toLocaleString('pt-BR') }

export default function Users({ user }) {
  const [users, setUsers] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const toast = useToast()

  const load = () => setUsers(getUsers())
  useEffect(() => { load() }, [])

  const isAdmin = user?.role === 'admin'

  const handleAdd = (form) => {
    const all = getUsers()
    const newUser = {
      id: Date.now(),
      name: form.name,
      username: form.username,
      email: form.email,
      password: form.password,
      role: form.role,
      createdAt: new Date().toISOString()
    }
    saveUsers([...all, newUser])
    toast('Usuário criado com sucesso!', 'success')
    setShowAdd(false)
    load()
  }

  const handleDelete = (id) => {
    if (id === 1) { toast('Não é possível excluir o admin padrão.', 'error'); return }
    if (user?.id === id) { toast('Você não pode excluir sua própria conta.', 'error'); return }
    const all = getUsers().filter(u => u.id !== id)
    saveUsers(all)
    toast('Usuário removido.', 'success')
    load()
  }

  const handleReset = (password) => {
    const all = getUsers().map(u => u.id === resetTarget.id ? { ...u, password } : u)
    saveUsers(all)
    toast(`Senha de ${resetTarget.username} redefinida.`, 'success')
    setResetTarget(null)
    load()
  }

  const handleRoleToggle = (id) => {
    if (id === 1) { toast('Não é possível alterar o perfil do admin padrão.', 'error'); return }
    const all = getUsers().map(u => u.id === id ? { ...u, role: u.role === 'admin' ? 'technician' : 'admin' } : u)
    saveUsers(all)
    load()
    toast('Perfil atualizado.', 'success')
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

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Usuários</div>
          <div className="page-subtitle">{users.length} conta{users.length !== 1 ? 's' : ''} cadastrada{users.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Novo Usuário
        </button>
      </div>

      <div className="page-body">
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>
                    {u.name}
                    {u.id === user?.id && (
                      <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>você</span>
                    )}
                  </td>
                  <td><span className="mono" style={{ fontSize: 12 }}>{u.username}</span></td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-critical' : 'badge-low'}`}
                      style={{ cursor: u.id !== 1 ? 'pointer' : 'default' }}
                      onClick={() => u.id !== 1 && handleRoleToggle(u.id)}
                      title={u.id !== 1 ? 'Clique para alternar perfil' : ''}>
                      {u.role === 'admin' ? '⚙ Admin' : '🔧 Técnico'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(u.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                        onClick={() => setResetTarget(u)} title="Redefinir senha">
                        <Lock size={11} /> Senha
                      </button>
                      {u.id !== 1 && u.id !== user?.id && (
                        <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => handleDelete(u.id)}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Perfis:</strong> Administrador tem acesso a esta tela e pode gerenciar usuários. Técnico acessa apenas incidentes, inventário e relatórios.
        </div>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {resetTarget && <ResetPasswordModal target={resetTarget} onClose={() => setResetTarget(null)} onSave={handleReset} />}
    </>
  )
}
