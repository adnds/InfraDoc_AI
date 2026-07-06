const BASE = '/api'

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  stats: () => req('/stats'),
  incidents: {
    list: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v))
      return req('/incidents' + (q.toString() ? '?' + q : ''))
    },
    get: (id) => req(`/incidents/${id}`),
    create: (data) => req('/incidents', { method: 'POST', body: data }),
    update: (id, data) => req(`/incidents/${id}`, { method: 'PATCH', body: data }),
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
