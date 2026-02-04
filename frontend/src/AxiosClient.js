import axios from 'axios';

const AxiosClient = axios.create({
  baseURL: `${import.meta.env.VITE_BASE_API_URL}/api`,
});

AxiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ACCESS_TOKEN');
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor to handle 401 errors globally
AxiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401 (Unauthorized), the token is invalid or expired
    if (error.response && error.response.status === 401) {
      // Clear invalid token and user data
      localStorage.removeItem('ACCESS_TOKEN');
      localStorage.removeItem('user');
      
      // Dispatch a custom event so components can react to logout
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default AxiosClient;
