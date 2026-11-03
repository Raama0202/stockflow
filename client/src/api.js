export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(method, url, body) {
  let res;
  try {
    res = await fetch(`/api${url}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that StockFlow is running.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/auth/')) onUnauthorized();
    throw new ApiError(res.status, data.error || `Request failed (${res.status}).`, data.fields);
  }
  return data;
}

export const api = {
  me: () => request('GET', '/auth/me'),
  login: (body) => request('POST', '/auth/login', body),
  signup: (body) => request('POST', '/auth/signup', body),
  logout: () => request('POST', '/auth/logout'),
  demoInfo: () => request('GET', '/auth/demo'),
  demoLogin: () => request('POST', '/auth/demo'),

  dashboard: () => request('GET', '/dashboard'),

  listProducts: ({ search = '', lowStock = false } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (lowStock) params.set('lowStock', 'true');
    const qs = params.toString();
    return request('GET', `/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (id) => request('GET', `/products/${id}`),
  createProduct: (body) => request('POST', '/products', body),
  updateProduct: (id, body) => request('PUT', `/products/${id}`, body),
  adjustStock: (id, body) => request('POST', `/products/${id}/adjust`, body),
  deleteProduct: (id) => request('DELETE', `/products/${id}`),

  getSettings: () => request('GET', '/settings'),
  updateSettings: (body) => request('PUT', '/settings', body),
};
