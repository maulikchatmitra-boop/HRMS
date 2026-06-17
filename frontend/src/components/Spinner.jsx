import React from 'react';

const Spinner = ({ size = 'md', color = 'indigo', fullPage = false }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const colorClasses = {
    indigo: 'border-t-indigo-600 border-indigo-200',
    white: 'border-t-white border-white/20',
    slate: 'border-t-slate-800 border-slate-200',
  };

  const spinnerElement = (
    <div
      className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50/70 z-50 backdrop-blur-sm">
        {spinnerElement}
      </div>
    );
  }

  return <div className="flex items-center justify-center p-4">{spinnerElement}</div>;
};

export default Spinner;
