import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axiosClient, { extractErrorMessage } from '../api/axiosClient';
import Input from '../components/Input';
import Button from '../components/Button';
import { FiCheckCircle } from 'react-icons/fi';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    if (!password) {
      errors.password = 'Password is required.';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm password is required.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
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

    if (!token) {
      setError('Invalid or expired reset token');
      return;
    }

    setLoading(true);

    try {
      await axiosClient.post('/auth/reset-password', {
        token,
        newPassword: password,
      });
      setSuccess(true);
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Reset Password</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-semibold">
            Create a new password for your account
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center flex flex-col items-center gap-4 py-4">
            <FiCheckCircle className="w-16 h-16 text-emerald-500 animate-bounce" />
            <h3 className="text-lg font-bold text-slate-800">Password Changed!</h3>
            <p className="text-sm text-slate-500 font-medium">
              Your password has been successfully updated. You can now log in.
            </p>
            <Link to="/login" className="w-full mt-4">
              <Button className="w-full">Proceed to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Input
              label="New Password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              error={fieldErrors.password}
            />

            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              error={fieldErrors.confirmPassword}
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Reset Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
