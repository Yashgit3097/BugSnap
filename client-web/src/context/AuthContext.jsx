import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Create a Context for Authentication
const AuthContext = createContext();
//Creation fo AuthProvider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const userInfo = localStorage.getItem('debugsnap_user');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
      //Always send token in Authorization header for protected routes
      axios.defaults.headers.common['Authorization'] = `Bearer ${JSON.parse(userInfo).token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      setUser(data);
      localStorage.setItem('debugsnap_user', JSON.stringify(data));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Login failed';
    }
  };

  const register = async (username, email, password) => {
    try {
      const { data } = await axios.post('/api/auth/register', { username, email, password });
      setUser(data);
      localStorage.setItem('debugsnap_user', JSON.stringify(data));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Registration failed';
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('debugsnap_user');
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
