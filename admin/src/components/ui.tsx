import React from 'react';
import { X, Loader2 } from 'lucide-react';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const styles = {
    primary: 'bg-[#D8232A] hover:bg-[#b51c22] text-white',
    secondary: 'bg-neutral-900 hover:bg-neutral-800 text-white',
    danger: 'bg-red-50 hover:bg-red-100 text-red-700',
    ghost: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800',
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg px-3.5 py-2 transition-colors cursor-pointer disabled:opacity-50',
        styles,
        className
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-neutral-400 mt-0.5">{hint}</span>}
    </label>
  );
}

const inputStyles =
  'w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 outline-none focus:border-[#D8232A] bg-white';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputStyles, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputStyles, 'min-h-20', props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputStyles, props.className)} />;
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 cursor-pointer"
    >
      <span
        className={cx('w-9 h-5 rounded-full transition-colors relative', checked ? 'bg-emerald-500' : 'bg-neutral-300')}
      >
        <span
          className={cx(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
            checked ? 'left-[18px]' : 'left-0.5'
          )}
        />
      </span>
      {label && <span className="text-xs font-semibold text-neutral-700">{label}</span>}
    </button>
  );
}

export function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className={cx('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full', color)}
    >
      {children}
    </span>
  );
}

export const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-amber-50 text-amber-700',
  shipped: 'bg-purple-50 text-purple-700',
  out_for_delivery: 'bg-cyan-50 text-cyan-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-neutral-950/50" onClick={onClose} />
      <div
        className={cx(
          'relative bg-white w-full rounded-2xl shadow-2xl border border-neutral-200 max-h-[92vh] overflow-y-auto',
          wide ? 'max-w-3xl' : 'max-w-lg'
        )}
      >
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-5 py-4 flex items-center justify-between z-10">
          <h3 className="text-sm font-black text-neutral-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="text-center py-14 space-y-2">
      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">{icon}</div>
      <h4 className="text-sm font-bold text-neutral-700">{title}</h4>
      {hint && <p className="text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

export function Spinner({ small }: { small?: boolean }) {
  if (small) {
    return <Loader2 className="w-4 h-4 animate-spin" />;
  }
  return (
    <div className="flex justify-center py-12 text-neutral-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

/* ─────────────────────────────── Order status ─────────────────────────────── */

/** English-only status labels used across the admin panel (badges + filters). */
export const ORDER_STATUS_META: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    badge: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    dot: 'bg-amber-500',
  },
  confirmed: {
    label: 'Confirmed',
    badge: 'bg-blue-50 text-blue-800 ring-1 ring-blue-200',
    dot: 'bg-blue-500',
  },
  processing: {
    label: 'Packaging',
    badge: 'bg-violet-50 text-violet-800 ring-1 ring-violet-200',
    dot: 'bg-violet-500',
  },
  shipped: {
    label: 'Shipped',
    badge: 'bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200',
    dot: 'bg-cyan-500',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    badge: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
    dot: 'bg-sky-500',
  },
  delivered: {
    label: 'Delivered',
    badge: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-red-50 text-red-800 ring-1 ring-red-200',
    dot: 'bg-red-500',
  },
};

/** Canonical lifecycle for faster admin navigation (legacy out_for_delivery stays recognized). */
export const LIFECYCLE_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
export const ALL_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'] as const;

export function StatusBadge({ status }: { status: string }) {
  const meta = ORDER_STATUS_META[status] || {
    label: status.replace(/_/g, ' '),
    badge: 'bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200',
    dot: 'bg-neutral-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${meta.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy,
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="space-y-4">
        <div className="text-xs text-neutral-600 leading-relaxed">{message}</div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Saving…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}