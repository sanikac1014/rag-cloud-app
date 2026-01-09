import React from 'react';
import FlywlLogo from './FlywlLogo';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-flywl-grey-900 flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <FlywlLogo 
            size="xl" 
            showText={true}
            variant="dark"
            className="drop-shadow-lg"
          />
        </div>
        
        {/* Loading Animation */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-flywl-orange-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-flywl-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-flywl-maroon-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
        
        {/* Text */}
        <h1 className="text-2xl font-bold text-white mb-2">Management System</h1>
        <p className="text-flywl-grey-300 mb-4">Loading database and initializing system...</p>
        
        {/* Progress Bar */}
        <div className="w-64 mx-auto">
          <div className="bg-flywl-grey-700 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-flywl h-full rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <p className="text-sm text-flywl-grey-400 mt-4">Please wait while we prepare your workspace</p>
      </div>
    </div>
  );
};

export default LoadingScreen; 