import React, { useState } from 'react';
import { 
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const ProfilePage = ({ onClose }) => {
  const { currentUser, updateProfile, changePassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState('');

  const [userData, setUserData] = useState({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    email: currentUser?.email || '',
    role: currentUser?.role || 'User',
    lastLogin: currentUser?.lastLogin || '',
    memberSince: currentUser?.memberSince || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSaveProfile = () => {
    updateProfile({
      firstName: userData.firstName,
      lastName: userData.lastName
    });
    setMessage({ type: 'success', text: 'Profile updated successfully!' });
    setIsEditing(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long!' });
      return;
    }
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-flywl-grey-800 border border-flywl-grey-700 rounded-lg shadow-flywl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-flywl-grey-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-flywl-orange-500 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">User Profile</h2>
              <p className="text-sm text-flywl-grey-400">Manage your account settings</p>
            </div>
          </div>
          <button onClick={onClose} className="text-flywl-grey-400 hover:text-white transition-colors duration-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-success-900 border-success-700 text-success-200' 
              : 'bg-flywl-maroon-900 border-flywl-maroon-700 text-flywl-maroon-200'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Profile Information */}
        <div className="p-6">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-flywl-grey-300 mb-2">First Name</label>
                <input
                  type="text"
                  value={userData.firstName}
                  onChange={(e) => setUserData({...userData, firstName: e.target.value})}
                  disabled={!isEditing}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-flywl-grey-300 mb-2">Last Name</label>
                <input
                  type="text"
                  value={userData.lastName}
                  onChange={(e) => setUserData({...userData, lastName: e.target.value})}
                  disabled={!isEditing}
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-flywl-grey-300 mb-2">Email</label>
                <div className="flex items-center space-x-2">
                  <EnvelopeIcon className="w-5 h-5 text-flywl-grey-400" />
                  <input
                    type="email"
                    value={userData.email}
                    disabled
                    className="input-field flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
            <div className="bg-flywl-grey-900 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-flywl-grey-300">Role</span>
                <span className="text-white font-medium">{userData.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-flywl-grey-300">Last Login</span>
                <span className="text-white font-medium">{userData.lastLogin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-flywl-grey-300">Member Since</span>
                <span className="text-white font-medium">{userData.memberSince}</span>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Change Password</h3>
              <button onClick={() => setIsChangingPassword(!isChangingPassword)} className="btn-secondary">
                {isChangingPassword ? 'Cancel' : 'Change Password'}
              </button>
            </div>
            {isChangingPassword && (
              <div className="bg-flywl-grey-900 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-flywl-grey-300 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className="input-field pr-10"
                      placeholder="Enter current password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-flywl-grey-400 hover:text-white">
                      {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-flywl-grey-300 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="input-field pr-10"
                      placeholder="Enter new password"
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-flywl-grey-400 hover:text-white">
                      {showNewPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-flywl-grey-300 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="input-field pr-10"
                      placeholder="Confirm new password"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-flywl-grey-400 hover:text-white">
                      {showConfirmPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button onClick={handleChangePassword} className="btn-primary">Update Password</button>
                  <button onClick={() => { setIsChangingPassword(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="btn-secondary">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            {isEditing ? (
              <>
                <button onClick={handleSaveProfile} className="btn-primary">Save Changes</button>
                <button onClick={() => setIsEditing(false)} className="btn-secondary">Cancel</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="btn-primary">Edit Profile</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 