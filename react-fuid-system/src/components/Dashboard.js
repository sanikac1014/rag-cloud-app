import React, { useState } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  InformationCircleIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import ProfilePage from './ProfilePage';

const Dashboard = ({ data, isLoading, onRefresh, onPageChange, onLogout }) => {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="min-h-screen bg-flywl-grey-900">
      {/* Header */}
      <div className="bg-flywl-grey-800 border-b border-flywl-grey-700">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome to the System</h1>
              <p className="text-flywl-grey-300 mt-1">Tooling to search companies, and products</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowProfile(true)}
                className="btn-secondary"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* About Flywl */}
        <div className="card mb-8">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-white">🏢 About the system</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3 text-flywl-grey-300">
              <p>
              Our platform offers smart search across companies, products, and IDs with intelligent matching to guide users to the closest results. It provides multi-step ID generation with normalization and version extraction, along with an 
              applications tracker to monitor submissions from creation to approval. A built-in RAG assistant delivers product-aware insights, while secure profile management and robust data tools ensure reliable storage and export of curated datasets.
              </p>
            </div>
          </div>
        </div>

        {/* Platform Capabilities */}
        <div className="card mb-8">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-white">🌟 Platform Capabilities</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-lg bg-flywl-grey-900 border border-flywl-grey-700">
                <div className="flex items-center mb-3">
                  <MagnifyingGlassIcon className="w-6 h-6 text-flywl-orange-400 mr-2" />
                  <h4 className="text-white font-semibold">Smart Search</h4>
                </div>
                <p className="text-sm text-flywl-grey-300">Search companies, and products with intelligent matching and closest‑match guidance.</p>
              </div>

              <div className="p-5 rounded-lg bg-flywl-grey-900 border border-flywl-grey-700">
                <div className="flex items-center mb-3">
                  <PlusIcon className="w-6 h-6 text-flywl-yellow-400 mr-2" />
                  <h4 className="text-white font-semibold">Generate ID</h4>
                </div>
                <p className="text-sm text-flywl-grey-300">Multi‑step generation with normalization, version extraction, and consistent ID formatting.</p>
              </div>

              <div className="p-5 rounded-lg bg-flywl-grey-900 border border-flywl-grey-700">
                <div className="flex items-center mb-3">
                  <DocumentTextIcon className="w-6 h-6 text-flywl-orange-400 mr-2" />
                  <h4 className="text-white font-semibold">Applications Tracker</h4>
                </div>
                <p className="text-sm text-flywl-grey-300">Track submissions created during ID generation and follow their status from submitted to approved.</p>
              </div>

              <div className="p-5 rounded-lg bg-flywl-grey-900 border border-flywl-grey-700">
                <div className="flex items-center mb-3">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-flywl-orange-400 mr-2" />
                  <h4 className="text-white font-semibold">RAG Assistant</h4>
                </div>
                <p className="text-sm text-flywl-grey-300">Product‑aware chat powered by embedded knowledge for faster discovery and better decisions.</p>
              </div>

              <div className="p-5 rounded-lg bg-flywl-grey-900 border border-flywl-grey-700">
                <div className="flex items-center mb-3">
                  <ShieldCheckIcon className="w-6 h-6 text-flywl-yellow-400 mr-2" />
                  <h4 className="text-white font-semibold">Profile & Security</h4>
                </div>
                <p className="text-sm text-flywl-grey-300">Manage account details and passwords. Authentication supports backend APIs with local fallback when offline.</p>
              </div>

              <div className="p-5 rounded-lg bg-flywl-grey-900 border border-flywl-grey-700">
                <div className="flex items-center mb-3">
                  <InformationCircleIcon className="w-6 h-6 text-flywl-orange-400 mr-2" />
                  <h4 className="text-white font-semibold">Data Management</h4>
                </div>
                <p className="text-sm text-flywl-grey-300">Persist and export curated company/product datasets with consistent counters and schemas.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-white">⚡ Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => onPageChange && onPageChange('search')}
                className="flex items-center justify-center p-4 border-2 border-dashed border-flywl-grey-600 rounded-lg hover:border-flywl-orange-500 hover:bg-flywl-orange-900 transition-colors duration-200 group"
              >
                <MagnifyingGlassIcon className="w-6 h-6 text-flywl-grey-400 group-hover:text-flywl-orange-400 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-white group-hover:text-flywl-orange-100">Search Database</p>
                  <p className="text-sm text-flywl-grey-400">Find companies, and products</p>
                </div>
              </button>

              <button
                onClick={() => onPageChange && onPageChange('generate')}
                className="flex items-center justify-center p-4 border-2 border-dashed border-flywl-grey-600 rounded-lg hover:border-flywl-yellow-500 hover:bg-flywl-yellow-900 transition-colors duration-200 group"
              >
                <PlusIcon className="w-6 h-6 text-flywl-grey-400 group-hover:text-flywl-yellow-400 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-white group-hover:text-flywl-yellow-100">Generate New ID</p>
                  <p className="text-sm text-flywl-grey-400">Create unique identifiers</p>
                </div>
              </button>

              <button
                onClick={() => onPageChange && onPageChange('status')}
                className="flex items-center justify-center p-4 border-2 border-dashed border-flywl-grey-600 rounded-lg hover:border-flywl-orange-500 hover:bg-flywl-orange-900 transition-colors duration-200 group"
              >
                <DocumentTextIcon className="w-6 h-6 text-flywl-grey-400 group-hover:text-flywl-orange-400 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-white group-hover:text-flywl-orange-100">View Applications</p>
                  <p className="text-sm text-flywl-grey-400">Track approval status</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <ProfilePage onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};

export default Dashboard; 