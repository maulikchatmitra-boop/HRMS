import React, { useState, useEffect } from 'react';
import axiosClient, { extractErrorMessage } from '../api/axiosClient';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import Spinner from './Spinner';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/user.utils';
import { DOCUMENT_CATEGORIES, DOCUMENT_TYPES, CATEGORY_DOCUMENT_TYPES } from '../constants/document.constants';
import {
  FiFileText,
  FiDownload,
  FiTrash2,
  FiCheck,
  FiX,
  FiUploadCloud,
  FiSearch,
  FiRefreshCw
} from 'react-icons/fi';

const EmployeeDocumentsTab = ({ employeeId, tab, mode = 'view', onAction, refreshTrigger }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload Form State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES.IDENTITY);
  const [documentType, setDocumentType] = useState('');
  const [file, setFile] = useState(null);
  const [isVisibleToEmployee, setIsVisibleToEmployee] = useState(true);
  const [isDownloadable, setIsDownloadable] = useState(true);
  const [expiryDate, setExpiryDate] = useState('');
  const [isCompanyPolicy, setIsCompanyPolicy] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState(employeeId || '');
  const [allEmployees, setAllEmployees] = useState([]);

  // Load documents
  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      let url = tab 
        ? `/documents/dashboard?tab=${tab}${employeeId ? `&employeeId=${employeeId}` : ''}`
        : `/employees/${employeeId}/documents`;
      
      const res = await axiosClient.get(url);
      setDocuments(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [employeeId, tab, refreshTrigger]);

  // Load active employees list for HR/Admin dropdown when uploading in general documents view
  useEffect(() => {
    if (mode === 'manage' && !employeeId) {
      const fetchAll = async () => {
        try {
          const res = await axiosClient.get('/employees/list?limit=200&status=active');
          const list = res.data.data?.users || res.data.data?.employees || res.data.data || [];
          // Filter out the currently logged-in HR/Admin user from the selection list
          const filteredList = list.filter(emp => emp._id !== user?._id);
          setAllEmployees(filteredList);
        } catch (err) {
          console.warn('Failed to load active employees:', err);
        }
      };
      fetchAll();
    }
  }, [mode, employeeId, user]);

  // Sync default documentType when category changes
  useEffect(() => {
    const types = CATEGORY_DOCUMENT_TYPES[category] || [];
    setDocumentType(types[0] || '');
  }, [category]);

  // Reset form inputs to default states
  const resetForm = () => {
    setCategory(DOCUMENT_CATEGORIES.IDENTITY);
    const types = CATEGORY_DOCUMENT_TYPES[DOCUMENT_CATEGORIES.IDENTITY] || [];
    setDocumentType(types[0] || '');
    setFile(null);
    setIsVisibleToEmployee(true);
    setIsDownloadable(true);
    setExpiryDate('');
    setIsCompanyPolicy(false);
    setSendNotification(false);
    setTargetEmployeeId(employeeId || '');
    setUploadError('');
    setUploadSuccess('');
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');
    
    // Custom validations
    if (!file) {
      setUploadError('Please select a file to upload.');
      return;
    }
    
    const uploadEmpId = isCompanyPolicy ? 'null' : targetEmployeeId;
    if (!isCompanyPolicy && !uploadEmpId) {
      setUploadError('Please select an employee for this document.');
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('documentType', documentType);
    formData.append('isVisibleToEmployee', isCompanyPolicy ? 'true' : isVisibleToEmployee.toString());
    formData.append('isDownloadable', isCompanyPolicy ? 'true' : isDownloadable.toString());
    formData.append('isCompanyPolicy', isCompanyPolicy.toString());
    if (expiryDate) formData.append('expiryDate', expiryDate);
    if (!isCompanyPolicy) formData.append('sendNotification', sendNotification.toString());

    try {
      await axiosClient.post(`/employees/${uploadEmpId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadSuccess('Document uploaded successfully!');
      
      fetchDocuments();
      onAction?.();
      setTimeout(() => {
        setIsUploadModalOpen(false);
        resetForm();
      }, 1000);
    } catch (err) {
      setUploadError(extractErrorMessage(err));
    } finally {
      setUploadLoading(false);
    }
  };

  const handleVerify = async (docId, status) => {
    try {
      await axiosClient.patch(`/documents/${docId}/verify`, { verificationStatus: status });
      fetchDocuments();
      onAction?.();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const handleAcknowledge = async (docId) => {
    try {
      await axiosClient.patch(`/documents/${docId}/acknowledge`);
      fetchDocuments();
      onAction?.();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const handleDelete = async (docId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}" permanently?`)) return;
    try {
      await axiosClient.delete(`/documents/${docId}`);
      fetchDocuments();
      onAction?.();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  // Direct download in the browser
  const handleDownload = async (docId, fileName) => {
    try {
      const res = await axiosClient.get(`/documents/${docId}/download`);
      const { downloadUrl } = res.data.data;
      if (downloadUrl) {
        try {
          // Fetch the file as a blob to preserve original filename on cross-origin requests
          const response = await fetch(downloadUrl);
          if (!response.ok) throw new Error('Failed to fetch download file');
          const blob = await response.blob();
          
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        } catch (fetchErr) {
          // Fallback to direct anchor link download if fetch fails (e.g. strict CSP / CORS)
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', fileName);
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    const ownerName = doc.employeeId
      ? `${doc.employeeId.firstName} ${doc.employeeId.lastName}`.toLowerCase()
      : 'company policy';
    return (
      doc.originalFileName.toLowerCase().includes(query) ||
      doc.category.toLowerCase().includes(query) ||
      doc.documentType.toLowerCase().includes(query) ||
      ownerName.includes(query)
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full text-left">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          {mode === 'manage' && (
            <Button icon={FiUploadCloud} onClick={() => { resetForm(); setIsUploadModalOpen(true); }}>
              Upload Document
            </Button>
          )}
          <button onClick={fetchDocuments} className="p-2 border rounded-xl hover:bg-slate-50 cursor-pointer">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="w-full">
        {error && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm mb-6">{error}</div>}
        {loading && documents.length === 0 ? (
          <Spinner size="md" />
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white border rounded-3xl p-12 text-center text-slate-500">
            No documents found.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDocs.map((doc) => {
              const isOwnDoc = doc.employeeId && (doc.employeeId._id === user._id || doc.employeeId === user._id);
              const isImage = doc.mimeType?.startsWith('image/');
              const iconTheme = isImage 
                ? 'bg-teal-50 text-teal-600 border-teal-100' 
                : 'bg-rose-50 text-rose-600 border-rose-105';
              
              return (
                <div key={doc._id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-md group relative">
                  
                  {/* Category / Size Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      {doc.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>

                  {/* Document File details card */}
                  <div className="flex items-start gap-4">
                    <div className={`p-4 rounded-2xl border flex-shrink-0 flex items-center justify-center ${iconTheme}`}>
                      <FiFileText className="w-6 h-6 animate-in fade-in" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <h5 className="font-bold text-slate-800 text-sm truncate leading-snug group-hover:text-indigo-650 transition-colors" title={doc.originalFileName}>
                        {doc.originalFileName}
                      </h5>
                      <p className="text-[10px] text-indigo-600 font-bold mt-1 uppercase tracking-wide">
                        {doc.documentType.replace(/_/g, ' ')}
                      </p>

                      {doc.expiryDate && (
                        <p className="text-[9px] text-rose-500 font-bold mt-1.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          <span>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                        </p>
                      )}

                      {/* Show document owner if relevant */}
                      {tab !== 'my-documents' && doc.employeeId && (
                        <p className="text-[10px] text-slate-500 font-semibold mt-1.5">
                          Assigned To: {doc.employeeId.firstName} {doc.employeeId.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Badges row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      doc.verificationStatus === 'verified'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : doc.verificationStatus === 'rejected'
                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {doc.verificationStatus}
                    </span>
                    
                    {doc.isCompanyPolicy ? (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border-indigo-100">
                        Policy
                      </span>
                    ) : doc.acknowledged ? (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border-emerald-100">
                        Acknowledged
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border-slate-200">
                        Pending Ack
                      </span>
                    )}
                  </div>

                  {/* Assigner Profile Details & Actions Bottom Section */}
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-4 mt-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-black text-slate-600 uppercase flex-shrink-0">
                        {doc.uploadedBy ? `${doc.uploadedBy.firstName?.charAt(0)}${doc.uploadedBy.lastName?.charAt(0)}` : 'SYS'}
                      </div>
                      <div className="text-left truncate min-w-0">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Assigned By</span>
                        <p className="text-xs font-bold text-slate-750 truncate leading-none mt-1">
                          {doc.uploadedBy ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : 'System'}
                        </p>
                        <p className="text-[9px] text-slate-405 mt-0.5 leading-none">
                          on {new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center gap-1.5">
                      {/* Download */}
                      {(doc.isCompanyPolicy || doc.isDownloadable || hasPermission(user, 'document.upload')) && (
                        <button
                          onClick={() => handleDownload(doc._id, doc.originalFileName)}
                          title="Download Document"
                          className="p-2 text-indigo-650 hover:bg-indigo-50 border border-slate-100 rounded-xl transition-all cursor-pointer"
                        >
                          <FiDownload className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Acknowledge */}
                      {!doc.isCompanyPolicy && isOwnDoc && !doc.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(doc._id)}
                          title="Acknowledge Receipt"
                          className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                          <span>Ack</span>
                        </button>
                      )}

                      {/* Verification for HR/Admin */}
                      {hasPermission(user, 'document.verify') && doc.verificationStatus === 'pending' && !doc.isCompanyPolicy && (
                        <>
                          <button
                            onClick={() => handleVerify(doc._id, 'verified')}
                            title="Verify & Approve"
                            className="p-2 text-emerald-600 hover:bg-emerald-50 border border-slate-100 rounded-xl transition-all cursor-pointer"
                          >
                            <FiCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleVerify(doc._id, 'rejected')}
                            title="Reject Document"
                            className="p-2 text-rose-500 hover:bg-rose-50 border border-slate-100 rounded-xl transition-all cursor-pointer"
                          >
                            <FiX className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* Delete */}
                      {mode === 'manage' && (
                        <button
                          onClick={() => handleDelete(doc._id, doc.originalFileName)}
                          title="Delete Permanently"
                          className="p-2 text-rose-500 hover:bg-rose-50 border border-slate-100 rounded-xl transition-all cursor-pointer"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => { resetForm(); setIsUploadModalOpen(false); }} title="Upload Document">
        <form onSubmit={handleUploadSubmit} className="space-y-5 text-left">
          {uploadError && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
              <FiX className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
          {uploadSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
              <FiCheck className="w-4 h-4 flex-shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Policy Toggle Card */}
          <div 
            onClick={() => {
              const newVal = !isCompanyPolicy;
              setIsCompanyPolicy(newVal);
              if (newVal) {
                setTargetEmployeeId('');
                setCategory(DOCUMENT_CATEGORIES.OTHER);
                setDocumentType(DOCUMENT_TYPES.COMPANY_POLICY_SOP);
              } else {
                setCategory(DOCUMENT_CATEGORIES.IDENTITY);
                const types = CATEGORY_DOCUMENT_TYPES[DOCUMENT_CATEGORIES.IDENTITY] || [];
                setDocumentType(types[0] || '');
              }
            }}
            className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
              isCompanyPolicy 
                ? 'bg-indigo-50/40 shadow-2xs' 
                : 'bg-slate-50/60 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isCompanyPolicy ? 'bg-indigo-100 text-indigo-655 font-bold' : 'bg-slate-100 text-slate-500'}`}>
                <FiFileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Company Policy / Global Document</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Visible and downloadable by all company tenants globally</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
              isCompanyPolicy 
                ? 'bg-indigo-600 border-indigo-600 text-white' 
                : 'border-slate-350 bg-white'
            }`}>
              {isCompanyPolicy && <FiCheck className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Target Employee Dropdown */}
          {!isCompanyPolicy && !employeeId && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="targetEmployeeId" className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                Select Employee <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="targetEmployeeId"
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50/80 rounded-xl text-slate-850 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600/20 transition-all duration-200 appearance-none cursor-pointer border border-slate-100/50"
                >
                  <option value="">-- Choose Employee --</option>
                  {allEmployees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.email})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-405">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* If isCompanyPolicy is true, show one specialized dropdown. Otherwise show Category & Type grid */}
          {isCompanyPolicy ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="globalDocType" className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                Global Document Type <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="globalDocType"
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value);
                    setCategory(DOCUMENT_CATEGORIES.OTHER);
                  }}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50/80 rounded-xl text-slate-850 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600/20 transition-all duration-200 appearance-none cursor-pointer border border-slate-100/50"
                >
                  <option value={DOCUMENT_TYPES.COMPANY_POLICY_SOP}>Company Policy / SOP</option>
                  <option value={DOCUMENT_TYPES.EMPLOYEE_HANDBOOK}>Employee Handbook & Code of Conduct</option>
                  <option value={DOCUMENT_TYPES.TRAINING_GUIDE}>Training & Onboarding Guide</option>
                  <option value={DOCUMENT_TYPES.HR_TEMPLATE_FORM}>HR Templates & Forms</option>
                  <option value={DOCUMENT_TYPES.COMPLIANCE_SAFETY}>Corporate Compliance & Safety</option>
                  <option value={DOCUMENT_TYPES.BENEFITS_INSURANCE}>Benefits & Insurance Guide</option>
                  <option value={DOCUMENT_TYPES.OTHER}>Other Company Related Document</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-405">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            /* Category & Type */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="category" className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                  Document Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50/80 rounded-xl text-slate-850 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600/20 transition-all duration-200 appearance-none cursor-pointer border border-slate-100/50"
                  >
                    {Object.keys(DOCUMENT_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-405">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="documentType" className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                  Document Type <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="documentType"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50/80 rounded-xl text-slate-850 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600/20 transition-all duration-200 appearance-none cursor-pointer border border-slate-100/50"
                  >
                    {(CATEGORY_DOCUMENT_TYPES[category] || []).map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-455">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expiry Date */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expiryDate" className="text-xs font-bold text-slate-500 tracking-wider uppercase">
              Expiry Date
            </label>
            <input
              type="date"
              id="expiryDate"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50/80 rounded-xl text-slate-855 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600/20 transition-all duration-200 cursor-pointer border border-slate-100/50"
            />
          </div>

          {/* Toggles */}
          {!isCompanyPolicy && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1 bg-slate-50/40 p-4 rounded-2xl">
              <div 
                onClick={() => setIsVisibleToEmployee(!isVisibleToEmployee)}
                className="flex items-center gap-2.5 cursor-pointer select-none"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  isVisibleToEmployee 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {isVisibleToEmployee && <FiCheck className="w-3 h-3 animate-in fade-in" />}
                </div>
                <label className="text-xs font-semibold text-slate-705 cursor-pointer">
                  Visible to Employee
                </label>
              </div>

              <div 
                onClick={() => setIsDownloadable(!isDownloadable)}
                className="flex items-center gap-2.5 cursor-pointer select-none"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  isDownloadable 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {isDownloadable && <FiCheck className="w-3 h-3 animate-in fade-in" />}
                </div>
                <label className="text-xs font-semibold text-slate-705 cursor-pointer">
                  Downloadable by Employee
                </label>
              </div>

              <div 
                onClick={() => setSendNotification(!sendNotification)}
                className="flex items-center gap-2.5 sm:col-span-2 mt-1 cursor-pointer select-none"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  sendNotification 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {sendNotification && <FiCheck className="w-3 h-3 animate-in fade-in" />}
                </div>
                <label className="text-xs font-semibold text-slate-705 cursor-pointer">
                  Send In-App Notification
                </label>
              </div>
            </div>
          )}

          {/* File Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 tracking-wider uppercase">
              Select Document File <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-100 hover:border-indigo-550 bg-slate-50/40 hover:bg-indigo-50/5 rounded-2xl p-6 transition-all relative flex flex-col items-center justify-center text-center group cursor-pointer">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <FiUploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-650 transition-colors mb-2" />
              {file ? (
                <div>
                  <p className="text-sm font-bold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-755 group-hover:text-indigo-650 transition-colors">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    PDF, JPG, PNG or DOC (Max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => { resetForm(); setIsUploadModalOpen(false); }} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={uploadLoading}>
              Upload File
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeeDocumentsTab;
