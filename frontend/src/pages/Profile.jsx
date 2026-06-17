import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosClient, { extractErrorMessage } from '../api/axiosClient';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { FiUser, FiLock, FiCalendar, FiMapPin, FiClock, FiCheck } from 'react-icons/fi';
import { formatTime12h } from '../utils/user.utils';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('details');

  // Profile Edit State
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  // Password Edit State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Alerts
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Field Errors
  const [fieldErrors, setFieldErrors] = useState({});
  const [pwdFieldErrors, setPwdFieldErrors] = useState({});

  // Loadings
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const validateProfileForm = () => {
    const errors = {};
    const trimmedFirst = firstName ? firstName.trim() : '';
    const trimmedLast = lastName ? lastName.trim() : '';
    const trimmedPhone = phone ? phone.trim() : '';
    const trimmedCity = city ? city.trim() : '';
    const trimmedAddress = address ? address.trim() : '';
    const trimmedAvatar = avatar ? avatar.trim() : '';

    if (!trimmedFirst) {
      errors.firstName = 'First name is required.';
    } else if (trimmedFirst.length < 2) {
      errors.firstName = 'First name must be at least 2 characters.';
    } else if (trimmedFirst.length > 50) {
      errors.firstName = 'First name cannot exceed 50 characters.';
    } else if (!/^[a-zA-Z\s]+$/.test(trimmedFirst)) {
      errors.firstName = 'First name can only contain letters and spaces.';
    }

    if (!trimmedLast) {
      errors.lastName = 'Last name is required.';
    } else if (trimmedLast.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters.';
    } else if (trimmedLast.length > 50) {
      errors.lastName = 'Last name cannot exceed 50 characters.';
    } else if (!/^[a-zA-Z\s]+$/.test(trimmedLast)) {
      errors.lastName = 'Last name can only contain letters and spaces.';
    }

    if (!trimmedPhone) {
      errors.phone = 'Phone number is required.';
    } else if (!/^[0-9]{10}$/.test(trimmedPhone)) {
      errors.phone = 'Phone number must be exactly 10 digits.';
    } else if (/^(.)\1{9}$/.test(trimmedPhone)) {
      errors.phone = 'Phone number cannot consist of the same repeating digit.';
    }

    if (!trimmedCity) {
      errors.city = 'City is required.';
    } else if (trimmedCity.length < 2) {
      errors.city = 'City name must be at least 2 characters.';
    } else if (trimmedCity.length > 50) {
      errors.city = 'City name cannot exceed 50 characters.';
    } else if (!/^[a-zA-Z\s]+$/.test(trimmedCity)) {
      errors.city = 'City can only contain letters and spaces.';
    }

    if (!trimmedAddress) {
      errors.address = 'Address is required.';
    } else if (trimmedAddress.length < 5) {
      errors.address = 'Address must be at least 5 characters.';
    } else if (trimmedAddress.length > 250) {
      errors.address = 'Address cannot exceed 250 characters.';
    }

    if (trimmedAvatar) {
      if (!/^https?:\/\/\S+\.\S+/.test(trimmedAvatar)) {
        errors.avatar = 'Please enter a valid image URL starting with http:// or https://.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = () => {
    const errors = {};
    if (!currentPassword) {
      errors.currentPassword = 'Current password is required.';
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters long.';
    } else if (!passwordRegex.test(newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm new password is required.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setPwdFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setFieldErrors({});

    if (!validateProfileForm()) {
      return;
    }

    setProfileLoading(true);

    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone ? phone.trim() : '',
        address: address ? address.trim() : '',
        city: city ? city.trim() : '',
        avatar: avatar ? avatar.trim() : null,
      });
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      const respData = err.response?.data;
      if (respData && respData.errors && Array.isArray(respData.errors) && respData.errors.length > 0) {
        const mapped = {};
        respData.errors.forEach((fErr) => {
          mapped[fErr.field] = fErr.message;
        });
        setFieldErrors(mapped);
      } else {
        setProfileError(extractErrorMessage(err));
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdSuccess('');
    setPwdError('');
    setPwdFieldErrors({});

    if (!validatePasswordForm()) {
      return;
    }

    setPwdLoading(true);

    try {
      const res = await axiosClient.post('/auth/change-password', {
        oldPassword: currentPassword,
        newPassword,
      });
      setPwdSuccess(res.data.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const respData = err.response?.data;
      if (respData && respData.errors && Array.isArray(respData.errors) && respData.errors.length > 0) {
        const mapped = {};
        respData.errors.forEach((fErr) => {
          mapped[fErr.field] = fErr.message;
        });
        setPwdFieldErrors(mapped);
      } else {
        setPwdError(extractErrorMessage(err));
      }
    } finally {
      setPwdLoading(false);
    }
  };

  // Profile Header Initials
  const getInitials = () => {
    const first = user?.firstName ? user.firstName[0] : '';
    const last = user?.lastName ? user.lastName[0] : '';
    return (first + last).toUpperCase() || 'U';
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-100 card-shadow-lg p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={`${user.firstName} ${user.lastName}`}
            className="w-24 h-24 rounded-2xl object-cover ring-4 ring-indigo-50"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=4f46e5&color=fff`;
            }}
          />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-3xl ring-4 ring-indigo-50">
            {getInitials()}
          </div>
        )}

        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-sm text-indigo-600 font-bold tracking-wide mt-0.5">
            {user?.isSuperAdmin ? 'Super Administrator' : user?.role?.roleName || 'Employee'}
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-slate-400 text-xs font-semibold">
            {user?.department && (
              <span className="flex items-center gap-1.5">
                <FiUser className="w-3.5 h-3.5" />
                <span>{user.department.name}</span>
              </span>
            )}
            {user?.designation && (
              <span className="flex items-center gap-1.5">
                <FiClock className="w-3.5 h-3.5" />
                <span>{user.designation.title}</span>
              </span>
            )}
            {user?.branch && (
              <span className="flex items-center gap-1.5">
                <FiMapPin className="w-3.5 h-3.5" />
                <span>{user.branch.name}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-4 text-sm font-bold tracking-wide uppercase transition-all relative ${
            activeTab === 'details'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Personal Details
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`pb-4 text-sm font-bold tracking-wide uppercase transition-all relative ${
            activeTab === 'password'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Change Password
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Edit form */}
          <div className="lg:col-span-2">
            <Card title="Edit Details" subtitle="Update your basic contact information">
              {profileSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold mb-6 flex items-center gap-2">
                  <FiCheck className="w-4 h-4" />
                  <span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold mb-6">
                  {profileError}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="First Name"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  error={fieldErrors.firstName}
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  error={fieldErrors.lastName}
                />
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="opacity-70"
                />
                <Input
                  label="Phone Number"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={fieldErrors.phone}
                />
                <Input
                  label="City"
                  name="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  error={fieldErrors.city}
                />
                <Input
                  label="Avatar Image URL"
                  name="avatar"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/image.png"
                  error={fieldErrors.avatar}
                />
                <Input
                  label="Address"
                  name="address"
                  type="textarea"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  error={fieldErrors.address}
                  className="sm:col-span-2"
                />

                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" loading={profileLoading}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* System/Read-only info */}
          <div>
            <Card title="Work Profile" subtitle="Employment & System configuration (Read Only)">
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Account Status
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 mt-1 capitalize">
                    {user?.status}
                  </span>
                </div>
                <hr className="border-slate-50" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Department
                  </span>
                  <span className="text-sm font-semibold text-slate-700 block mt-0.5">
                    {user?.department?.name || 'Not Assigned'}
                  </span>
                </div>
                <hr className="border-slate-50" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Designation
                  </span>
                  <span className="text-sm font-semibold text-slate-700 block mt-0.5">
                    {user?.designation?.title || 'Not Assigned'}
                  </span>
                </div>
                <hr className="border-slate-50" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Shift
                  </span>
                  <span className="text-sm font-semibold text-slate-700 block mt-0.5">
                    {user?.shift
                      ? `${user.shift.name} (${formatTime12h(user.shift.startTime)} - ${formatTime12h(user.shift.endTime)})`
                      : 'Not Assigned'}
                  </span>
                </div>
                <hr className="border-slate-50" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Last Login
                  </span>
                  <span className="text-sm font-semibold text-slate-700 block mt-0.5">
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'First Session'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="max-w-xl">
          <Card title="Update Password" subtitle="Keep your portal access secure">
            {pwdSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold mb-6 flex items-center gap-2">
                <FiCheck className="w-4 h-4" />
                <span>{pwdSuccess}</span>
              </div>
            )}
            {pwdError && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold mb-6">
                {pwdError}
              </div>
            )}

            <form onSubmit={handleChangePassword} noValidate className="flex flex-col gap-5">
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={pwdFieldErrors.currentPassword}
              />
              <Input
                label="New Password"
                name="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={pwdFieldErrors.newPassword}
              />
              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={pwdFieldErrors.confirmPassword}
              />

              <div className="flex justify-end mt-2">
                <Button type="submit" loading={pwdLoading}>
                  Change Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Profile;
