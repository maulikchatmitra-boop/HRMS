import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { FiSettings, FiCheck } from 'react-icons/fi';

const DAYS_OF_WEEK = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

const Settings = () => {
  const [weekOffDays, setWeekOffDays] = useState([0, 6]); // Default Saturday & Sunday
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axiosClient.get('/attendance/settings');
      if (res.data && res.data.data && Array.isArray(res.data.data.weekOffDays)) {
        setWeekOffDays(res.data.data.weekOffDays);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleCheckboxChange = (value) => {
    setSuccess('');
    setWeekOffDays((prev) =>
      prev.includes(value) ? prev.filter((day) => day !== value) : [...prev, value]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaveLoading(true);
    try {
      await axiosClient.put('/attendance/settings', { weekOffDays });
      setSuccess('Settings updated successfully! A new version of settings has been activated.');
      fetchSettings();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Settings</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Configure weekend policies and global company settings
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold">
          {success}
        </div>
      )}

      <div className="max-w-2xl">
        <Card title="Attendance & Weekend Configurations" subtitle="Specify which days are designated as weekly offs for your organization.">
          {loading ? (
            <div className="py-8 flex justify-center items-center">
              <span className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-6 mt-2">
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                  Week-off Days (Weekends)
                </label>
                <p className="text-xs text-slate-400 font-medium">
                  Note: Updating week-offs creates a new settings version starting today. Existing logs prior to today will remain unaffected.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isChecked = weekOffDays.includes(day.value);
                    return (
                      <label
                        key={day.value}
                        className={`flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/50 cursor-pointer transition-all duration-200 select-none ${
                          isChecked ? 'bg-indigo-50/15 border-indigo-200 shadow-xs' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(day.value)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-sm font-bold text-slate-700">{day.label}</span>
                        </div>
                        {isChecked && (
                          <span className="text-indigo-600 bg-indigo-50 p-1 rounded-md text-xs">
                            <FiCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-5 mt-2">
                <Button
                  type="submit"
                  loading={saveLoading}
                  icon={FiSettings}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  Save Configurations
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Settings;
