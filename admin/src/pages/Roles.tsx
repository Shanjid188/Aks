import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Role } from '../types';
import { EmptyState, Spinner } from '../components/ui';
import { hasPerm, PERM, PERMISSION_CATALOG } from '../lib/permissions';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';

interface RoleFormState {
  id: string | null;
  name: string;
  description: string;
  permissions: Set<string>;
}

const emptyForm = (): RoleFormState => ({
  id: null,
  name: '',
  description: '',
  permissions: new Set(),
});

/** Roles & Permissions — create roles, pick permissions, manage access control. */
export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ isSuper: boolean; permissions: string[] } | null>(null);
  const [form, setForm] = useState<RoleFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<{ roles: Role[] }>('/admin/roles'),
      api.get<{ admin: { isSuper: boolean; permissions: string[] } }>('/admin/auth/me'),
    ])
      .then(([r, m]) => {
        setRoles(r.roles);
        setMe(m.admin);
      })
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const can = (p: string) => hasPerm(me, p);

  const startCreate = () => {
    setFormError(null);
    setForm(emptyForm());
  };

  const startEdit = (role: Role) => {
    setFormError(null);
    setForm({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: new Set(role.permissions),
    });
  };

  const togglePerm = (key: string) => {
    setForm((f) => {
      if (!f) return f;
      const next = new Set(f.permissions);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...f, permissions: next };
    });
  };

  const setModule = (moduleName: string, checked: boolean) => {
    const mod = PERMISSION_CATALOG.find((m) => m.module === moduleName);
    if (!mod) return;
    setForm((f) => {
      if (!f) return f;
      const next = new Set(f.permissions);
      for (const p of mod.permissions) {
        if (checked) next.add(p.key);
        else next.delete(p.key);
      }
      return { ...f, permissions: next };
    });
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name: form.name,
        description: form.description,
        permissions: [...form.permissions],
      };
      if (form.id) {
        await api.put(`/admin/roles/${form.id}`, body);
        setNotice(`Role "${form.name}" updated — permissions apply immediately`);
      } else {
        await api.post('/admin/roles', body);
        setNotice(`Role "${form.name}" created`);
      }
      setForm(null);
      load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (role: Role) => {
    if (!window.confirm(`Delete the "${role.name}" role? This cannot be undone.`)) return;
    try {
      await api.del(`/admin/roles/${role.id}`);
      setNotice(`Role "${role.name}" deleted`);
      load();
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  /* __ROLES_UI__ */
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Roles & Permissions</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Create custom roles and choose exactly what each one can do. Assign them to admin users.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="self-start inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2.5 bg-[#D8232A] hover:bg-[#b51c22] text-white cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Role
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800">
          <span>✓ {notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor panel */}
      {form && (
        <section className="bg-white rounded-2xl border-2 border-[#D8232A]/30 shadow-xl shadow-red-100/60">
          <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#D8232A]" />
              {form.id ? `Edit Role — ${form.name}` : 'Create New Role'}
            </h3>
            <button onClick={() => setForm(null)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </header>

          <div className="p-5 space-y-5">
            {/* Name + description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Role Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Order Manager"
                  className="mt-1 w-full text-sm font-semibold rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 focus:border-[#D8232A]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Description</span>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Can manage orders but not products"
                  className="mt-1 w-full text-sm font-semibold rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D8232A]/30 focus:border-[#D8232A]"
                />
              </label>
            </div>

            {/* Permission matrix */}
            <div>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-neutral-500">
                  Permissions — {form.permissions.size} selected
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      setForm({
                        ...form,
                        permissions: new Set(PERMISSION_CATALOG.flatMap((m) => m.permissions.map((p) => p.key))),
                      })
                    }
                    className="text-[10px] font-black uppercase rounded-md px-2 py-1 bg-neutral-900 text-white cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setForm({ ...form, permissions: new Set() })}
                    className="text-[10px] font-black uppercase rounded-md px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {PERMISSION_CATALOG.map((mod) => {
                  const allChecked = mod.permissions.every((p) => form.permissions.has(p.key));
                  const someChecked = mod.permissions.some((p) => form.permissions.has(p.key));
                  return (
                    <div key={mod.module} className="rounded-xl border border-neutral-200 overflow-hidden">
                      <label className="flex items-center gap-2 bg-neutral-50 px-3 py-2 border-b border-neutral-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked && !allChecked;
                          }}
                          onChange={(e) => setModule(mod.module, e.target.checked)}
                          className="accent-[#D8232A] w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-xs font-black text-neutral-800">
                          {mod.icon} {mod.label}
                        </span>
                      </label>
                      <div className="p-2.5 space-y-1">
                        {mod.permissions.map((p) => (
                          <label key={p.key} className="flex items-center gap-2 px-1 py-0.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={form.permissions.has(p.key)}
                              onChange={() => togglePerm(p.key)}
                              className="accent-[#D8232A] w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="text-[11px] font-semibold text-neutral-600 group-hover:text-neutral-900">
                              {p.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {formError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setForm(null)}
                className="text-xs font-bold rounded-lg px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-black rounded-lg px-5 py-2.5 bg-[#D8232A] hover:bg-[#b51c22] disabled:opacity-50 disabled:cursor-not-allowed text-white cursor-pointer"
              >
                {saving ? <Spinner small /> : <ShieldCheck className="w-4 h-4" />}
                {form.id ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
        </section>
      )}
      {/* Roles list */}
      {loading ? (
        <Spinner />
      ) : roles.length === 0 ? (
        <section className="bg-white rounded-2xl border border-neutral-200 px-5 py-10">
          <EmptyState
            icon={<KeyRound className="w-6 h-6" />}
            title="No roles yet"
            hint="Create your first custom role to control what each admin can access."
          />
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className={`rounded-2xl border p-4 flex flex-col gap-3 ${
                role.isSuper ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white' : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                    {role.isSuper && <span title="Super Admin">👑</span>}
                    {role.isSystem && !role.isSuper && <span title="System role">🛡️</span>}
                    <span className="truncate">{role.name}</span>
                  </p>
                  {role.description ? (
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{role.description}</p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                    role.isSuper
                      ? 'bg-amber-400/25 text-amber-800'
                      : 'bg-[#D8232A]/10 text-[#D8232A]'
                  }`}
                >
                  {role.permissions.length} perms
                </span>
              </div>

              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                {role.usersCount} admin user{role.usersCount === 1 ? '' : 's'} assigned
              </p>

              {/* Permission chips (compact) */}
              <div className="flex flex-wrap gap-1">
                {role.isSuper ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded-md px-1.5 py-0.5">
                    Full access — every module
                  </span>
                ) : (
                  [...new Set(role.permissions.map((p) => p.split('.')[0]))].map((m) => (
                    <span key={m} className="text-[10px] font-bold text-neutral-600 bg-neutral-100 rounded-md px-1.5 py-0.5">
                      {PERMISSION_CATALOG.find((c) => c.module === m)?.icon} {m}
                    </span>
                  ))
                )}
              </div>

              {!role.isSuper && (
                <div className="mt-auto flex gap-1.5 pt-1">
                  <button
                    onClick={() => startEdit(role)}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-black rounded-lg px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-700 text-white cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => removeRole(role)}
                    disabled={role.usersCount > 0}
                    title={role.usersCount > 0 ? 'Reassign its admin users first' : 'Delete role'}
                    className="inline-flex items-center justify-center gap-1 text-[11px] font-black rounded-lg px-2.5 py-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
              {role.isSuper && (
                <p className="mt-auto pt-1 text-[10px] font-bold text-amber-700/80 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Protected role — cannot be edited or deleted
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

