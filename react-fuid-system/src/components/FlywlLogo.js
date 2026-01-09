import React from 'react';

const FlywlLogo = ({ size = 'md', className = '', showText = true, variant = 'default' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const colorVariants = {
    default: {
      text: '#1f2937' // Dark grey
    },
    white: {
      text: '#ffffff'
    },
    dark: {
      text: '#ffffff'
    }
  };

  const colors = colorVariants[variant];

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Image */}
      <div className={`${sizeClasses[size]} relative flex-shrink-0`}>
        <img
          src="/download.jpeg"
          alt="Flywl Logo"
          className="w-full h-full object-contain drop-shadow-sm"
        />
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span 
            className={`text-gradient font-semibold ${textSizeClasses[size]} leading-none`}
          >
            Flywl
          </span>
          {size !== 'sm' && (
            <span 
              className="text-gradient font-semibold text-lg leading-none mt-0.5"
            >
              ID System
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FlywlLogo; 