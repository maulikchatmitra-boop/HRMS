import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { FiChevronDown, FiUser, FiLogOut, FiBriefcase, FiBell } from 'react-icons/fi';
import { getRoleCategory, formatDateTimeDisplay } from '../utils/user.utils';
import axiosClient from '../api/axiosClient';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifDropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await axiosClient.get('/leave/notifications');
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 10 seconds for live notifications
      const interval = setInterval(fetchNotifications, 10000);

      const handleRefresh = () => {
        fetchNotifications();
      };
      window.addEventListener('refreshNotifications', handleRefresh);

      return () => {
        clearInterval(interval);
        window.removeEventListener('refreshNotifications', handleRefresh);
      };
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    try {
      await axiosClient.put(`/leave/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      await Promise.all(unread.map(n => axiosClient.put(`/leave/notifications/${n._id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await axiosClient.delete('/leave/notifications');
      setNotifications([]);
    } catch (err) {
      console.error('Error clearing all notifications:', err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  // Get initials for profile placeholder
  const getInitials = () => {
    const first = user.firstName ? user.firstName[0] : '';
    const last = user.lastName ? user.lastName[0] : '';
    return (first + last).toUpperCase() || 'U';
  };

  // Determine user role badge text
  const getRoleBadge = () => {
    if (user.isSuperAdmin) return 'Super Admin';
    return user.role?.roleName || 'Employee';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-10">
      {/* Search / Breadcrumbs */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span>Portal</span>
          <span>/</span>
          <span className="text-slate-600 font-bold uppercase tracking-wider">
            {getRoleBadge()}
          </span>
        </div>
        {!user.isSuperAdmin && user.companyCode && (
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Company Code: {user.companyCode}
          </span>
        )}
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        {/* Company name if not Super Admin */}
        {!user.isSuperAdmin && user.companyId && getRoleCategory(user.role?.roleName) === 'Company Admin' && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600">
            <FiBriefcase className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {`${user.companySubscriptionStatus ? user.companySubscriptionStatus.charAt(0).toUpperCase() + user.companySubscriptionStatus.slice(1).toLowerCase() : 'Active'} ${user.companyPlan ? user.companyPlan.charAt(0).toUpperCase() + user.companyPlan.slice(1).toLowerCase() : 'Basic'}`}
            </span>
          </div>
        )}

        {/* Notifications Bell */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="p-2 hover:bg-slate-50 rounded-xl relative transition-colors duration-200"
            title="Notifications"
          >
            <FiBell className="w-5 h-5 text-slate-500" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full flex items-center justify-center animate-pulse" />
            )}
          </button>

          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-25 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2.5 border-b border-slate-50 flex items-center justify-between gap-2">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Notifications</p>
                <div className="flex items-center gap-2.5">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-[10px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-wider"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400 font-semibold">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleMarkAsRead(n._id)}
                      className={`px-4 py-3 hover:bg-slate-50/50 cursor-pointer flex gap-3 transition-colors ${
                        !n.isRead ? 'bg-indigo-50/10' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs ${!n.isRead ? 'font-black text-slate-800' : 'font-semibold text-slate-500'}`}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                          {n.message}
                        </p>
                        <p className="text-[9px] text-slate-350 font-bold mt-1.5">
                          {formatDateTimeDisplay(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-slate-100 hidden md:block" />

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-all duration-200"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-50"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=4f46e5&color=fff`;
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs ring-2 ring-indigo-50">
                {getInitials()}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">
                {getRoleBadge()}
              </p>
            </div>
            <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-slate-50">
                <p className="text-xs text-slate-400 font-medium leading-none">Logged in as</p>
                <p className="text-sm font-bold text-slate-700 mt-1 truncate">{user.email}</p>
              </div>
              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <FiUser className="w-4 h-4 text-slate-400" />
                <span>My Profile</span>
              </Link>
              <div className="border-t border-slate-50 my-1" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <FiLogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
