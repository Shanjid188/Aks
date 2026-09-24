import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { ContentPage } from '../types';
import { Badge, Button, EmptyState, Field, Modal, Spinner, TextArea, TextInput, Toggle } from '../components/ui';
import { Plus, FileText, Pencil, Trash2, ExternalLink } from 'lucide-react';

interface FormState {
  id: string | null;
  slug: string;
  title: string;
  titleBn: string;
  body: string;
  bodyBn: string;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
  showInFooter: boolean;
  sortOrder: string;
}

const blank = (): FormState => ({
  id: null,
  slug: '',
  title: '',
  titleBn: '',
  body: '',
  bodyBn: '',
  seoTitle: '',
  seoDescription: '',
  isPublished: true,
  showInFooter: true,
  sortOrder: '0',
});

/** Content Pages — About, Contact and the policy pages served at /:slug. */
export function PagesPage() {
  const [rows, setRows] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get<{ pages: ContentPage[] }>('/admin/pages')
      .then((r) => setRows(r.pages))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug: form.slug || form.title,
        title: form.title,
        titleBn: form.titleBn,
        body: form.body,
        bodyBn: form.bodyBn,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        isPublished: form.isPublished,
        showInFooter: form.showInFooter,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (form.id) await api.patch(`/admin/pages/${form.id}`, payload);
      else await api.post('/admin/pages', payload);
      setForm(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: ContentPage) => {
    if (!window.confirm(`Delete the page "${p.title}" (/${p.slug})?`)) return;
    try {
      await api.del(`/admin/pages/${p.id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const openEdit = (p: ContentPage) =>
    setForm({
      id: p.id,
      slug: p.slug,
      title: p.title,
      titleBn: p.titleBn,
      body: p.body,
      bodyBn: p.bodyBn,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      isPublished: p.isPublished,
      showInFooter: p.showInFooter,
      sortOrder: String(p.sortOrder),
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Content Pages</h2>
          <p className="text-xs text-neutral-400">
            {rows.length} pages · live at /&lt;slug&gt; and linked in the footer
          </p>
        </div>
        <Button
          onClick={() => {
            setError(null);
            setForm(blank());
          }}
          className="gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> New page
        </Button>
      </div>

      <p className="text-[11px] text-neutral-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        The seeded policy pages are drafts written from the promises already shown on the storefront. Please review
        the wording (and add Bangla text) before relying on them.
      </p>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={<FileText className="w-6 h-6" />} title="No pages yet" hint="Create About, Contact or policy pages." />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Page</th>
                <th className="py-3 px-4">URL</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Footer</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50/60">
                  <td className="px-4 py-3">
                    <span className="font-bold text-neutral-900">{p.title}</span>
                    {p.titleBn && <span className="block text-[10px] text-neutral-400">{p.titleBn}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-500">/{p.slug}</td>
                  <td className="px-4 py-3">
                    {p.isPublished ? (
                      <Badge color="bg-emerald-50 text-emerald-700">Published</Badge>
                    ) : (
                      <Badge color="bg-neutral-100 text-neutral-500">Draft</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{p.showInFooter ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-neutral-500">{p.sortOrder}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <a
                      href={'/' + p.slug}
                      target="_blank"
                      rel="noreferrer"
                      title="Open on the storefront"
                      className="inline-block p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(p)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? `Edit ${form.title}` : 'New page'}>
        {form && (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title" hint="Shown as the page heading">
                <TextInput required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="About AKS Mart" />
              </Field>
              <Field label="Title (Bangla)">
                <TextInput value={form.titleBn} onChange={(e) => set('titleBn', e.target.value)} placeholder="একেএস মার্ট সম্পর্কে" />
              </Field>
            </div>
            <Field label="URL slug" hint="Left empty, it is generated from the title">
              <TextInput value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="about" />
            </Field>
            <Field label="Body" hint="“## ” starts a heading, “- ” starts a bullet, a blank line starts a new block">
              <TextArea value={form.body} onChange={(e) => set('body', e.target.value)} />
            </Field>
            <Field label="Body (Bangla)" hint="Leave empty to fall back to the English body">
              <TextArea value={form.bodyBn} onChange={(e) => set('bodyBn', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SEO title" hint="Empty = page title — store name">
                <TextInput value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} />
              </Field>
              <Field label="SEO description">
                <TextInput value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} />
              </Field>
            </div>
            <Field label="Sort order" hint="Lower numbers appear first in the footer">
              <TextInput type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
            </Field>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Toggle checked={form.isPublished} onChange={(v) => set('isPublished', v)} label="Published" />
              <Toggle checked={form.showInFooter} onChange={(v) => set('showInFooter', v)} label="Link in footer" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
