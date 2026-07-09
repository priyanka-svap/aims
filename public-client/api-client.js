/**
 * AIMS API Client
 * Drop this <script> before your other AIMS scripts in aims_v14.html
 * Provides window.AimsAPI with auth + inventory helpers backed by the
 * Node.js + MongoDB backend (see /aims-backend folder).
 *
 * Usage:
 *   <script src="api-client.js"></script>
 *   <script>
 *     // 1. Login
 *     AimsAPI.login('admin','admin123').then(()=> console.log('logged in'));
 *
 *     // 2. Inventory CRUD
 *     AimsAPI.inventory.list({shop:'rora'}).then(res => console.log(res.data));
 *     AimsAPI.inventory.create({name:'New Brand', shop:'rora', cat:'whisky', bot:500});
 *     AimsAPI.inventory.update(id, {bot:550});
 *     AimsAPI.inventory.remove(id);
 */
(function (window) {
  const BASE_URL = window.AIMS_API_BASE_URL || 'http://localhost:5000/api';
  const TOKEN_KEY = 'aims_auth_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function request(path, options = {}) {
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      options.headers || {}
    );
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    let body;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const message = (body && body.message) || `Request failed: ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  const AimsAPI = {
    // ── Auth ──
    async login(username, password) {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setToken(res.token);
      return res;
    },
    async register(payload) {
      // admin only
      return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    },
    async me() {
      return request('/auth/me');
    },
    async changePassword(currentPassword, newPassword) {
      return request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },
    logout() {
      setToken(null);
    },
    isLoggedIn() {
      return !!getToken();
    },

    // ── Inventory (CRUD on brand/rate items) ──
    inventory: {
      async list(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return request(`/inventory${qs ? `?${qs}` : ''}`);
      },
      async get(id) {
        return request(`/inventory/${id}`);
      },
      async create(payload) {
        return request('/inventory', { method: 'POST', body: JSON.stringify(payload) });
      },
      async update(id, payload) {
        return request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      },
      async adjustStock(id, payload) {
        return request(`/inventory/${id}/stock`, { method: 'PATCH', body: JSON.stringify(payload) });
      },
      async remove(id) {
        return request(`/inventory/${id}`, { method: 'DELETE' });
      },
      async lowStock(threshold = 10) {
        return request(`/inventory/low-stock?threshold=${threshold}`);
      },
    },

    // ── Movements (Inward/Outward) ──
    movements: {
      async list(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return request(`/movements${qs ? `?${qs}` : ''}`);
      },
      async create(payload) {
        return request('/movements', { method: 'POST', body: JSON.stringify(payload) });
      },
      async update(id, payload) {
        return request(`/movements/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      },
      async remove(id) {
        return request(`/movements/${id}`, { method: 'DELETE' });
      },
    },

    // ── Shops / Locations / Accounts / Sheets / Ledger ──
    shops: {
      list: () => request('/shops'),
      create: (payload) => request('/shops', { method: 'POST', body: JSON.stringify(payload) }),
      update: (id, payload) => request(`/shops/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
      remove: (id) => request(`/shops/${id}`, { method: 'DELETE' }),
    },
    locations: {
      list: (shop) => request(`/locations${shop ? `?shop=${shop}` : ''}`),
      create: (payload) => request('/locations', { method: 'POST', body: JSON.stringify(payload) }),
      remove: (id) => request(`/locations/${id}`, { method: 'DELETE' }),
    },
    accounts: {
      list: (params = {}) => request(`/accounts?${new URLSearchParams(params)}`),
      upsert: (payload) => request('/accounts', { method: 'POST', body: JSON.stringify(payload) }),
      remove: (id) => request(`/accounts/${id}`, { method: 'DELETE' }),
    },
    sheets: {
      list: (sheetType, date) => request(`/sheets/${sheetType}${date ? `?date=${date}` : ''}`),
      upsert: (sheetType, payload) => request(`/sheets/${sheetType}`, { method: 'POST', body: JSON.stringify(payload) }),
    },
    ledger: {
      list: (store, params = {}) => request(`/ledger/${store}?${new URLSearchParams(params)}`),
      create: (store, payload) => request(`/ledger/${store}`, { method: 'POST', body: JSON.stringify(payload) }),
    },
  };

  window.AimsAPI = AimsAPI;
})(window);
