import axios from 'axios';

// Configure axios base URL
// In development, use the backend URL directly or rely on proxy
// In production, this would be your production API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000' || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;

