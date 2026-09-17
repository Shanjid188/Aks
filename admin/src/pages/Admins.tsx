import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { AdminUserRow, Role } from '../types';
import { EmptyState, Spinner } from '../components/ui';
import { hasPerm, PERM } from '../lib/permissions';
import { Ban, CheckCircle2, KeyRound, Plus, Trash2, UserCog, Users } from 'lucide-react';

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

interface FormState {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

const emptyForm = (): FormState => ({ name: '', email: '', password: '', roleId: '' });

/** Admin Users — create/disable admins and assign roles (permission-aware). */
export function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; email: string; isSuper: boolean; permissions: string[] } | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<{ admins: AdminUserRow[] }>('/admin/admins'),
      api.get<{ roles: Role[] }>('/admin/roles'),
      api.get<{ admin: { id: string; email: string; isSuper: boolean; permissions: string[] } }>('/admin/auth/me'),
    ])
      .then(([a, r, m]) => {
        setAdmins(a.admins);
        setRoles(r.roles);
        setMe(m.admin);
      })
      .catch(() => {
        setAdmins([]);
        setRoles([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const can = (p: string) => hasPerm(me, p);

  const createAdmin = async () => {
    if (!form) return;
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/admin/admins', {
        name: form.name,
        email: form.email,
        password: form.password,
        roleId: form.roleId || null,
      });
      setNotice(`Admin "${form.name}" created`);
      setForm(null);
      load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (admin: AdminUserRow) => {
    try {
      await api.patch(`/admin/admins/${admin.id}/status`, { isActive: !admin.isActive });
      setNotice(`${admin.name} ${admin.isActive ? 'disabled' : 'enabled'}`);
      load();
    } catch (e) {
      setNotice((e as Error).message);
    }
  };

  const removeAdmin = async (admin: AdminUserRow) => {
    if (!window.confirm(`Delete admin "${admin.name}"? This cannot be undone.`)) return;
    try {
      await api.del(`/admin/admins/${admin.id}`);
      setNotice(`${admin.name} deleted`);
      load();
    } catch (e) {
      setNotice((e as Error).message);
    }
  };

  const changeRole = async (admin: AdminUserRow, roleId: string) => {
    try {
      await api.patch(`/admin/admins/${admin.id}`, { roleId: roleId || null });
      setNotice(`${admin.name}'s role updated — permissions apply immediately`);
      load();
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  /* __ADMINS_UI__ */
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Admin Users</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage team accounts — assign roles, enable or disable access.
          </p>
        </div>
        {can(PERM.ADMINS_CREATE) && (
          <button
            onClick={() => {
              setFormError(null);
              setForm(emptyForm());
            }}
            className="self-start inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2.5 bg-[#D8232A] hover:bg-[#b51c22] text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Admin
          </button>
        )}
      </div>

      {notice && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-800">
          {notice}
        </div>
      )}

      {/* Create form */}
      {form && (
        <section className="bg-white rounded-2xl border-2 border-[#D8232A]/30 shadow-xl shadow-red-100/60 p-5">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2 mb-4">
            <UserCog className="w-4 h-4 text-[#D8232A]" /> Create Admin User
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Full Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rahim Uddin"
                className="mt-1 w-full text-sm font-semibold rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 focus:border-[#D8232A]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="rahim@aksgarments.com.bd"
                className="mt-1 w-full text-sm font-semibold rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 focus:border-[#D8232A]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
                className="mt-1 w-full text-sm font-semibold rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 focus:border-[#D8232A]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Role</span>
              <select
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                className="mt-1 w-full text-sm font-semibold rounded-lg border border-neutral-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 focus:border-[#D8232A]"
              >
                <option value="">— Select a role —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.isSuper ? '👑 ' : ''}
                    {r.name} ({r.permissions.length} perms)
                  </option>
                ))}
              </select>
            </label>
          </div>

          {formError && (
            <p className="mt-3 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="mt-4 flex gap-2 justify-end">
            <button
              onClick={() => setForm(null)}
              className="text-xs font-bold rounded-lg px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={createAdmin}
              disabled={saving || !form.name.trim() || !form.email.trim() || form.password.length < 8 || !form.roleId}
              className="text-xs font-black rounded-lg px-5 py-2.5 bg-[#D8232A] hover:bg-[#b51c22] disabled:opacity-50 disabled:cursor-not-allowed text-white cursor-pointer"
            >
              {saving ? 'Creating…' : 'Create Admin'}
            </button>
          </div>
        </section>
      )}
      {/* __ADMINS_TABLE__ */}
      <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" /> Team Members
          </h3>
          {!loading && <span className="text-[11px] font-bold text-neutral-400">{admins.length} total</span>}
        </header>
        {/* __ADMINS_ROWS__ */}
        {loading ? (
          <Spinner />
        ) : admins.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="No admin users yet"
              hint="Create the first team account with the button above."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                  <th className="px-5 py-3">Admin</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {admins.map((a) => (
                  <AdminRow
                    key={a.id}
                    admin={a}
                    roles={roles}
                    can={can}
                    isSelf={a.email === me?.email}
                    onToggle={() => toggleStatus(a)}
                    onRoleChange={(roleId) => changeRole(a, roleId)}
                    onResetPassword={() => resetPassword(a)}
                    onDelete={() => removeAdmin(a)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}


function AdminRow({
  admin: a,
  roles,
  can,
  isSelf,
  onToggle,
  onRoleChange,
  onResetPassword,
  onDelete,
}: {
  admin: AdminUserRow;
  roles: Role[];
  can: (p: string) => boolean;
  isSelf: boolean;
  onToggle: () => void;
  onRoleChange: (roleId: string) => void;
  onResetPassword: () => void;
  onDelete: () => void;
}) {
  const isSuperRow = a.role?.isSuper ?? false;
  return (
    <tr className="hover:bg-neutral-50/80 transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
            {(a.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-neutral-900 truncate flex items-center gap-1.5">
              {a.name}
              {isSuperRow && <span title="Super Admin">👑</span>}
              {isSelf && (
                <span className="text-[9px] font-black uppercase bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">
                  you
                </span>
              )}
            </p>
            <p className="text-[10px] text-neutral-400 truncate">{a.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {isSuperRow || !can(PERM.ADMINS_EDIT) ? (
          <span className="text-xs font-bold text-neutral-700">
            {isSuperRow ? '👑 ' : ''}
            {a.role?.name ?? '—'}
          </span>
        ) : (
          <select
            value={a.role?.id ?? ''}
            onChange={(e) => onRoleChange(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-neutral-200 px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 cursor-pointer"
          >
            <option value="">— No role —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.isSuper ? '👑 ' : ''}
                {r.name}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full ${
            a.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
          }`}
        >
          {a.isActive ? '● Active' : 'â—‹ Disabled'}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="text-[11px] font-semibold text-neutral-600">{formatDate(a.createdAt)}</p>
        {a.lastLoginAt && <p className="text-[10px] text-neutral-400">Last login {formatDate(a.lastLoginAt)}</p>}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {can(PERM.ADMINS_DISABLE) && !isSelf && (
            <button
              onClick={onToggle}
              disabled={isSuperRow}
              title={isSuperRow ? 'Super Admin cannot be disabled' : a.isActive ? 'Disable' : 'Enable'}
              className={`p-2 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                a.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              {a.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </button>
          )}
          {can(PERM.ADMINS_EDIT) && (
            <button
              onClick={onResetPassword}
              title="Reset password"
              className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          )}
          {can(PERM.ADMINS_DELETE) && !isSelf && (
            <button
              onClick={onDelete}
              disabled={isSuperRow}
              title={isSuperRow ? 'Super Admin cannot be deleted' : 'Delete'}
              className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/** Prompts for a new password and updates it via the API. */
async function resetPassword(admin: AdminUserRow) {
  const password = window.prompt(`New password for ${admin.name} (min 8 characters):`);
  if (!password) return;
  if (password.length < 8) {
    window.alert('Password must be at least 8 characters');
    return;
  }
  try {
    await api.put(`/admin/admins/${admin.id}/password`, { password });
    window.alert(`Password updated for ${admin.name}`);
  } catch (e) {
    window.alert((e as Error).message);
  }
}
