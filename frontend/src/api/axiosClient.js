import axios from 'axios';

let accessToken = '';

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token;
};

const axiosClient = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor
axiosClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/auth/login' || originalRequest.url === '/auth/refresh-token') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axiosClient.post('/auth/refresh-token');
        const newToken = res.data.data.accessToken;
        setAccessToken(newToken);

        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken('');
        // Trigger a custom event to force AuthContext logout
        window.dispatchEvent(new Event('auth-logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const extractErrorMessage = (error) => {
  const respData = error.response?.data;
  if (!respData) {
    return error.message || 'Connection to server failed. Please ensure the backend is running.';
  }

  if (respData.errors && Array.isArray(respData.errors) && respData.errors.length > 0) {
    const details = respData.errors
      .map((e) => {
        if (typeof e === 'string') return e;
        let fieldName = e.field || '';
        if (fieldName) {
          fieldName = fieldName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
        }
        return fieldName ? `${fieldName}: ${e.message}` : e.message;
      })
      .filter(Boolean)
      .join(', ');
    return `${respData.message || 'Validation failed'}: ${details}`;
  }

  return respData.message || 'Request failed. Please try again.';
};

export default axiosClient;
