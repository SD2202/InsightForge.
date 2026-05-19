import axios from 'axios';

// Create a single axios instance for the API
const apiClient = axios.create({
  baseURL: 'https://insightforge-4mbq.onrender.com/api', // FastAPI backend URL
});

// Configure interceptor to inject Authorization header if token exists
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const api = {
  // Auth
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await apiClient.post('/auth/login', formData);
    return response.data;
  },
  
  // Signup a new user
  signup: async (username, email, password) => {
    const response = await apiClient.post('/auth/signup', { username, email, password });
    return response.data;
  },

  // Get current user details
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Update user profile
  updateMe: async (data) => {
    const response = await apiClient.patch('/auth/me', data);
    return response.data;
  },

  // Portfolio
  getPortfolio: async () => {
    const response = await apiClient.get('/portfolio');
    return response.data;
  },

  // Upload a dataset
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    
    // Explicitly pass the token to bypass any interceptor issues with FormData
    const response = await apiClient.post('/upload', formData, {
      headers: token ? {
        'Authorization': `Bearer ${token}`
      } : {}
    });
    return response.data;
  },

  // Process a dataset
  processDataset: async (jobId) => {
    const response = await apiClient.post('/process', { job_id: jobId });
    return response.data;
  },

  // Get results for a dataset
  getResults: async (jobId) => {
    const response = await apiClient.get(`/results/${jobId}`);
    return response.data;
  },

  // Update portfolio item (rename)
  patchPortfolio: async (jobId, newName) => {
    const response = await apiClient.patch(`/portfolio/${jobId}`, null, {
      params: { new_name: newName }
    });
    return response.data;
  },

  // Delete portfolio item
  deletePortfolio: async (jobId) => {
    const response = await apiClient.delete(`/portfolio/${jobId}`);
    return response.data;
  },

  // Download cleaned CSV
  downloadCleanedCsv: async (jobId) => {
    const response = await apiClient.get(`/results/${jobId}/download`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'cleaned_data.csv';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch.length === 2) {
        filename = filenameMatch[1];
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default apiClient;
