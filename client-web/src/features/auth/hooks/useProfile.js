import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { authService } from '../services/authService';

export const useProfile = () => {
  const { token, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchProfileData = async () => {
      if (!token) return;
      setIsLoading(true);
      setError('');
      try {
        const data = await authService.getProfile(token);
        if (isMounted) {
          setProfile(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load user profile');
          // If authorization error occurred, clean session
          if (err.message?.toLowerCase().includes('token') || err.message?.toLowerCase().includes('authorized') || err.message?.toLowerCase().includes('expire')) {
            logout();
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfileData();
    return () => {
      isMounted = false;
    };
  }, [token, logout]);

  return {
    profile,
    isLoading,
    error,
  };
};
