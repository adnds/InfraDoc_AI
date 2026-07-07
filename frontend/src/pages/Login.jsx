import { useState } from 'react'
import { Activity, Lock, User, Eye, EyeOff, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { api } from '../api'

const BG = {
  minHeight: '100vh', background: 'var(--bg-base)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24, position: 'relative', overflow: 'hidden'
}

const CARD = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '32px 28px',
  boxShadow: '0 8px 40px rgba(0,0,0,0.5)'
}

function FieldIcon({ icon: Icon }) {
  return <Icon size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
}

function InputWrap({ children }) {
  return <div style={{ position: 'relative' }}>{children}</div>
}

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot' | 'forgot_sent'
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError('') ; setSuccess('')}
  const reset = (m) => { setMode(m); setError(''); setSuccess(''); setForm({ name: '', username: '', email: '', password: '', confirm: '' }) }

  const handleLogin = async () => {
    if (!form.username || !form.password) { setError('Preencha usuário e senha.'); return }
    setLoading(true)
    setError('')
    try {
      const found = await api.auth.login({ username: form.username, password: form.password })
      onLogin(found)
    } catch (e) {
      setError(e.message || 'Usuário ou senha incorretos.')
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!form.name || !form.username || !form.email || !form.password || !form.confirm) { setError('Preencha todos os campos.'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) { setError('E-mail inválido.'); return }
    if (form.password !== form.confirm) { setError('As senhas não coincidem.'); return }
    if (form.password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    try {
      await api.auth.register({ name: form.name, username: form.username, email: form.email, password: form.password })
      setSuccess('Conta criada! Sua solicitação foi enviada para um administrador — você poderá entrar assim que ela for aprovada.')
      setMode('login')
      setLoading(false)
    } catch (e) {
      setError(e.message || 'Não foi possível criar a conta.')
      setLoading(false)
    }
  }

  const handleForgot = () => {
    if (!form.email) { setError('Digite seu e-mail.'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) { setError('E-mail inválido.'); return }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setMode('forgot_sent')
    }, 900)
  }

  const handleKey = (e) => {
    if (e.key !== 'Enter') return
    if (mode === 'login') handleLogin()
    else if (mode === 'register') handleRegister()
    else if (mode === 'forgot') handleForgot()
  }

  return (
    <div style={BG}>
      {/* Grid bg */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(0,212,170,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, borderRadius: 14, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', marginBottom: 14 }}>
            <Activity size={28} color="var(--accent)" />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
            <span style={{ color: 'var(--text-primary)' }}>InfraDoc</span>
            <span style={{ color: 'var(--accent)' }}>AI</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            diagnóstico inteligente de infraestrutura
          </div>
        </div>

        <div style={CARD}>

          {/* ─── FORGOT SENT ─── */}
          {mode === 'forgot_sent' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'var(--green-dim)', border: '1px solid rgba(63,185,80,0.3)', marginBottom: 16 }}>
                <CheckCircle size={26} color="var(--green)" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>E-mail enviado!</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
                Enviamos as instruções de redefinição de senha para
              </div>
              <div style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginBottom: 24 }}>
                {form.email}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 6, padding: '8px 12px', marginBottom: 24 }}>
                ⚠️ Modo mock — nenhum e-mail foi enviado de verdade. Fale com um administrador pra redefinir sua senha.
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => reset('login')}>
                Voltar para o login
              </button>
            </div>
          )}

          {/* ─── FORGOT ─── */}
          {mode === 'forgot' && (
            <>
              <button className="btn btn-ghost" style={{ padding: '0 0 16px', fontSize: 12 }} onClick={() => reset('login')}>
                <ArrowLeft size={13} /> Voltar para o login
              </button>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Esqueci a senha</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>
                Digite seu e-mail cadastrado para receber as instruções.
              </div>
              <div className="form-group">
                <label className="form-label">E-mail <span className="form-required">*</span></label>
                <InputWrap>
                  <FieldIcon icon={Mail} />
                  <input className="form-control" style={{ paddingLeft: 32 }} type="email" placeholder="seu@email.com" value={form.email} onChange={e => set('email', e.target.value)} onKeyDown={handleKey} autoFocus />
                </InputWrap>
              </div>
              {error && <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>{error}</div>}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', opacity: loading ? 0.7 : 1 }} onClick={handleForgot} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar instruções'}
              </button>
            </>
          )}

          {/* ─── LOGIN / REGISTER ─── */}
          {(mode === 'login' || mode === 'register') && (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--bg-base)', borderRadius: 8, padding: 4 }}>
                {[['login', 'Entrar'], ['register', 'Criar Conta']].map(([m, label]) => (
                  <button key={m} onClick={() => reset(m)} style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 150ms', background: mode === m ? 'var(--bg-surface)' : 'transparent', color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }}>
                    {label}
                  </button>
                ))}
              </div>

              {success && <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(63,185,80,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--green)', marginBottom: 16, lineHeight: 1.5 }}>{success}</div>}

              {/* Nome — só no cadastro */}
              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Nome Completo <span className="form-required">*</span></label>
                  <InputWrap>
                    <FieldIcon icon={User} />
                    <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Seu nome" value={form.name} onChange={e => set('name', e.target.value)} onKeyDown={handleKey} autoFocus />
                  </InputWrap>
                </div>
              )}

              {/* Usuário */}
              <div className="form-group">
                <label className="form-label">Usuário <span className="form-required">*</span></label>
                <InputWrap>
                  <FieldIcon icon={User} />
                  <input className="form-control" style={{ paddingLeft: 32 }} placeholder="seu.usuario" value={form.username} onChange={e => set('username', e.target.value)} onKeyDown={handleKey} autoFocus={mode === 'login'} />
                </InputWrap>
              </div>

              {/* E-mail — só no cadastro */}
              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label">E-mail <span className="form-required">*</span></label>
                  <InputWrap>
                    <FieldIcon icon={Mail} />
                    <input className="form-control" style={{ paddingLeft: 32 }} type="email" placeholder="seu@email.com" value={form.email} onChange={e => set('email', e.target.value)} onKeyDown={handleKey} />
                  </InputWrap>
                </div>
              )}

              {/* Senha */}
              <div className="form-group">
                <label className="form-label">Senha <span className="form-required">*</span></label>
                <InputWrap>
                  <FieldIcon icon={Lock} />
                  <input className="form-control" style={{ paddingLeft: 32, paddingRight: 36 }} type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} onKeyDown={handleKey} />
                  <button onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </InputWrap>
              </div>

              {/* Confirmar senha — só no cadastro */}
              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Confirmar Senha <span className="form-required">*</span></label>
                  <InputWrap>
                    <FieldIcon icon={Lock} />
                    <input className="form-control" style={{ paddingLeft: 32 }} type="password" placeholder="••••••••" value={form.confirm} onChange={e => set('confirm', e.target.value)} onKeyDown={handleKey} />
                  </InputWrap>
                </div>
              )}

              {mode === 'register' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 6, padding: '8px 12px', marginBottom: 16, lineHeight: 1.5 }}>
                  ℹ️ Sua conta ficará pendente até que um administrador aprove o acesso.
                </div>
              )}

              {error && <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>{error}</div>}

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14, opacity: loading ? 0.7 : 1, marginTop: 4 }} onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
                {loading ? (mode === 'login' ? 'Autenticando...' : 'Criando conta...') : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
              </button>

              {/* Esqueci senha — só no login */}
              {mode === 'login' && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--text-muted)' }} onClick={() => reset('forgot')}>
                    Esqueci minha senha
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--text-muted)' }}>
          InfraDoc AI v1.0 · Residência IA Generativa
          <div style={{ marginTop: 4, fontSize: 10 }}>
            © {new Date().getFullYear()} Adilson Santos — Todos os direitos reservados
          </div>
        </div>
      </div>
    </div>
  )
}
