import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Table from '../../components/Table';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { FiPlus, FiCreditCard, FiGlobe, FiMail, FiPhone } from 'react-icons/fi';
import { formatDateDisplay } from '../../utils/user.utils';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Form states - Create Company
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [btnLoading, setBtnLoading] = useState(false);

  // Form states - Edit Subscription
  const [status, setStatus] = useState('active');
  const [subStatus, setSubStatus] = useState('active');
  const [plan, setPlan] = useState('basic');

  const isDummyPhone = (val) => {
    if (/^(\d)\1{9}$/.test(val)) return true;
    if (val === '1234567890' || val === '0123456789' || val === '9876543210') return true;
    return false;
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/super-admin/companies');
      // Verify response structure
      setCompanies(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const errors = {};

    // Company Name Validation
    const cleanCompanyName = companyName.trim();
    if (!cleanCompanyName) {
      errors['company.companyName'] = 'Company name is required.';
    } else if (cleanCompanyName.length < 2) {
      errors['company.companyName'] = 'Company name must be at least 2 characters long.';
    } else if (cleanCompanyName.length > 100) {
      errors['company.companyName'] = 'Company name cannot exceed 100 characters.';
    } else if (!/^[a-zA-Z0-9\s.,&'-]+$/.test(cleanCompanyName)) {
      errors['company.companyName'] = 'Company name can only contain letters, numbers, spaces, hyphens, periods, ampersands, commas, and apostrophes.';
    }

    // Company Code Validation
    const cleanCompanyCode = companyCode.trim();
    if (!cleanCompanyCode) {
      errors['company.companyCode'] = 'Company code is required.';
    } else if (cleanCompanyCode.length < 2) {
      errors['company.companyCode'] = 'Company code must be at least 2 characters long.';
    } else if (cleanCompanyCode.length > 10) {
      errors['company.companyCode'] = 'Company code cannot exceed 10 characters.';
    } else if (!/^[A-Z0-9]+$/.test(cleanCompanyCode)) {
      errors['company.companyCode'] = 'Company code must contain only uppercase letters and numbers.';
    }
    // Company Email Validation
    const cleanCompanyEmail = companyEmail.trim();
    if (!cleanCompanyEmail) {
      errors['company.email'] = 'Company contact email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanCompanyEmail)) {
      errors['company.email'] = 'Please enter a valid company contact email address.';
    }

    // Company Phone Validation
    const cleanCompanyPhone = companyPhone.trim();
    if (!cleanCompanyPhone) {
      errors['company.phone'] = 'Company phone number is required.';
    } else if (!/^[0-9]{10}$/.test(cleanCompanyPhone)) {
      errors['company.phone'] = 'Company phone number must be exactly 10 digits.';
    } else if (isDummyPhone(cleanCompanyPhone)) {
      errors['company.phone'] = 'Dummy phone sequences (like repeating digits or sequential digits) are not allowed.';
    }

    // Admin First Name Validation
    const cleanAdminFirstName = adminFirstName.trim();
    if (!cleanAdminFirstName) {
      errors['admin.firstName'] = 'Admin first name is required.';
    } else if (cleanAdminFirstName.length < 2) {
      errors['admin.firstName'] = 'First name must be at least 2 characters.';
    } else if (cleanAdminFirstName.length > 50) {
      errors['admin.firstName'] = 'First name cannot exceed 50 characters.';
    } else if (!/^[a-zA-Z\s]+$/.test(cleanAdminFirstName)) {
      errors['admin.firstName'] = 'First name can only contain letters and spaces.';
    }

    // Admin Last Name Validation
    const cleanAdminLastName = adminLastName.trim();
    if (!cleanAdminLastName) {
      errors['admin.lastName'] = 'Admin last name is required.';
    } else if (cleanAdminLastName.length < 2) {
      errors['admin.lastName'] = 'Last name must be at least 2 characters.';
    } else if (cleanAdminLastName.length > 50) {
      errors['admin.lastName'] = 'Last name cannot exceed 50 characters.';
    } else if (!/^[a-zA-Z\s]+$/.test(cleanAdminLastName)) {
      errors['admin.lastName'] = 'Last name can only contain letters and spaces.';
    }

    // Admin Email Validation
    const cleanAdminEmail = adminEmail.trim();
    if (!cleanAdminEmail) {
      errors['admin.email'] = 'Admin email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanAdminEmail)) {
      errors['admin.email'] = 'Please enter a valid admin email address.';
    }

    // Admin Password Validation
    if (!adminPassword) {
      errors['admin.password'] = 'Admin initial password is required.';
    } else if (adminPassword.length < 8) {
      errors['admin.password'] = 'Password must be at least 8 characters long.';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(adminPassword)) {
      errors['admin.password'] = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setBtnLoading(true);

    try {
      await axiosClient.post('/super-admin/companies', {
        company: {
          companyName: cleanCompanyName,
          companyCode: cleanCompanyCode,
          email: cleanCompanyEmail,
          phone: cleanCompanyPhone,
        },
        admin: {
          firstName: cleanAdminFirstName,
          lastName: cleanAdminLastName,
          email: cleanAdminEmail,
          password: adminPassword,
        }
      });
      setCreateModalOpen(false);
      // Reset forms
      setCompanyName('');
      setCompanyCode('');
      setCompanyEmail('');
      setCompanyPhone('');
      setAdminFirstName('');
      setAdminLastName('');
      setAdminEmail('');
      setAdminPassword('');
      setFieldErrors({});
      fetchCompanies();
    } catch (err) {
      if (err.response?.data?.errors) {
        const backendErrors = {};
        err.response.data.errors.forEach(e => {
          backendErrors[e.field] = e.message;
        });
        setFieldErrors(backendErrors);
      } else {
        setFormError(extractErrorMessage(err));
      }
    } finally {
      setBtnLoading(false);
    }
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    setFormError('');
    setBtnLoading(true);

    try {
      await axiosClient.patch(`/super-admin/companies/${selectedCompany._id}/subscription`, {
        status,
        subscriptionStatus: subStatus,
        plan,
      });
      setSubModalOpen(false);
      fetchCompanies();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setBtnLoading(false);
    }
  };

  const openSubscriptionModal = (company) => {
    setSelectedCompany(company);
    setStatus(company.status);
    setSubStatus(company.subscriptionStatus);
    setPlan(company.plan);
    setFormError('');
    setSubModalOpen(true);
  };

  const columns = [
    {
      header: 'Company Code',
      key: 'companyCode',
      render: (val) => <span className="font-bold text-slate-800">{val}</span>,
    },
    {
      header: 'Company Name',
      key: 'companyName',
      render: (val, row) => (
        <div>
          <p className="font-bold text-slate-700">{val}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Plan',
      key: 'plan',
      render: (val) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
          val === 'enterprise'
            ? 'bg-purple-50 text-purple-700 border border-purple-100'
            : val === 'standard'
            ? 'bg-blue-50 text-blue-700 border border-blue-100'
            : 'bg-slate-50 text-slate-700 border border-slate-100'
        }`}>
          {val}
        </span>
      ),
    },
    {
      header: 'Sub Status',
      key: 'subscriptionStatus',
      render: (val) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
          val === 'active'
            ? 'bg-emerald-50 text-emerald-700'
            : val === 'trial'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-rose-50 text-rose-700'
        }`}>
          {val}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
          val === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-150 text-slate-600'
        }`}>
          {val}
        </span>
      ),
    },
    {
      header: 'Created At',
      key: 'createdAt',
      render: (val) => (val ? formatDateDisplay(val) : '-'),
    },
    {
      header: 'Actions',
      key: '_id',
      render: (val, row) => (
        <Button
          variant="outline"
          size="sm"
          icon={FiCreditCard}
          onClick={() => openSubscriptionModal(row)}
        >
          Subscription
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Companies Register</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Manage all tenant businesses and plans
          </p>
        </div>
        <Button icon={FiPlus} onClick={() => { setFormError(''); setFieldErrors({}); setCreateModalOpen(true); }}>
          New Company
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* List */}
      <Card>
        <Table
          columns={columns}
          data={companies}
          loading={loading}
          emptyMessage="No companies registered on this platform yet."
        />
      </Card>

      {/* Modal - Create Company */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setFieldErrors({}); }}
        title="Register New Company"
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold mb-4">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateCompany} noValidate className="flex flex-col gap-4">
          <div className="border-b border-slate-100 pb-2 mb-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Information</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              name="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="e.g. Acme Corp"
              error={fieldErrors['company.companyName']}
            />
            <Input
              label="Company Code (Unique)"
              name="companyCode"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
              required
              placeholder="e.g. ACME1"
              error={fieldErrors['company.companyCode']}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Email"
              name="companyEmail"
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              required
              placeholder="billing@acme.com"
              error={fieldErrors['company.email']}
            />
            <Input
              label="Company Phone"
              name="companyPhone"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              required
              placeholder="e.g. 9876543210"
              error={fieldErrors['company.phone']}
            />
          </div>

          <div className="border-b border-slate-100 pb-2 mt-2 mb-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primary Admin Account</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Admin First Name"
              name="adminFirstName"
              value={adminFirstName}
              onChange={(e) => setAdminFirstName(e.target.value)}
              required
              placeholder="First name"
              error={fieldErrors['admin.firstName']}
            />
            <Input
              label="Admin Last Name"
              name="adminLastName"
              value={adminLastName}
              onChange={(e) => setAdminLastName(e.target.value)}
              required
              placeholder="Last name"
              error={fieldErrors['admin.lastName']}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Admin Email"
              name="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              placeholder="admin@acme.com"
              error={fieldErrors['admin.email']}
            />
            <Input
              label="Admin Password"
              name="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              placeholder="Min 8 characters (A-z, 0-9, @)"
              error={fieldErrors['admin.password']}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => { setCreateModalOpen(false); setFieldErrors({}); }}>
              Cancel
            </Button>
            <Button type="submit" loading={btnLoading}>
              Register
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal - Edit Subscription */}
      <Modal
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        title={`Subscription Details - ${selectedCompany?.companyName}`}
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold mb-4">
            {formError}
          </div>
        )}
        <form onSubmit={handleUpdateSubscription} className="flex flex-col gap-4">
          <Input
            label="Status"
            name="status"
            type="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />

          <Input
            label="Subscription Status"
            name="subStatus"
            type="select"
            value={subStatus}
            onChange={(e) => setSubStatus(e.target.value)}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Trial', value: 'trial' },
              { label: 'Expired', value: 'expired' },
            ]}
          />

          <Input
            label="Tier/Plan"
            name="plan"
            type="select"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            options={[
              { label: 'Basic', value: 'basic' },
              { label: 'Standard', value: 'standard' },
              { label: 'Enterprise', value: 'enterprise' },
            ]}
          />

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setSubModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={btnLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Companies;
