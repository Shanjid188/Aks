import React, { useState } from 'react';
import { apiErrorMessage, submitContactMessage } from '../api';
import { useStore } from '../context/StoreContext';

/**
 * Contact form rendered under a content page body (Admin → Content Pages →
 * "Show contact form"). Messages go to the API and land in the admin inbox
 * (Admin → Messages); nothing is emailed, so the copy never promises a reply
 * within a fixed time — it says the team will get back to you.
 *
 * Client-side checks mirror the API's rules so a typo is caught instantly, but
 * the API is the authority: its error message is what the shopper finally sees.
 */
const inputClass =
  'w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl outline-none focus:border-[#D8232A] transition-colors bg-white';

export const ContactForm: React.FC<{ pageSlug: string }> = ({ pageSlug }) => {
  const { addToast } = useStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;

    if (!form.name.trim()) return setError('Please tell us your name.');
    if (!form.phone.trim() && !form.email.trim()) {
      return setError('Please leave a phone number or an email address so we can reply.');
    }
    if (!form.message.trim()) return setError('Please write your message.');

    setStatus('sending');
    setError(null);
    try {
      await submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        pageSlug,
      });
      setStatus('sent');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      addToast({
        type: 'success',
        title: 'Message sent',
        message: 'Thanks — our team has received your message and will get back to you.',
      });
    } catch (err) {
      // Keep the shopper's text: a failed send must never lose what they wrote.
      setStatus('idle');
      const message = apiErrorMessage(err, 'Could not send your message. Please try again.');
      setError(message);
      addToast({ type: 'error', title: 'Message not sent', message });
    }
  };

  return (
    <section className="mt-8 border-t border-neutral-200 pt-8">
      <h2 className="text-lg sm:text-xl font-black tracking-tight text-neutral-900">Send us a message</h2>
      <p className="mt-1.5 text-sm text-neutral-500">
        Fill in the form and our team will get back to you. You can also call or WhatsApp us using the details above.
      </p>

      {status === 'sent' && (
        <p className="mt-4 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
          Thank you — your message has reached us. We will reply as soon as we can.
        </p>
      )}

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Your name *</span>
            <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Phone *</span>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Email</span>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Subject</span>
            <input className={inputClass} value={form.subject} onChange={(e) => set('subject', e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Message *</span>
          <textarea
            rows={5}
            className={inputClass}
            value={form.message}
            onChange={(e) => set('message', e.target.value)}
          />
        </label>

        {error && (
          <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D8232A] text-white text-sm font-bold hover:bg-[#B91C1C] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </button>
        <p className="text-[11px] text-neutral-400">
          Phone or email — at least one is needed so we can reply to you.
        </p>
      </form>
    </section>
  );
};
