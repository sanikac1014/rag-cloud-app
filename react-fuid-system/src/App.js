import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SearchPage from './components/SearchPage';
import GeneratePage from './components/GeneratePage';
import StatusPage from './components/StatusPage';
import LoadingScreen from './components/LoadingScreen';
import Login from './components/Login';
import Signup from './components/Signup';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import { ApplicationsProvider } from './context/ApplicationsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { loadExistingData } from './services/api';
import './index.css';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [authView, setAuthView] = useState('login'); // 'login' | 'signup' | 'forgot' | 'reset'
 
   const { isAuthenticated, logout } = useAuth();

  // If a reset token is present in URL, show reset view
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset_token')) {
      setAuthView('reset');
    }
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const loadedData = await loadExistingData();
          setData(loadedData);
        } catch (err) {
          console.error('Failed to load data:', err);
          setError('Failed to load database. Please check your connection and try again.');
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const loadedData = await loadExistingData();
      setData(loadedData);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setError('Failed to refresh database. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateData = (newData) => {
    setData(newData);
  };

  const handleLogout = () => {
    logout();
    setAuthView('login');
  };

  // Show login/signup if not authenticated
  if (!isAuthenticated) {
    if (isLoading) return <LoadingScreen />;
    return (
      <>
        {authView === 'login' && (
          <Login onGoToSignup={() => setAuthView('signup')} onGoToForgot={() => setAuthView('forgot')} />
        )}
        {authView === 'signup' && (
          <Signup onGoToLogin={() => setAuthView('login')} />
        )}
        {authView === 'forgot' && (
          <ForgotPassword onGoToLogin={() => setAuthView('login')} />
        )}
        {authView === 'reset' && (
          <ResetPassword onGoToLogin={() => setAuthView('login')} />
        )}
        <Toaster position="top-right" />
      </>
    );
  }

  if (isLoading && !data) {
    return <LoadingScreen />;
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-soft p-8 text-center">
          <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={refreshData} className="btn-primary w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="loading-spinner mr-2" />
                Retrying...
              </>
            ) : (
              'Try Again'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ApplicationsProvider>
      <div className="min-h-screen bg-flywl-grey-900">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#f3f4f6',
              boxShadow: '0 4px 25px -5px rgba(249, 115, 22, 0.1), 0 10px 10px -5px rgba(249, 115, 22, 0.04)',
              border: '1px solid #374151',
              borderRadius: '0.75rem',
            },
            success: {
              style: { background: '#1f2937', color: '#10b981', border: '1px solid #059669' },
            },
            error: {
              style: { background: '#1f2937', color: '#f87171', border: '1px solid #dc2626' },
            },
          }}
        />

        <div className="flex">
          <Sidebar 
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            data={data}
            isLoading={isLoading}
            onRefresh={refreshData}
            onLogout={handleLogout}
            isCollapsed={isSidebarCollapsed}
            onCollapseChange={setIsSidebarCollapsed}
          />

          <main className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-80'}`}>
            <div className="min-h-screen">
              {currentPage === 'dashboard' && (
                <Dashboard 
                  data={data}
                  isLoading={isLoading}
                  onRefresh={refreshData}
                  onPageChange={setCurrentPage}
                  onLogout={handleLogout}
                />
              )}

              {currentPage === 'search' && (
                <SearchPage data={data} isLoading={isLoading} />
              )}

              {currentPage === 'generate' && (
                <GeneratePage data={data} onDataUpdate={updateData} onRefresh={refreshData} isLoading={isLoading} />
              )}

              {currentPage === 'status' && (
                <StatusPage data={data} isLoading={isLoading} />
              )}
            </div>
          </main>
        </div>
      </div>
    </ApplicationsProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
} 