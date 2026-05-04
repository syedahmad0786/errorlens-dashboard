// ErrorLens — API Client
// Replaces mock data with real API calls to the ErrorLens backend
// API: https://api-production-218fe.up.railway.app/api/v1

window.ErrorLensAPI = (() => {
  const API_BASE = window.__ERRORLENS_API_URL || 'https://api-production-218fe.up.railway.app/api/v1';
  let _token = localStorage.getItem('el_token') || null;
  let _apiKey = localStorage.getItem('el_api_key') || null;

  function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (_apiKey) h['Authorization'] = `Bearer ${_apiKey}`;
    else if (_token) h['Authorization'] = `Bearer ${_token}`;
    return h;
  }

  async function request(path, opts = {}) {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, { ...opts, headers: { ...authHeaders(), ...opts.headers } });
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('el:auth-required'));
      throw new Error('Authentication required');
    }
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return res.json();
  }

  return {
    // Auth
    setToken(t) { _token = t; localStorage.setItem('el_token', t); },
    setApiKey(k) { _apiKey = k; localStorage.setItem('el_api_key', k); },
    clearAuth() { _token = null; _apiKey = null; localStorage.removeItem('el_token'); localStorage.removeItem('el_api_key'); },
    isAuthenticated() { return !!(_token || _apiKey); },

    // Events
    async getEvents(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request(`/events${qs ? '?' + qs : ''}`);
    },
    async getEvent(id) { return request(`/events/${id}`); },
    async updateEvent(id, data) { return request(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },

    // Platforms
    async getPlatforms() { return request('/platforms'); },
    async createPlatform(data) { return request('/platforms', { method: 'POST', body: JSON.stringify(data) }); },

    // Workflows
    async getWorkflows(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request(`/workflows${qs ? '?' + qs : ''}`);
    },

    // Alert Rules
    async getAlertRules() { return request('/alerts/rules'); },
    async createAlertRule(data) { return request('/alerts/rules', { method: 'POST', body: JSON.stringify(data) }); },
    async updateAlertRule(id, data) { return request(`/alerts/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },

    // Alert Incidents
    async getIncidents(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request(`/alerts/incidents${qs ? '?' + qs : ''}`);
    },

    // Webhooks
    async getWebhooks() { return request('/webhooks'); },
    async createWebhook(data) { return request('/webhooks', { method: 'POST', body: JSON.stringify(data) }); },

    // Users / Team
    async getMe() { return request('/auth/me'); },
    async getUsers() { return request('/users'); },

    // API Keys
    async getApiKeys() { return request('/api-keys'); },
    async createApiKey(data) { return request('/api-keys', { method: 'POST', body: JSON.stringify(data) }); },
    async revokeApiKey(id) { return request(`/api-keys/${id}`, { method: 'DELETE' }); },

    // Stats / Overview
    async getOverview() { return request('/overview'); },
    async getTimeline(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request(`/events/timeline${qs ? '?' + qs : ''}`);
    },

    // Health
    async healthCheck() {
      const res = await fetch(`${API_BASE.replace('/api/v1', '')}/health`);
      return res.json();
    },

    // Config
    API_BASE,
  };
})();
