import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRoleDashboard } from '../../utils/user.utils';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { extractErrorMessage } from '../../api/axiosClient';

const SuperAdminLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Super Admin login passes empty string for companyCode
      const data = await login(email, password, '');
      if (data?.success) {
        navigate(getRoleDashboard(data.data.user), { replace: true });
      }
    } catch (err) {
      const respData = err.response?.data;
      if (respData && respData.errors && Array.isArray(respData.errors) && respData.errors.length > 0) {
        const mapped = {};
        respData.errors.forEach((fErr) => {
          mapped[fErr.field] = fErr.message;
        });
        setFieldErrors(mapped);
      } else {
        setError(extractErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-3xl border border-slate-700/50 p-8 sm:p-10 flex flex-col gap-6 shadow-2xl">
        {/* Brand/Heading */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-md shadow-indigo-550 mb-4 animate-pulse">
            H
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">System Console</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-semibold">
            Super Admin Authentication Portal
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Super Admin Email
            </label>
            <input
              type="email"
              placeholder="e.g. superadmin@hrms.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:bg-slate-700 focus:border-indigo-500 transition-all duration-200"
            />
            {fieldErrors.email && (
              <span className="text-xs font-medium text-rose-400 mt-0.5">{fieldErrors.email}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Console Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:bg-slate-700 focus:border-indigo-500 transition-all duration-200"
            />
            {fieldErrors.password && (
              <span className="text-xs font-medium text-rose-400 mt-0.5">{fieldErrors.password}</span>
            )}
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 border-none text-white font-bold">
            Initialize Console
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
