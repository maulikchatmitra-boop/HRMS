import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { getRoleDashboard } from '../utils/user.utils';
import Input from '../components/Input';
import Button from '../components/Button';
import { extractErrorMessage } from '../api/axiosClient';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
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

    if (!companyCode.trim()) {
      errors.companyCode = 'Company code is required.';
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
      const data = await login(email, password, companyCode);
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 card-shadow-lg p-8 sm:p-10 flex flex-col gap-6">
        {/* Brand/Heading */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-md shadow-indigo-150 mb-4">
            H
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Welcome Back</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-semibold">
            Log in to access your HRMS portal
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="e.g. admin@tech.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />

          <Input
            label="Company Code"
            name="companyCode"
            type="text"
            placeholder="e.g. TECH101"
            value={companyCode}
            onChange={(e) => setCompanyCode(e.target.value)}
            error={fieldErrors.companyCode}
          />

          <div className="flex items-center justify-between mt-1 text-xs">
            <Link
              to="/forgot-password"
              className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2">
            Log In
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
