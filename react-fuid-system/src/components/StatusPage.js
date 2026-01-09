import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ClockIcon,
  XCircleIcon,
  PlusIcon,
  DocumentTextIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useApplications } from '../context/ApplicationsContext';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const StatusPage = ({ data, isLoading }) => {
  const [selectedApplication, setSelectedApplication] = useState(null);
  const { applications, deleteApplication } = useApplications();
  const [remoteApplications, setRemoteApplications] = useState([]);
  const { currentUser } = useAuth();

  const refreshRemote = async () => {
    try {
      // Try DB-backed endpoint first
      if (process.env.REACT_APP_USE_DB === 'true' && currentUser?.email) {
        const r = await api.get(`/user-applications`, { params: { email: currentUser.email } });
        setRemoteApplications(Array.isArray(r.items) ? r.items : (r.data?.items || []));
        return;
      }
      const d = await api.get('/data').then(r => r.data);
      const apps = Array.isArray(d.applications) ? d.applications : [];
      setRemoteApplications(apps);
    } catch (_) {
      setRemoteApplications([]);
    }
  };

  React.useEffect(() => { refreshRemote(); }, []);

  const userEmail = currentUser?.email?.toLowerCase() || '';
  const all = remoteApplications.length ? remoteApplications : applications;
  const list = userEmail ? all.filter(a => (a.userEmail || '').toLowerCase() === userEmail) : all;

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-success-400 bg-success-900 border-success-700';
      case 'in-progress':
        return 'text-flywl-yellow-400 bg-flywl-yellow-900 border-flywl-yellow-700';
      case 'rejected':
        return 'text-flywl-maroon-400 bg-flywl-maroon-900 border-flywl-maroon-700';
      case 'submitted':
        return 'text-flywl-grey-400 bg-flywl-grey-900 border-flywl-grey-700';
      default:
        return 'text-flywl-grey-400 bg-flywl-grey-900 border-flywl-grey-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'in-progress':
        return <ClockIcon className="w-5 h-5" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5" />;
      case 'submitted':
        return <DocumentTextIcon className="w-5 h-5" />;
      default:
        return <InformationCircleIcon className="w-5 h-5" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'in-progress':
        return 'In Progress';
      case 'rejected':
        return 'Rejected';
      case 'submitted':
        return 'Submitted';
      default:
        return 'Unknown';
    }
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'submitted':
        return 1;
      case 'in-progress':
        return 2;
      case 'approved':
      case 'rejected':
        return 3;
      default:
        return 1;
    }
  };

  const ApplicationCard = ({ application, index }) => {
    const statusStep = getStatusStep(application.status);
    
    return (
      <div className="card hover:shadow-flywl transition-all duration-200">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 cursor-pointer" onClick={() => setSelectedApplication(application)}>
              <h3 className="text-lg font-semibold text-white">#{index + 1} {application.companyName}</h3>
              <p className="text-flywl-grey-300">{application.productName}</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(application.status)}`}>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(application.status)}
                  <span>{getStatusText(application.status)}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteApplication(application.id);
                }}
                className="p-2 text-flywl-grey-400 hover:text-flywl-maroon-400 hover:bg-flywl-maroon-900 rounded-lg transition-colors duration-200"
                title="Delete Application"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-flywl-grey-400">Request ID</p>
              <p className="text-white font-mono">{application.id}</p>
            </div>
            <div>
              <p className="text-sm text-flywl-grey-400">Submitted</p>
              <p className="text-white">{application.submittedDate}</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  statusStep >= 1 ? 'bg-flywl-orange-500 text-white' : 'bg-flywl-grey-700 text-flywl-grey-400'
                }`}>
                  1
                </div>
                <span className={`text-sm ${statusStep >= 1 ? 'text-white' : 'text-flywl-grey-400'}`}>Submitted</span>
              </div>
              <div className="flex-1 h-0.5 bg-flywl-grey-700 mx-2"></div>
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  statusStep >= 2 ? 'bg-flywl-orange-500 text-white' : 'bg-flywl-grey-700 text-flywl-grey-400'
                }`}>
                  2
                </div>
                <span className={`text-sm ${statusStep >= 2 ? 'text-white' : 'text-flywl-grey-400'}`}>Review</span>
              </div>
              <div className="flex-1 h-0.5 bg-flywl-grey-700 mx-2"></div>
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  statusStep >= 3 ? 'bg-flywl-orange-500 text-white' : 'bg-flywl-grey-700 text-flywl-grey-400'
                }`}>
                  3
                </div>
                <span className={`text-sm ${statusStep >= 3 ? 'text-white' : 'text-flywl-grey-400'}`}>Complete</span>
              </div>
            </div>
          </div>

          {application.fuid && (
            <div className="bg-flywl-grey-900 border border-flywl-grey-600 rounded-lg p-3">
              <p className="text-sm text-flywl-grey-400 mb-1">Generated ID</p>
              <p className="text-flywl-orange-400 font-mono font-medium">{application.fuid}</p>
            </div>
          )}
          {!application.fuid && application.status === 'rejected' && application.reviewerComment && (
            <div className="bg-flywl-grey-900 border border-flywl-grey-600 rounded-lg p-3">
              <p className="text-sm text-flywl-grey-400 mb-1">Rejection Reason</p>
              <p className="text-flywl-maroon-300">{application.reviewerComment}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ApplicationDetail = ({ application, onClose }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-flywl-grey-800 border border-flywl-grey-700 rounded-lg shadow-flywl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-flywl-grey-700">
            <div>
              <h2 className="text-xl font-semibold text-white">Application Details</h2>
              <p className="text-sm text-flywl-grey-400">ID: {application.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-flywl-grey-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Company Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-flywl-grey-400">Company Name</p>
                    <p className="text-white font-medium">{application.companyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-flywl-grey-400">Product Name</p>
                    <p className="text-white font-medium">{application.productName}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Application Status</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-flywl-grey-400">Status</p>
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor(application.status)}`}>
                      {getStatusIcon(application.status)}
                      <span className="font-medium">{getStatusText(application.status)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-flywl-grey-400">Submitted Date</p>
                    <p className="text-white">{application.submittedDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-flywl-grey-400">Last Updated</p>
                    <p className="text-white">{application.statusDate}</p>
                  </div>
                </div>
              </div>
            </div>

            {application.reviewer && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Review Information</h3>
                <div className="bg-flywl-grey-900 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <UserIcon className="w-5 h-5 text-flywl-orange-400" />
                    <div>
                      <p className="text-sm text-flywl-grey-400">Reviewer</p>
                      <p className="text-white font-medium">{application.reviewer}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-flywl-grey-400 mb-2">Comments</p>
                    <p className="text-white">{application.comments}</p>
                  </div>
                </div>
              </div>
            )}

            {application.fuid && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Generated FUID</h3>
                <div className="bg-flywl-grey-900 border border-flywl-grey-600 rounded-lg p-4">
                  <p className="text-flywl-orange-400 font-mono font-medium text-lg">{application.fuid}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Close
              </button>
              {application.status === 'rejected' && (
                <button className="btn-primary">
                  Resubmit Application
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-flywl-radial flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-flywl-grey-300">Loading applications...</p>
        </div>
      </div>
    );
  }

  const filteredApplications = list;

  return (
    <div className="min-h-screen bg-gradient-flywl-radial animate-gradient">
      {/* Header */}
      <div className="bg-flywl-grey-800 border-b border-flywl-grey-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-white">My Applications</h1>
              </div>
            </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Applications List */}
        <div className="grid grid-cols-1 gap-6">
          {filteredApplications.map((application, idx) => (
            <ApplicationCard key={application.id} application={application} index={idx} />
          ))}
        </div>

        {filteredApplications.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-16 h-16 text-flywl-grey-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No applications found</h3>
            <p className="text-flywl-grey-300">
              You haven't submitted any applications for approval yet.
            </p>
            <p className="text-sm text-flywl-grey-400 mt-2">
              Submit a new ID generation request to see your applications here.
            </p>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <ApplicationDetail 
          application={selectedApplication} 
          onClose={() => setSelectedApplication(null)} 
        />
      )}
    </div>
  );
};

export default StatusPage; 