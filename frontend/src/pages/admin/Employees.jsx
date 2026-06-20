import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiAlertTriangle, FiUserCheck } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, formatTime12h } from '../../utils/user.utils';

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination & Filters
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Dropdown list data for forms
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [managers, setManagers] = useState([]);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [formError, setFormError] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState('active');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const canCreate = hasPermission(user, 'employee.create');
  const canEdit = hasPermission(user, 'employee.edit');
  const canDelete = hasPermission(user, 'employee.delete');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (deptFilter) params.append('departmentId', deptFilter);

      const res = await axiosClient.get(`/employees/list?${params.toString()}`);
      setEmployees(res.data.data.users || res.data.data.employees || res.data.data || []);
      setPagination(res.data.data.pagination || res.data.pagination);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    const fetchWrapper = async (url, fallback = []) => {
      try {
        const res = await axiosClient.get(url);
        return res.data.data || fallback;
      } catch (err) {
        console.warn(`Failed to fetch dropdown dependency from ${url}:`, err);
        return fallback;
      }
    };

    try {
      const [rolesData, deptsData, desigData, branchData, shiftData, managerData] = await Promise.all([
        fetchWrapper('/roles'),
        fetchWrapper('/departments'),
        fetchWrapper('/designations'),
        fetchWrapper('/branches'),
        fetchWrapper('/shifts'),
        fetchWrapper('/employees/list?limit=100&status=active', { users: [], employees: [] }),
      ]);

      setRoles(rolesData || []);
      setDepartments(deptsData || []);
      setDesignations(desigData || []);
      setBranches(branchData || []);
      setShifts(shiftData || []);
      
      const managersList = managerData.users || managerData.employees || managerData || [];
      const potentialManagers = (Array.isArray(managersList) ? managersList : [])
        .filter((emp) => {
          const roleName = (emp.role?.roleName || '').toLowerCase();
          return roleName.includes('manager') || roleName.includes('hr');
        })
        .map((emp) => ({
          label: `${emp.firstName} ${emp.lastName} (${emp.role?.roleName || 'Employee'})`,
          value: emp._id,
        }));
      setManagers(potentialManagers);
    } catch (err) {
      console.error('Failed to load form dependencies:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, statusFilter, deptFilter]);

  useEffect(() => {
    fetchDropdowns();
  }, [modalOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  const handleOpenModal = (emp = null) => {
    setEditEmployee(emp);
    setFormError('');
    setFieldErrors({});

    if (emp) {
      setFirstName(emp.firstName || '');
      setLastName(emp.lastName || '');
      setEmail(emp.email || '');
      setPassword(''); // Do not show old passwords
      setRoleId(emp.role?._id || '');
      setStatus(emp.status || 'active');
      setDepartmentId(emp.department?._id || '');
      setDesignationId(emp.designation?._id || '');
      setReportingManagerId(emp.reportingManager?._id || emp.reportingManager || '');
      setBranchId(emp.branch?._id || emp.branch || '');
      setShiftId(emp.shift?._id || emp.shift || '');
      setJoiningDate(emp.joiningDate ? emp.joiningDate.split('T')[0] : '');
      setDateOfBirth(emp.dateOfBirth ? emp.dateOfBirth.split('T')[0] : '');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setRoleId('');
      setStatus('active');
      setDepartmentId('');
      setDesignationId('');
      setReportingManagerId('');
      setBranchId('');
      setShiftId('');
      setJoiningDate('');
      setDateOfBirth('');
    }

    setModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    const trimmedFirst = firstName ? firstName.trim() : '';
    const trimmedLast = lastName ? lastName.trim() : '';
    const trimmedEmail = email ? email.trim() : '';

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

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!editEmployee && !password) {
      errors.password = 'Password is required for new employees.';
    } else if (password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters long.';
      } else if (!passwordRegex.test(password)) {
        errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
      }
    }

    if (!roleId) {
      errors.roleId = 'System role is required.';
    }

    if (!departmentId) {
      errors.departmentId = 'Department is required.';
    }

    if (!designationId) {
      errors.designationId = 'Designation is required.';
    }

    if (!branchId) {
      errors.branchId = 'Branch is required.';
    }

    if (!shiftId) {
      errors.shiftId = 'Shift schedule is required.';
    }

    if (!joiningDate) {
      errors.joiningDate = 'Joining date is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setBtnLoading(true);

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      roleId,
      departmentId: departmentId || null,
      designationId: designationId || null,
      reportingManagerId: reportingManagerId || null,
      branchId: branchId || null,
      shiftId: shiftId || null,
      joiningDate: joiningDate || null,
      dateOfBirth: dateOfBirth || null,
    };

    if (!editEmployee) {
      payload.status = status;
    }

    if (password) payload.password = password;

    try {
      if (editEmployee) {
        await axiosClient.put(`/employees/update/${editEmployee._id}`, payload);
      } else {
        await axiosClient.post('/employees/create', payload);
      }
      setModalOpen(false);
      fetchEmployees();
    } catch (err) {
      const respData = err.response?.data;
      if (respData && respData.errors && Array.isArray(respData.errors) && respData.errors.length > 0) {
        const mapped = {};
        respData.errors.forEach((fErr) => {
          mapped[fErr.field] = fErr.message;
        });
        setFieldErrors(mapped);
      } else {
        setFormError(extractErrorMessage(err));
      }
    } finally {
      setBtnLoading(false);
    }
  };

  const handleTerminate = async (id) => {
    if (!window.confirm('Are you sure you want to terminate this employee? This will toggle their active status to inactive.')) return;

    try {
      await axiosClient.post(`/employees/terminate/${id}`);
      fetchEmployees();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('CRITICAL: Are you sure you want to delete this employee permanently? This cannot be undone.')) return;

    try {
      await axiosClient.delete(`/employees/delete/${id}`);
      fetchEmployees();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const columns = [
    {
      header: 'Employee Name',
      key: 'firstName',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          {row.avatar ? (
            <img src={row.avatar} alt={val} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              {((row.firstName?.[0] || '') + (row.lastName?.[0] || '')).toUpperCase() || 'EMP'}
            </div>
          )}
          <div>
            <p className="font-bold text-slate-700">{row.firstName} {row.lastName}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Department / Designation',
      key: 'department',
      render: (_, row) => (
        <div>
          <p className="text-xs font-bold text-slate-700">{row.department?.name || '-'}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{row.designation?.title || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Role',
      key: 'role',
      render: (val) => <span className="font-semibold text-slate-600 text-xs">{val?.roleName || '-'}</span>,
    },
    {
      header: 'Shift / Timing',
      key: 'shift',
      render: (val) => (
        <span className="text-xs text-slate-500 font-medium">
          {val ? `${val.name} (${formatTime12h(val.startTime)} - ${formatTime12h(val.endTime)})` : '-'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
          val === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
        }`}>
          {val}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: '_id',
      render: (val, row) => {
        const isSelf = user && (row._id === user._id || val === user._id);
        if (isSelf) return null;
        return (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                icon={FiEdit}
                onClick={() => handleOpenModal(row)}
              >
                Edit
              </Button>
            )}
            {canDelete && row.status === 'active' && (
              <Button
                variant="warning"
                size="sm"
                icon={FiAlertTriangle}
                onClick={() => handleTerminate(val)}
              >
                Terminate
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                icon={FiTrash2}
                onClick={() => handleDelete(val)}
              >
                Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Employees Register</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Manage employee details, roles, shifts, and statuses
          </p>
        </div>
        {canCreate && (
          <Button icon={FiPlus} onClick={() => handleOpenModal()}>
            Add Employee
          </Button>
        )}
      </div>

      {/* Filters Row */}
      <div className="bg-white rounded-2xl border border-slate-100 card-shadow p-5 flex flex-col md:flex-row gap-4 items-end justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-3 w-full">
          <Input
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email..."
            className="flex-1"
          />
          <Button type="submit" icon={FiSearch} variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex gap-4 w-full md:w-auto">
          <Input
            name="statusFilter"
            type="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="All Statuses"
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
            className="w-full md:w-36 text-sm"
          />
          <Input
            name="deptFilter"
            type="select"
            value={deptFilter}
            placeholder="All Depts"
            onChange={(e) => setDeptFilter(e.target.value)}
            options={departments.map((d) => ({ label: d.name, value: d._id }))}
            className="w-full md:w-44 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* List */}
      <Card>
        <Table
          columns={columns.filter(col => {
            if (col.header === 'Actions' && !canEdit && !canDelete) return false;
            return true;
          })}
          data={employees}
          pagination={pagination}
          onPageChange={setPage}
          loading={loading}
          emptyMessage="No employees found matching the filters."
        />
      </Card>

      {/* Modal - Create/Edit Employee */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editEmployee ? 'Update Employee Details' : 'Create New Employee'}
        size="lg"
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold mb-4">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            placeholder="e.g. Priya"
            error={fieldErrors.firstName}
          />
          <Input
            label="Last Name"
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            placeholder="e.g. Sharma"
            error={fieldErrors.lastName}
          />
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="priya@tech.com"
            error={fieldErrors.email}
          />
          <Input
            label={editEmployee ? 'Password (Leave empty to keep current)' : 'Password'}
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!editEmployee}
            placeholder="••••••••"
            error={fieldErrors.password}
          />

          {hasPermission(user, 'role.view') && (
            <Input
              label="System Role"
              name="roleId"
              type="select"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              required
              placeholder="Select Role"
              options={roles.map((r) => ({ label: r.roleName, value: r._id }))}
              error={fieldErrors.roleId}
            />
          )}

          {hasPermission(user, 'department.view') && (
            <Input
              label="Department"
              name="departmentId"
              type="select"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              placeholder="Select Department"
              options={departments.map((d) => ({ label: d.name, value: d._id }))}
              required
              error={fieldErrors.departmentId}
            />
          )}

          {hasPermission(user, 'designation.view') && (
            <Input
              label="Designation"
              name="designationId"
              type="select"
              value={designationId}
              onChange={(e) => setDesignationId(e.target.value)}
              placeholder="Select Designation"
              options={designations.map((d) => ({ label: d.title, value: d._id }))}
              required
              error={fieldErrors.designationId}
            />
          )}

          <Input
            label="Reporting Manager"
            name="reportingManagerId"
            type="select"
            value={reportingManagerId}
            onChange={(e) => setReportingManagerId(e.target.value)}
            placeholder="Select Manager"
            options={managers.filter((m) => !editEmployee || m.value !== editEmployee._id)}
          />

          {hasPermission(user, 'branch.view') && (
            <Input
              label="Branch"
              name="branchId"
              type="select"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              placeholder="Select Branch"
              options={branches.map((b) => ({ label: b.name, value: b._id }))}
              required
              error={fieldErrors.branchId}
            />
          )}

          {hasPermission(user, 'shift.view') && (
            <Input
              label="Shift Schedule"
              name="shiftId"
              type="select"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              placeholder="Select Shift"
              options={shifts.map((s) => ({ label: `${s.name} (${formatTime12h(s.startTime)} - ${formatTime12h(s.endTime)})`, value: s._id }))}
              required
              error={fieldErrors.shiftId}
            />
          )}

          <Input
            label="Joining Date"
            name="joiningDate"
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
            required
            error={fieldErrors.joiningDate}
          />

          <Input
            label="Birth Date"
            name="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            error={fieldErrors.dateOfBirth}
          />



          <div className="sm:col-span-2 flex justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={btnLoading}>
              Save Employee
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Employees;
