// components/common/Spinner.js
import React from 'react';

// Bu bileşen, yükleme durumları için kullanılabilir
export default function Spinner({ size = 'md', color = 'indigo' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };
  
  const colorClasses = {
    white: 'border-white',
    gray: 'border-gray-500',
    indigo: 'border-indigo-500'
  };
  
  return (
    <div className={`spinner ${sizeClasses[size]}`}>
      <style jsx>{`
        .spinner {
          border: 2px solid #f3f3f3;
          border-radius: 50%;
          border-top: 2px solid ${colorClasses[color]};
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}