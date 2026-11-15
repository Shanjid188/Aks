// Write-only secret field shared by Tracking Settings and Integrations.
// The API never returns a secret value — only whether it is set, where it
// comes from, and (for admin-stored values) its last 4 characters.
import { useState } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import { api } from '../api';
import { Badge, Button, PasswordInput, TextArea } from './ui';

export interface SecretStatus {
  key: string;
  label: string;
  group: 'tracking' | 'integrations' | 'courier';
  source: 'env' | 'admin' | null;
  undecryptable: boolean;
  last4: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export function SecretField({
  status,
  canManage,
  encryptionConfigured,
  multiline,
  onChange,
}: {
  status: SecretStatus;
  canManage: boolean;
  encryptionConfigured: boolean;
  multiline?: boolean;
  onChange: (secrets: SecretStatus[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.put<{ secrets: SecretStatus[] }>(`/admin/advertising/secrets/${status.key}`, { value });
      onChange(res.secrets);
      setValue('');
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!window.confirm(`Remove the stored ${status.label}? Anything using it stops working.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.del<{ secrets: SecretStatus[] }>(`/admin/advertising/secrets/${status.key}`);
      onChange(res.secrets);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const envManaged = status.source === 'env';
  return (
    <div className="rounded-xl border border-neutral-200 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <KeyRound className="w-4 h-4 text-neutral-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-neutral-900">{status.label}</p>
            <p className="text-[10px] font-mono text-neutral-400">{status.key}</p>
          </div>
        </div>
        {envManaged ? (
          <Badge color="bg-sky-50 text-sky-700">
            <Lock className="w-3 h-3" /> Managed by environment
          </Badge>
        ) : status.undecryptable ? (
          <Badge color="bg-red-50 text-red-700">Stored, cannot decrypt</Badge>
        ) : status.source === 'admin' ? (
          <Badge color="bg-emerald-50 text-emerald-700">Set{status.last4 ? ` · ••••${status.last4}` : ''}</Badge>
        ) : (
          <Badge color="bg-neutral-100 text-neutral-500">Not set</Badge>
        )}
      </div>
      {status.updatedAt && !envManaged && (
        <p className="mt-1.5 text-[10px] text-neutral-400">
          Updated {new Date(status.updatedAt).toLocaleString('en-GB')}
          {status.updatedBy ? ` by ${status.updatedBy}` : ''}
        </p>
      )}
      {envManaged && (
        <p className="mt-1.5 text-[11px] text-neutral-500">
          The server environment variable is used and overrides anything stored here.
        </p>
      )}
      {canManage && !envManaged && (
        <div className="mt-3">
          {!encryptionConfigured ? (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
              Secret storage is off: set <code>INTEGRATION_ENCRYPTION_KEY</code> on the server (or set{' '}
              <code>{status.key}</code> as an environment variable).
            </p>
          ) : editing ? (
            <div className="space-y-2">
              {multiline ? (
                <TextArea rows={5} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste the value" autoComplete="off" spellCheck={false} className="font-mono text-xs" />
              ) : (
                <PasswordInput value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste the new value" autoComplete="new-password" />
              )}
              <div className="flex gap-2">
                <Button onClick={save} disabled={busy || !value.trim()}>
                  {busy ? 'Saving…' : 'Save securely'}
                </Button>
                <Button variant="ghost" onClick={() => { setEditing(false); setValue(''); setError(null); }} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                {status.source === 'admin' ? 'Replace' : 'Set value'}
              </Button>
              {(status.source === 'admin' || status.undecryptable) && (
                <Button variant="danger" onClick={clear} disabled={busy}>
                  Remove
                </Button>
              )}
            </div>
          )}
          {error && <p className="mt-2 text-[11px] font-semibold text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
