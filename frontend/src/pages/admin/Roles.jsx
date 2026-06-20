import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Spinner from '../../components/Spinner';
import { FiPlus, FiEdit, FiTrash2, FiShield } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/user.utils';

const Roles = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canCreate = hasPermission(user, 'role.edit');
  const canEdit = hasPermission(user, 'role.edit');

  // Role Modals
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Permission Modals
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Loadings
  const [btnLoading, setBtnLoading] = useState(false);
  const [permLoading, setPermLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/roles');
      setRoles(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!roleName.trim()) {
      setFieldErrors({ roleName: 'Role name is required.' });
      return;
    }

    setBtnLoading(true);

    try {
      if (editRole) {
        await axiosClient.put(`/roles/${editRole._id}`, { roleName });
      } else {
        await axiosClient.post('/roles', { roleName });
      }
      setRoleModalOpen(false);
      setRoleName('');
      setEditRole(null);
      fetchRoles();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setBtnLoading(false);
    }
  };

  const handleRoleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      await axiosClient.delete(`/roles/${id}`);
      fetchRoles();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const openRoleModal = (role = null) => {
    setEditRole(role);
    setRoleName(role ? role.roleName : '');
    setFormError('');
    setFieldErrors({});
    setRoleModalOpen(true);
  };

  const openPermissionModal = async (role) => {
    setActiveRole(role);
    setPermLoading(true);
    setFormError('');
    setPermModalOpen(true);

    try {
      // Fetch all available permissions
      const allPermsRes = await axiosClient.get('/permissions');
      setAllPermissions(allPermsRes.data.data || []);

      // Fetch active permissions for this role
      const rolePermsRes = await axiosClient.get(`/roles/${role._id}/permissions`);
      const activePermIds = (rolePermsRes.data.data || [])
        .map((p) => p.permissionId?._id || p.permissionId)
        .filter(Boolean);
      setSelectedPermissions(activePermIds);
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setPermLoading(false);
    }
  };

  const handleTogglePermission = (id) => {
    setSelectedPermissions((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handlePermissionSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setBtnLoading(true);

    try {
      await axiosClient.post(`/roles/${activeRole._id}/permissions`, {
        permissionIds: selectedPermissions,
      });
      setPermModalOpen(false);
      fetchRoles();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setBtnLoading(false);
    }
  };

  const columns = [
    {
      header: 'Role Name',
      key: 'roleName',
      render: (val) => <span className="font-bold text-slate-800">{val}</span>,
    },
    {
      header: 'Permissions',
      key: '_id',
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          icon={FiShield}
          onClick={() => openPermissionModal(row)}
        >
          Manage Permissions
        </Button>
      ),
    },
    {
      header: 'Actions',
      key: '_id',
      render: (val, row) => {
        // Protect Company Admin role from deletion
        const isCompanyAdmin = row.roleName === 'Company Admin';
        return (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                icon={FiEdit}
                onClick={() => openRoleModal(row)}
              >
                Edit
              </Button>
            )}
            {canEdit && !isCompanyAdmin && (
              <Button
                variant="danger"
                size="sm"
                icon={FiTrash2}
                onClick={() => handleRoleDelete(val)}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Roles & Permissions</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Define system roles and access settings
          </p>
        </div>
        {canCreate && (
          <Button icon={FiPlus} onClick={() => openRoleModal()}>
            New Role
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      <Card>
        <Table
          columns={columns.filter(col => {
            if (col.header === 'Actions' && !canEdit) return false;
            return true;
          })}
          data={roles}
          loading={loading}
          emptyMessage="No custom roles configured yet."
        />
      </Card>

      {/* Modal - Create/Edit Role */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => { setRoleModalOpen(false); setFieldErrors({}); }}
        title={editRole ? 'Edit Role' : 'Create Role'}
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold mb-4">
            {formError}
          </div>
        )}
        <form onSubmit={handleRoleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Role Name"
            name="roleName"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            required
            placeholder="e.g. Finance Analyst"
            error={fieldErrors.roleName}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => { setRoleModalOpen(false); setFieldErrors({}); }}>
              Cancel
            </Button>
            <Button type="submit" loading={btnLoading}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal - Manage Permissions */}
      <Modal
        isOpen={permModalOpen}
        onClose={() => setPermModalOpen(false)}
        title={`Edit Permissions - ${activeRole?.roleName}`}
        size="lg"
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold mb-4">
            {formError}
          </div>
        )}

        {permLoading ? (
          <Spinner size="md" />
        ) : (
          <form onSubmit={handlePermissionSubmit} noValidate>
            <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto p-1">
              {Object.entries(
                allPermissions.reduce((acc, perm) => {
                  const mod = perm.module || 'other';
                  if (!acc[mod]) acc[mod] = [];
                  acc[mod].push(perm);
                  return acc;
                }, {})
              ).map(([moduleName, perms]) => {
                const moduleNames = {
                  employee: 'Employees',
                  role: 'Roles & Permissions',
                  department: 'Departments',
                  designation: 'Designations',
                  branch: 'Branches',
                  shift: 'Shifts',
                  holiday: 'Holidays',
                  audit: 'Audit Logs'
                };
                return (
                  <div key={moduleName} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span>{moduleNames[moduleName] || moduleName.toUpperCase()}</span>
                      <span className="text-[10px] font-semibold text-slate-400 normal-case bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                        {perms.length} Permissions
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {perms.map((perm) => (
                        <label
                          key={perm._id}
                          className={`flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 cursor-pointer transition-colors ${
                            selectedPermissions.includes(perm._id) ? 'bg-indigo-50/20 border-indigo-200' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(perm._id)}
                            onChange={() => handleTogglePermission(perm._id)}
                            disabled={!canEdit}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-0.5"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800 capitalize">
                              {perm.action === 'view' ? 'View / Read' :
                               perm.action === 'create' ? 'Create / Add' :
                               perm.action === 'edit' ? 'Edit / Update' :
                               perm.action === 'delete' ? 'Delete / Remove' : perm.action}
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              {perm.permissionKey}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setPermModalOpen(false)}>
                Cancel
              </Button>
              {canEdit && (
                <Button type="submit" loading={btnLoading}>
                  Update Access
                </Button>
              )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Roles;
