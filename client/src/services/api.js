import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor: adds token from localStorage
api.interceptors.request.use(
  (config) => {
    const admin = localStorage.getItem('admin');
    if (admin) {
      const adminData = JSON.parse(admin);
      if (adminData.token) {
        config.headers.Authorization = `Bearer ${adminData.token}`;
      }
    }
    console.log('Making request to:', config.url, 'with headers:', config.headers);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handles 401 unauthorized
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response);
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    if (error.response && error.response.status === 401) {
      console.error('Unauthorized access');
      // Optionally redirect to login
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default api;