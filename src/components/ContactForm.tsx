import React, { useState } from 'react';
import { apiErrorMessage, submitContactMessage } from '../api';
import { useStore } from '../context/StoreContext';
import { useLocalized } from './Localized';

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
  // Form copy follows the shopper's language; English stays the default.
  const t = useLocalized();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;

    if (!form.name.trim()) return setError(t('Please tell us your name.', 'অনুগ্রহ করে আপনার নাম লিখুন।'));
    if (!form.phone.trim() && !form.email.trim()) {
      return setError(
        t(
          'Please leave a phone number or an email address so we can reply.',
          'উত্তর দেওয়ার জন্য ফোন নম্বর অথবা ইমেইল ঠিকানা দিন।'
        )
      );
    }
    if (!form.message.trim()) return setError(t('Please write your message.', 'অনুগ্রহ করে আপনার বার্তা লিখুন।'));

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
        title: t('Message sent', 'বার্তা পাঠানো হয়েছে'),
        message: t(
          'Thanks — our team has received your message and will get back to you.',
          'ধন্যবাদ — আমাদের টিম আপনার বার্তা পেয়েছে এবং আপনার সাথে যোগাযোগ করবে।'
        ),
      });
    } catch (err) {
      // Keep the shopper's text: a failed send must never lose what they wrote.
      setStatus('idle');
      const message = apiErrorMessage(err, t('Could not send your message. Please try again.', 'আপনার বার্তা পাঠানো যায়নি। আবার চেষ্টা করুন।'));
      setError(message);
      addToast({ type: 'error', title: t('Message not sent', 'বার্তা পাঠানো যায়নি'), message });
    }
  };

  return (
    <section className="mt-8 border-t border-neutral-200 pt-8">
      <h2 className="text-lg sm:text-xl font-black tracking-tight text-neutral-900">
        {t('Send us a message', 'আমাদের বার্তা পাঠান')}
      </h2>
      <p className="mt-1.5 text-sm text-neutral-500">
        {t(
          'Fill in the form and our team will get back to you. You can also call or WhatsApp us using the details above.',
          'ফর্মটি পূরণ করুন, আমাদের টিম আপনার সাথে যোগাযোগ করবে। উপরের ফোন বা হোয়াটসঅ্যাপ নম্বরেও যোগাযোগ করতে পারেন।'
        )}
      </p>

      {status === 'sent' && (
        <p className="mt-4 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
          {t(
            'Thank you — your message has reached us. We will reply as soon as we can.',
            'ধন্যবাদ — আপনার বার্তা আমাদের কাছে পৌঁছেছে। যত দ্রুত সম্ভব উত্তর দেওয়ার চেষ্টা করব।'
          )}
        </p>
      )}

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              {t('Your name *', 'আপনার নাম *')}
            </span>
            <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              {t('Phone *', 'ফোন *')}
            </span>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              {t('Email', 'ইমেইল')}
            </span>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              {t('Subject', 'বিষয়')}
            </span>
            <input className={inputClass} value={form.subject} onChange={(e) => set('subject', e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
            {t('Message *', 'বার্তা *')}
          </span>
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
          {status === 'sending' ? t('Sending…', 'পাঠানো হচ্ছে…') : t('Send message', 'বার্তা পাঠান')}
        </button>
        <p className="text-[11px] text-neutral-400">
          {t(
            'Phone or email — at least one is needed so we can reply to you.',
            'ফোন বা ইমেইল — উত্তর দিতে অন্তত একটি প্রয়োজন।'
          )}
        </p>
      </form>
    </section>
  );
};
