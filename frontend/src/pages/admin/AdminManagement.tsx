import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Users, Edit2, Trash2, Shield, ShieldOff, X, Check, AlertCircle } from 'lucide-react';
import api from '../../services/api';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export default function AdminManagement() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchAdmins();
  }, [navigate]);

  const fetchAdmins = async () => {
    try {
      const response = await api.get('/admin/admins');
      setAdmins(response.data);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
      setMessage({ type: 'error', text: 'Failed to load admins' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!formData.email || !formData.name || !formData.password) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setSaving(true);
    try {
      await api.post('/admin/admins', {
        email: formData.email,
        name: formData.name,
        password: formData.password,
      });
      setMessage({ type: 'success', text: 'Admin created successfully!' });
      setShowAddModal(false);
      setFormData({ email: '', name: '', password: '', confirmPassword: '' });
      fetchAdmins();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to create admin' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAdmin = async () => {
    if (!editingAdmin) return;

    const updates: any = {};
    if (formData.name && formData.name !== editingAdmin.name) {
      updates.name = formData.name;
    }
    if (formData.email && formData.email !== editingAdmin.email) {
      updates.email = formData.email;
    }
    if (formData.password) {
      if (formData.password !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match' });
        return;
      }
      if (formData.password.length < 6) {
        setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
        return;
      }
      updates.password = formData.password;
    }

    if (Object.keys(updates).length === 0) {
      setEditingAdmin(null);
      return;
    }

    setSaving(true);
    try {
      await api.put(`/admin/admins/${editingAdmin.id}`, updates);
      setMessage({ type: 'success', text: 'Admin updated successfully!' });
      setEditingAdmin(null);
      setFormData({ email: '', name: '', password: '', confirmPassword: '' });
      fetchAdmins();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update admin' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (admin: AdminUser) => {
    try {
      await api.put(`/admin/admins/${admin.id}`, { is_active: !admin.is_active });
      setMessage({ type: 'success', text: `Admin ${admin.is_active ? 'deactivated' : 'activated'} successfully!` });
      fetchAdmins();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update admin status' });
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (!confirm(`Are you sure you want to delete admin "${admin.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/admin/admins/${admin.id}`);
      setMessage({ type: 'success', text: 'Admin deleted successfully!' });
      fetchAdmins();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to delete admin' });
    }
  };

  const openEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setFormData({
      email: admin.email,
      name: admin.name,
      password: '',
      confirmPassword: '',
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingAdmin(null);
    setFormData({ email: '', name: '', password: '', confirmPassword: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard" className="text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-white font-bold flex items-center gap-2">
                <Users size={20} />
                Admin Management
              </h1>
              <p className="text-gray-400 text-sm">Manage admin accounts</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
          >
            <UserPlus size={18} />
            Add Admin
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2 p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Admin List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-700 border-b border-gray-600">
            <h2 className="text-white font-semibold">Admin Accounts ({admins.length})</h2>
          </div>

          {admins.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No admin accounts found. Add your first admin above.
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {admins.map((admin) => (
                <div key={admin.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      admin.is_active ? 'bg-purple-600' : 'bg-gray-600'
                    }`}>
                      <Shield size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">{admin.name}</h3>
                        {!admin.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-red-900/50 text-red-300 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">{admin.email}</p>
                      <p className="text-gray-500 text-xs">
                        Last login: {admin.last_login
                          ? new Date(admin.last_login).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(admin)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(admin)}
                      className={`p-2 rounded-lg transition ${
                        admin.is_active
                          ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30'
                          : 'text-green-400 hover:text-green-300 hover:bg-green-900/30'
                      }`}
                      title={admin.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {admin.is_active ? <ShieldOff size={18} /> : <Shield size={18} />}
                    </button>
                    <button
                      onClick={() => handleDeleteAdmin(admin)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CLI Info */}
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-3">Create Admin via CLI</h3>
          <p className="text-gray-400 text-sm mb-3">
            You can also create admin accounts from the command line:
          </p>
          <div className="bg-gray-900 p-3 rounded-lg font-mono text-sm text-green-400">
            <p>cd backend</p>
            <p>python scripts/create_admin.py create --email admin@example.com --name "Admin Name"</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingAdmin) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-white font-semibold">
                {editingAdmin ? 'Edit Admin' : 'Add New Admin'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Admin Name"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  {editingAdmin ? 'New Password (leave empty to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingAdmin ? 'Leave empty to keep current' : 'Enter password'}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={editingAdmin ? handleUpdateAdmin : handleAddAdmin}
                disabled={saving}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : (editingAdmin ? 'Update Admin' : 'Create Admin')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
