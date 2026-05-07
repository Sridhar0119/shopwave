import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '/api';
const api = axios.create({ baseURL: BASE, timeout: 12000 });

api.interceptors.request.use(cfg => {
  try {
    const s = JSON.parse(localStorage.getItem('sw-auth') || '{}');
    if (s?.state?.token) cfg.headers.Authorization = `Bearer ${s.state.token}`;
  } catch {}
  return cfg;
});
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.removeItem('sw-auth'); window.location.href = '/login'; }
  return Promise.reject(err);
});

export const authAPI = {
  register: d => api.post('/users/register', d),
  login:    d => api.post('/users/login', d),
  me:       () => api.get('/users/me'),
};
export const productAPI = {
  list:       p => api.get('/products', { params: p }),
  get:        id => api.get(`/products/${id}`),
  categories: () => api.get('/products/categories'),
};
export const orderAPI = {
  create: d  => api.post('/orders', d),
  list:   () => api.get('/orders/my'),
  get:    id => api.get(`/orders/${id}`),
};
export const paymentAPI = {
  create: d  => api.post('/payments', d),
  get:    id => api.get(`/payments/${id}`),
};
export default api;
