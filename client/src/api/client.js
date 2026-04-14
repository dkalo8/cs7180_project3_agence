import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? '/api/v1'
    : 'http://localhost:5000/api/v1');

const api = axios.create({ baseURL });

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Retry on network errors (Render free tier cold start returns 503 without CORS headers,
// which the browser surfaces as a network error rather than an HTTP error response).
// Retry up to 2 times with 3s delay — Render typically warms up within 30s.
api.interceptors.response.use(
  (response) => response,
  async (err) => {
    const config = err.config;
    if (!config) return Promise.reject(err);

    const isNetworkError = !err.response;
    const isSafeMethod = ['get', 'head', 'options'].includes((config.method || '').toLowerCase());
    config._retryCount = config._retryCount || 0;

    if (isNetworkError && isSafeMethod && config._retryCount < 2) {
      config._retryCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return api(config);
    }

    return Promise.reject(err);
  }
);

export default api;
