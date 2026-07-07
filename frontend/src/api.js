const BASE = '/api'

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  if (!res.ok) {
    let message = res.statusText || 'Erro na requisição'
    try {
      const data = await res.json()
      message = data.detail || message
    } catch {
      try { message = await res.text() || message } catch { /* mantém statusText */ }
    }
    throw new Error(message)
  }
  return res.json()
}

export const api = {
  stats: () => req('/stats'),
  auth: {
    login: (data) => req('/auth/login', { method: 'POST', body: data }),
    register: (data) => req('/auth/register', { method: 'POST', body: data }),
  },
  users: {
    list: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
      return req('/users' + (q.toString() ? '?' + q : ''))
    },
    create: (data) => req('/users', { method: 'POST', body: data }),
    approve: (id, reviewed_by) => req(`/users/${id}/approval`, { method: 'PATCH', body: { status: 'approved', reviewed_by } }),
    reject: (id, reviewed_by) => req(`/users/${id}/approval`, { method: 'PATCH', body: { status: 'rejected', reviewed_by } }),
    updateRole: (id, role) => req(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
    resetPassword: (id, password) => req(`/users/${id}/password`, { method: 'PATCH', body: { password } }),
    remove: (id) => req(`/users/${id}`, { method: 'DELETE' }),
  },
  incidents: {
    list: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v))
      return req('/incidents' + (q.toString() ? '?' + q : ''))
    },
    get: (id) => req(`/incidents/${id}`),
    create: (data) => req('/incidents', { method: 'POST', body: data }),
    update: (id, data) => req(`/incidents/${id}`, { method: 'PATCH', body: data }),
    approve: (id, reviewed_by) => req(`/incidents/${id}/approval`, { method: 'PATCH', body: { status: 'approved', reviewed_by } }),
    reject: (id, reviewed_by) => req(`/incidents/${id}/approval`, { method: 'PATCH', body: { status: 'rejected', reviewed_by } }),
    remove: (id) => req(`/incidents/${id}`, { method: 'DELETE' }),
  },
  assets: {
    list: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v))
      return req('/assets' + (q.toString() ? '?' + q : ''))
    },
    create: (data) => req('/assets', { method: 'POST', body: data }),
    updateStatus: (id, status) => req(`/assets/${id}/status`, { method: 'PATCH', body: { status } }),
  }
}
