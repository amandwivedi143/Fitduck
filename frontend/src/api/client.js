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

function isSafeInternalPath(path) {
  return typeof path === 'string'
    && path.startsWith('/')
    && !path.startsWith('//')
    && !path.startsWith('/\\');
}

function buildLoginRedirectUrl() {
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const redirectParam = isSafeInternalPath(currentPath) ? currentPath : '/dashboard';
  return `/login?redirect=${encodeURIComponent(redirectParam)}`;
}

// --- Interceptors ---

// 401 → the app JWT cookie is missing / expired → kick to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      // Only redirect if not already on the login page.
      if (window.location.pathname !== '/login') {
        window.location.assign(buildLoginRedirectUrl());
      }
    }
    return Promise.reject(err);
  },
);

export default api;
