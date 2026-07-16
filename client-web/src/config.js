import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Configure Axios base URL globally so relative paths work automatically
axios.defaults.baseURL = API_URL;
