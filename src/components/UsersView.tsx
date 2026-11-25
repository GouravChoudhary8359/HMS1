import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import type { Role, User } from '../lib/types';
import { StatusTag } from './StatusTag';

interface UsersViewProps {
  users: User[];
  currentUserId: string;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function UsersView({ users, currentUserId, onRefresh, onNotify }: UsersViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    fullName: '',
    role: 'Receptionist' as Role,
    password: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onNotify('success', `Created ${form.role} account '${form.username}'.`);
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Failed to create user.');
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await apiFetch(`/api/users/${u.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !u.active }),
      });
      onNotify('success', `Updated status for ${u.username}.`);
      await onRefresh();
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Failed to update user.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Users &amp; Role-Based Access Management
          </h2>
          <p className="text-sm text-slate-600">
            Admin-only module for managing hospital accounts and role permissions (FR-02, SEC-01, SEC-02).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({ username: '', email: '', fullName: '', role: 'Receptionist', password: '' });
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create User</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-medium">Username</th>
                <th className="py-3 px-4 font-medium">Full Name</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-xs text-slate-800 whitespace-nowrap">
                    {u.username}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                    {u.fullName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{u.email}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusTag label={u.role} tone="accent" />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusTag
                      label={u.active ? 'Active' : 'Inactive'}
                      tone={u.active ? 'success' : 'danger'}
                    />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {u.id !== currentUserId ? (
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        {u.active ? 'Disable' : 'Enable'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Current Session</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 id="create-user-title" className="font-display font-bold text-slate-900">
                Create System User
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close user modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label htmlFor="usr-full" className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="usr-full"
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="usr-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    id="usr-name"
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="usr-role" className="block text-xs font-medium text-slate-700 mb-1">
                    Role *
                  </label>
                  <select
                    id="usr-role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Patient">Patient</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="usr-email" className="block text-xs font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  id="usr-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="usr-pass" className="block text-xs font-medium text-slate-700 mb-1">
                  Password (min 6 chars) *
                </label>
                <input
                  id="usr-pass"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
