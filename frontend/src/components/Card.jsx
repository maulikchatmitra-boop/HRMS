import React from 'react';

const Card = ({ children, className = '', title, subtitle, actions }) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 card-shadow-lg overflow-hidden transition-all duration-300 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default Card;
