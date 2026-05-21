import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Create a Context for Authentication so any component can access the user state
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the app starts, check if we have a token saved in local storage
  useEffect(() => {
    const userInfo = localStorage.getItem('jam_user');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
      // Configure axios to always send the token
      axios.defaults.headers.common['Authorization'] = `Bearer ${JSON.parse(userInfo).token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      setUser(data);
      localStorage.setItem('jam_user', JSON.stringify(data));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Login failed';
    }
  };

  const register = async (username, email, password) => {
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/register', { username, email, password });
      setUser(data);
      localStorage.setItem('jam_user', JSON.stringify(data));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Registration failed';
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jam_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use Auth Context easily
export const useAuth = () => useContext(AuthContext);
