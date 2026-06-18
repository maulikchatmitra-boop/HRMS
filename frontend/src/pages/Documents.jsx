import React, { useState, useEffect } from 'react';
import axiosClient, { extractErrorMessage } from '../api/axiosClient';
import Card from '../components/Card';
import Spinner from '../components/Spinner';
import EmployeeDocumentsTab from '../components/EmployeeDocumentsTab';
import { useAuth } from '../context/AuthContext';
import { hasPermission, getRoleCategory } from '../utils/user.utils';
import { FiFileText, FiAlertCircle, FiClock, FiFolder, FiFile, FiCheckCircle } from 'react-icons/fi';

const Documents = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-documents');
  const [summary, setSummary] = useState({ total: 0, pending: 0, expiring: 0, unacknowledged: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const canUpload = hasPermission(user, 'document.upload');
  const uploadMode = canUpload ? 'manage' : 'view';
  
  const roleCategory = getRoleCategory(user?.role?.roleName);
  const isHROrAdmin = roleCategory === 'HR' || roleCategory === 'Company Admin';

  const fetchSummary = async () => {
    try {
      const res = await axiosClient.get('/documents/summary');
      if (res.data.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      setSummaryError(extractErrorMessage(err));
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [activeTab]);

  // Dynamic Background Polling (Every 15 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSummary();
      setRefreshTrigger(prev => prev + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const tabs = [
    { id: 'my-documents', label: 'My Documents', icon: FiFile },
    { id: 'company-documents', label: 'Company Policies', icon: FiFolder },
    ...(isHROrAdmin ? [
      { id: 'employee-documents', label: 'Employee Documents', icon: FiFileText },
      { id: 'pending', label: 'Pending Verification', icon: FiAlertCircle, badge: summary.pending }
    ] : []),
    { id: 'expiring', label: 'Expiring Documents', icon: FiClock, badge: summary.expiring },
  ];

  const statCards = [
    { 
      label: 'All Documents', 
      value: summary.total, 
      desc: 'Total active files', 
      icon: FiFile, 
      color: 'text-indigo-650 bg-indigo-50 border-indigo-100',
      progressColor: 'bg-indigo-600',
      progressVal: 100 
    },
    { 
      label: 'Pending Review', 
      value: summary.pending, 
      desc: 'Requires verification', 
      icon: FiAlertCircle, 
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      progressColor: 'bg-amber-500',
      progressVal: summary.total > 0 ? (summary.pending / summary.total) * 100 : 0 
    },
    { 
      label: 'Expiring Soon', 
      value: summary.expiring, 
      desc: 'Next 30 days', 
      icon: FiClock, 
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      progressColor: 'bg-rose-500',
      progressVal: summary.total > 0 ? (summary.expiring / summary.total) * 100 : 0 
    },
    { 
      label: 'Unacknowledged', 
      value: summary.unacknowledged, 
      desc: 'Awaiting signature', 
      icon: FiCheckCircle, 
      color: 'text-slate-600 bg-slate-100 border-slate-200',
      progressColor: 'bg-slate-500',
      progressVal: summary.total > 0 ? (summary.unacknowledged / summary.total) * 100 : 0 
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen text-left">

      {/* Summary Statistics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col gap-4 transition-all duration-300 hover:translate-y-[-3px] hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                  {summaryLoading ? (
                    <div className="h-8 w-12 bg-slate-100 animate-pulse rounded-lg mt-2"></div>
                  ) : (
                    <p className="text-3xl font-black text-slate-800 mt-1.5">{c.value}</p>
                  )}
                </div>
                <div className={`p-3.5 rounded-2xl border ${c.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
                  <span>{c.desc}</span>
                  <span>{Math.round(c.progressVal)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${c.progressColor} transition-all duration-500`} style={{ width: `${c.progressVal}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Select & Main Tab Content */}
      <div className="flex flex-col gap-6">
        <div className="flex bg-slate-50 p-1.5 rounded-2xl max-w-max gap-1 flex-wrap shadow-2xs">
          {tabs.map((tabItem) => {
            const TabIcon = tabItem.icon;
            const isActive = activeTab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                onClick={() => setActiveTab(tabItem.id)}
                className={`flex items-center gap-2.5 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-white text-indigo-600 shadow-xs font-black' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tabItem.label}</span>
                {tabItem.badge > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">
                    {tabItem.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="w-full bg-white border border-slate-100 p-6 sm:p-8 rounded-3xl shadow-sm">
          <EmployeeDocumentsTab
            tab={activeTab}
            mode={uploadMode}
            onAction={fetchSummary}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  );
};

export default Documents;
