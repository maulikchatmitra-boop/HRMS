import React, { useState } from 'react';
import axiosClient, { extractErrorMessage } from '../api/axiosClient';
import { Link } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import { FiArrowLeft } from 'react-icons/fi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await axiosClient.post('/auth/forgot-password', { email, companyCode });
      setMessage(res.data.message || 'Password reset link sent to your email.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 card-shadow-lg p-8 sm:p-10 flex flex-col gap-8">
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Forgot Password</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-semibold">
            Enter your details to receive a recovery token
          </p>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold">
            {message}
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Company Code"
              name="companyCode"
              placeholder="e.g. TECH101"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="user@tech.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Send Reset Link
            </Button>
          </form>
        )}

        <div className="text-center mt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
