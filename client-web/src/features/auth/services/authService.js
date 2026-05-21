const API_URL = 'http://localhost:5000/api/auth';

/**
 * Service to handle authentication API requests.
 * Acts as the Model layer for auth-related data.
 */
export const authService = {
  /**
   * Register a new user
   * @param {Object} userData - { username, email, password }
   */
  register: async (userData) => {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    return data; // Returns { _id, username, email, token }
  },

  /**
   * Log in an existing user
   * @param {Object} credentials - { email, password }
   */
  login: async (credentials) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    return data; // Returns { _id, username, email, token }
  },

  /**
   * Get user profile details
   * @param {string} token - JWT token
   */
  getProfile: async (token) => {
    const response = await fetch(`${API_URL}/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch profile');
    }

    return data; // Returns { _id, username, email, createdAt, updatedAt }
  },
};
