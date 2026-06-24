import axios from 'axios';

/**
 * Pre-configured Axios instance.
 *
 * baseURL points at the gateway (:8080). In dev, Vite's proxy forwards /api
 * requests transparently, so the browser never needs a CORS preflight for API
 * calls. withCredentials:true ensures the httpOnly app_jwt cookie is sent.
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Interceptors ---

// 401 → the app JWT cookie is missing / expired → kick to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      // Only redirect if not already on the login page.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;
