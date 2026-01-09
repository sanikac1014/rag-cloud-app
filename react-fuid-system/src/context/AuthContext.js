import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiSignup, apiLogin, apiUpdateProfile, apiChangePassword } from '../services/api';

// Simple SHA-256 hashing using Web Crypto API for fallback only
async function hashStringSHA256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

const USERS_KEY = 'auth_users_v1';
const CURRENT_USER_KEY = 'auth_current_user_v1';

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState(() => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }, [currentUser]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isBlockedDomain = (email) => email.trim().toLowerCase().endsWith('@gmail.com');

  const signup = async ({ firstName, lastName, email, password }) => {
    // Try backend first
    try {
      const res = await apiSignup({ firstName, lastName, email, password });
      if (res?.success && res?.user) {
        setUsers(prev => [{ ...res.user, passwordHash: 'remote' }, ...prev]);
        return true;
      }
    } catch (e) {
      // Fallback to local-only mode
      if (!emailRegex.test(email)) throw new Error('Please enter a valid email address');
      if (isBlockedDomain(email)) throw new Error('Please use your work email. gmail.com addresses are not allowed.');
      if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');
      const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) throw new Error('An account with this email already exists');
      const passwordHash = await hashStringSHA256(password);
      const newUser = {
        id: `USR-${Date.now()}`,
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        email: email.trim(),
        passwordHash,
        memberSince: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString(),
        role: 'User'
      };
      setUsers(prev => [newUser, ...prev]);
      return true;
    }
  };

  const login = async (email, password) => {
    // Try backend first
    try {
      const res = await apiLogin(email, password);
      if (res?.success && res?.user) {
        setCurrentUser(res.user);
        return true;
      }
    } catch (e) {
      // Fallback to local-only mode
      if (isBlockedDomain(email)) throw new Error('Please use your work email. gmail.com addresses are not allowed.');
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) throw new Error('Invalid email or password');
      const passwordHash = await hashStringSHA256(password);
      if (user.passwordHash !== passwordHash) throw new Error('Invalid email or password');
      const updated = { ...user, lastLogin: new Date().toISOString() };
      setUsers(prev => prev.map(u => (u.email === user.email ? updated : u)));
      setCurrentUser({ ...updated, passwordHash: undefined });
      return true;
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const updateProfile = async (updates) => {
    if (!currentUser) return;
    try {
      const res = await apiUpdateProfile(currentUser.email, updates);
      if (res?.success && res?.user) {
        setCurrentUser(res.user);
        setUsers(prev => prev.map(u => (u.email === res.user.email ? { ...u, ...updates } : u)));
        return;
      }
    } catch (e) {
      // Fallback
      setUsers(prev => prev.map(u => (u.email === currentUser.email ? { ...u, ...updates } : u)));
      setCurrentUser(prev => (prev ? { ...prev, ...updates } : prev));
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!currentUser) throw new Error('Not authenticated');
    try {
      const res = await apiChangePassword(currentUser.email, currentPassword, newPassword);
      if (res?.success) return true;
      throw new Error(res?.error || 'Failed to change password');
    } catch (e) {
      // Fallback local-only
      const user = users.find(u => u.email === currentUser.email);
      const currentHash = await hashStringSHA256(currentPassword);
      if (user.passwordHash !== currentHash) throw new Error('Current password is incorrect');
      if (!newPassword || newPassword.length < 8) throw new Error('New password must be at least 8 characters');
      const newHash = await hashStringSHA256(newPassword);
      setUsers(prev => prev.map(u => (u.email === user.email ? { ...u, passwordHash: newHash } : u)));
      return true;
    }
  };

  const value = useMemo(() => ({
    users,
    currentUser,
    isAuthenticated: Boolean(currentUser),
    signup,
    login,
    logout,
    updateProfile,
    changePassword
  }), [users, currentUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 