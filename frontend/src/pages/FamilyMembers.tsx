import { useEffect, useState } from 'react';
import { UserPlus, Users, Trash2, X, Check, AlertCircle, Key } from 'lucide-react';
import api from '../services/api';

interface FamilyMember {
  id: number;
  name: string;
  email: string | null;
  username: string | null;
  role: string;
  dob: string | null;
  is_email_verified: boolean;
  total_points: number;
  created_at: string;
}

interface FamilyInfo {
  id: number;
  name: string;
  owner_email: string;
  is_verified: boolean;
  member_count: number;
}

export default function FamilyMembers() {
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMember, setResetMember] = useState<FamilyMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'child',
    dob: '',
    school: '',
    grade: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [familyRes, membersRes] = await Promise.all([
        api.get('/family/me'),
        api.get('/family/members'),
      ]);
      setFamily(familyRes.data);
      setMembers(membersRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setMessage({ type: 'error', text: 'Failed to load family data' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!formData.name) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    // For kids, username is required
    if (formData.role === 'child' && !formData.username) {
      setMessage({ type: 'error', text: 'Username is required for kids' });
      return;
    }

    // For parents, email is required
    if (formData.role === 'parent' && !formData.email) {
      setMessage({ type: 'error', text: 'Email is required for parents' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await api.post('/family/members', {
        name: formData.name,
        email: formData.email || null,
        username: formData.username || null,
        password: formData.password || null,
        role: formData.role,
        dob: formData.dob || null,
        school: formData.school || null,
        grade: formData.grade || null,
      });

      setMessage({ type: 'success', text: 'Family member added successfully!' });
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'child',
        dob: '',
        school: '',
        grade: '',
      });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to add member' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member: FamilyMember) => {
    if (!confirm(`Are you sure you want to remove ${member.name} from the family?`)) {
      return;
    }

    try {
      await api.delete(`/family/members/${member.id}`);
      setMessage({ type: 'success', text: `${member.name} removed from family` });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to remove member' });
    }
  };

  const handleResetPassword = async () => {
    if (!resetMember || !newPassword) {
      setMessage({ type: 'error', text: 'Please enter a new password' });
      return;
    }

    try {
      await api.put(`/auth/users/${resetMember.id}`, { password: newPassword });
      setMessage({ type: 'success', text: `Password reset for ${resetMember.name}` });
      setShowResetModal(false);
      setResetMember(null);
      setNewPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to reset password' });
    }
  };

  const openResetModal = (member: FamilyMember) => {
    setResetMember(member);
    setNewPassword('');
    setShowResetModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const parents = members.filter(m => m.role === 'parent');
  const children = members.filter(m => m.role === 'child');

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-islamic-green" />
            Family Members
          </h1>
          <p className="text-gray-500">{family?.name} - {members.length} members</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 transition flex items-center gap-2"
        >
          <UserPlus size={18} />
          Add Member
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Parents Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b bg-islamic-green/10">
          <h2 className="font-semibold text-islamic-green">Parents ({parents.length})</h2>
        </div>
        <div className="divide-y">
          {parents.map((member) => (
            <div key={member.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-islamic-green text-white rounded-full flex items-center justify-center text-xl font-bold">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium">{member.name}</h3>
                  <p className="text-sm text-gray-500">{member.email}</p>
                  {!member.is_email_verified && member.email && (
                    <span className="text-xs text-yellow-600">Email not verified</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openResetModal(member)}
                  className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Reset Password"
                >
                  <Key size={18} />
                </button>
                <button
                  onClick={() => handleRemoveMember(member)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Remove"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {parents.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No parents added yet
            </div>
          )}
        </div>
      </div>

      {/* Kids Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b bg-yellow-50">
          <h2 className="font-semibold text-yellow-700">Kids ({children.length})</h2>
        </div>
        <div className="divide-y">
          {children.map((member) => (
            <div key={member.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-400 text-white rounded-full flex items-center justify-center text-xl font-bold">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium">{member.name}</h3>
                  <p className="text-sm text-gray-500">
                    {member.username ? `@${member.username}` : 'No username'}
                  </p>
                  <p className="text-sm text-yellow-600">{member.total_points} points</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openResetModal(member)}
                  className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Reset Password"
                >
                  <Key size={18} />
                </button>
                <button
                  onClick={() => handleRemoveMember(member)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Remove"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {children.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No kids added yet. Add your children to track their tasks and progress!
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-lg">Add Family Member</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'parent' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition ${
                      formData.role === 'parent'
                        ? 'border-islamic-green bg-islamic-green/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Parent</div>
                    <div className="text-xs text-gray-500">Full access</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'child' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition ${
                      formData.role === 'child'
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Kid</div>
                    <div className="text-xs text-gray-500">Limited access</div>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-islamic-green focus:border-transparent"
                />
              </div>

              {/* Email (for parents) */}
              {formData.role === 'parent' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-islamic-green focus:border-transparent"
                  />
                </div>
              )}

              {/* Username (for kids) */}
              {formData.role === 'child' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                    placeholder="e.g., kanz (letters, numbers, underscore only)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Kids login with username + password (no email needed)</p>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Set a password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-islamic-green focus:border-transparent"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-islamic-green focus:border-transparent"
                />
              </div>

              {/* School & Grade (for kids) */}
              {formData.role === 'child' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                    <input
                      type="text"
                      value={formData.school}
                      onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                      placeholder="School name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                    <input
                      type="text"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="e.g., Grade 5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={saving}
                className="flex-1 py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && resetMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-lg">Reset Password</h2>
              <button onClick={() => setShowResetModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-gray-600">
                Reset password for <strong>{resetMember.name}</strong>
                {resetMember.username && <span className="text-gray-500"> (@{resetMember.username})</span>}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!newPassword}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
