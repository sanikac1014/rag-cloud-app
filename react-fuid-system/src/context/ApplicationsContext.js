import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ApplicationsContext = createContext();

export const useApplications = () => {
  const context = useContext(ApplicationsContext);
  if (!context) {
    throw new Error('useApplications must be used within an ApplicationsProvider');
  }
  return context;
};

export const ApplicationsProvider = ({ children }) => {
  const [applications, setApplications] = useState([]);
  const { currentUser } = useAuth();

  const addNewApplication = async (
    companyName,
    productName,
    fuid = null,
    url = null,
    extra = {}
  ) => {
    const categoriesArray = Array.isArray(extra.categories)
      ? extra.categories
      : (typeof extra.categories === 'string'
          ? extra.categories.split(',').map(s => s.trim()).filter(Boolean)
          : []);

    const newApplication = {
      id: `APP-${Date.now()}`,
      companyName,
      productName,
      submittedDate: new Date().toISOString().split('T')[0],
      status: 'submitted',
      statusDate: new Date().toISOString().split('T')[0],
      fuid,
      reviewer: null,
      comments: 'Application submitted successfully. Awaiting review.',
      userEmail: currentUser?.email || 'unknown',
      url: extra.url || url || null,
      platform: extra.platform || '',
      shortDescription: extra.shortDescription || '',
      longDescription: extra.longDescription || '',
      categories: categoriesArray
    };

    setApplications(prev => [newApplication, ...prev]);

    try {
      // Persist to shared data file (back-compat)
      const data = await api.get('/data').then(r => r.data);
      const apps = Array.isArray(data.applications) ? data.applications : [];
      data.applications = [newApplication, ...apps];
      await api.post('/data', data);
    } catch (e) {
      // best-effort
    }

    try {
      // Also push to approvals queue explicitly so internal Approvals picks it up immediately
      await api.post('/approvals/submit', newApplication);
    } catch (e) {
      // best-effort
    }
  };

  const deleteApplication = (applicationId) => {
    setApplications(prev => prev.filter(app => app.id !== applicationId));
  };

  const value = {
    applications,
    addNewApplication,
    deleteApplication
  };

  return (
    <ApplicationsContext.Provider value={value}>
      {children}
    </ApplicationsContext.Provider>
  );
}; 