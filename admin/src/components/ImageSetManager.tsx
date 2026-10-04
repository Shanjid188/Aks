import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Link2, Loader2, Trash2 } from 'lucide-react';
import { api } from '../api';
import { Badge, Button, EmptyState, Spinner, TextInput, PageHeader } from '../components/ui';
import { adminImageUrl } from '../lib/imageUrl';

/** Row shape shared by every image-only banner set (gallery, offer …). */
export interface ImageSetRow {
  id: string;
  image: string;
  link: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ImageSetManagerProps {
  /** Admin API segment, e.g. "gallery-banners" → /admin/gallery-banners */
  resource: string;
  title: string;
  intro: string;
  /** Position labels rendered on the cards, e.g. ["Big wide banner", …] */
  slotLabels?: string[];
  /** Explainer card shown under the uploader. */
  guide?: { title: string; rows: { lead: string; text: string }[]; note?: string };
  emptyHint: string;
  /** Cards past this index are flagged as "not shown on the storefront". */
  capacity?: number;
  overCapacityNote?: string;
  /** How pictures are added: "upload" (default) picks files from the PC;
   *  "link" pastes image URLs instead — one or many at a time. */
  addBy?: 'upload' | 'link';
  /** Link mode: turns a pasted product link (…/products/<slug>) into that
   *  product's photo, click-through included. Lines that are not product
   *  links fall back to plain image URLs. */
  resolveProduct?: (slug: string) => Promise<{ image: string; link: string } | null>;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Image-set manager — upload-only CRUD for a set of homepage banner images
 * (Admin → Gallery Images / Offer Images).
 *
 * Uploading is the whole job: click "Add images", pick one or several pictures
 * and each one is uploaded and added straight away, in the order picked. Order,
 * the optional click-through link, hiding and deleting all live on the card
 * itself, so there is no form to fill in.
 */
export function ImageSetManager({
  resource,
  title,
  intro,
  slotLabels,
  guide,
  emptyHint,
  capacity,
  overCapacityNote,
  addBy = 'upload',
  resolveProduct,
}: ImageSetManagerProps) {
  const [rows, setRows] = useState<ImageSetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [savingLink, setSavingLink] = useState<string | null>(null);
  /** Link-mode paste box contents — one image URL per line. */
  const [paste, setPaste] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(() => {
    api
      .get<{ banners: ImageSetRow[] }>(`/admin/${resource}`)
      // Rows keep the portable '/images/uploads/<file>' reference so any later
      // edit writes that same portable form back to the DB. The live
      // '/api/uploads/<file>' rewrite happens at render time (adminImageUrl)
      // so a file uploaded after the last build is still actually served.
      .then((r) => setRows([...r.banners].sort((a, b) => a.sortOrder - b.sortOrder)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [resource]);

  useEffect(() => {
    load();
  }, [load]);

  /** Pick one or many pictures → upload → add. Nothing else to fill in. */
  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const picked = Array.from(files);
    setError(null);
    setBusy({ done: 0, total: picked.length });
    try {
      let order = rows.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1;
      for (let i = 0; i < picked.length; i++) {
        const dataUrl = await readFileAsDataUrl(picked[i]);
        const { url } = await api.post<{ url: string }>('/admin/upload', {
          name: picked[i].name,
          data: dataUrl,
        });
        await api.post(`/admin/${resource}`, { image: url, sortOrder: order++ });
        setBusy({ done: i + 1, total: picked.length });
      }
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /** Link mode: paste one link per line (or comma separated). Product links
   *  (…/products/<slug>) become that product's photo with a click-through to
   *  the product; anything else that looks like an image URL is added as-is. */
  const addLinks = async () => {
    const lines = paste
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError('Paste at least one link first.');
      return;
    }
    setError(null);
    setBusy({ done: 0, total: lines.length });
    const skipped: string[] = [];
    try {
      let order = rows.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1;
      let added = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let image = '';
        let link: string | undefined;

        const productMatch = /\/products\/([^/?#]+)/.exec(line);
        if (productMatch && resolveProduct) {
          // A product link from this website — resolve it to the product's photo.
          const resolved = await resolveProduct(productMatch[1]);
          if (!resolved) {
            skipped.push(line);
            setBusy({ done: i + 1, total: lines.length });
            continue;
          }
          image = resolved.image;
          link = resolved.link;
        } else if (line.startsWith('/') || /^https?:\/\//i.test(line)) {
          // A plain image URL / path.
          image = line;
        } else {
          skipped.push(line);
          setBusy({ done: i + 1, total: lines.length });
          continue;
        }

        await api.post(`/admin/${resource}`, { image, link, sortOrder: order++ });
        added++;
        setBusy({ done: i + 1, total: lines.length });
      }
      setPaste('');
      if (skipped.length > 0) {
        setError(
          `Added ${added}, skipped ${skipped.length} — not a product or image link: “${skipped[0]}”${
            skipped.length > 1 ? ' …' : ''
          }`,
        );
      } else if (added === 0) {
        setError('Nothing was added — check the links and try again.');
      }
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    try {
      await api.patch(`/admin/${resource}/${id}`, body);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (row: ImageSetRow) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await api.del(`/admin/${resource}/${row.id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  /** Move a card up/down, then renumber every row so the order stays 1..n. */
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const list = [...rows];
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    const renumbered = list.map((r, i) => ({ ...r, sortOrder: i + 1 }));
    setRows(renumbered);
    try {
      await Promise.all(renumbered.map((r) => api.patch(`/admin/${resource}/${r.id}`, { sortOrder: r.sortOrder })));
      load();
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Storefront"
        title={title}
        desc={intro}
        icon={<ImagePlus className="w-5 h-5" />}
        actions={
          <Button
            onClick={() => (addBy === 'link' ? pasteRef.current?.focus() : fileRef.current?.click())}
            disabled={!!busy}
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : addBy === 'link' ? (
              <Link2 className="w-3.5 h-3.5" />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" />
            )}
            {busy
              ? `${addBy === 'link' ? 'Adding' : 'Uploading'} ${busy.done}/${busy.total}…`
              : addBy === 'link'
                ? 'Add links'
                : 'Add images'}
          </Button>
        }
      />

      {addBy === 'upload' && (
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>
      )}

      {addBy === 'upload' ? (
        /* The primary action of this page — a plain click-and-upload zone. */
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!!busy}
          className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center transition-colors hover:border-[#D8232A]/40 hover:bg-[#D8232A]/[0.03] disabled:cursor-default disabled:opacity-60"
        >
          <ImagePlus className="mx-auto w-7 h-7 text-neutral-400" />
          <p className="mt-2 text-sm font-bold text-neutral-800">Click to add images</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            JPG, PNG or WEBP · up to 12MB each · select several at once if you like
          </p>
        </button>
      ) : (
        /* Link mode — paste one or many links, one per line. */
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-bold text-neutral-900">{resolveProduct ? 'Paste product links' : 'Paste image links'}</p>
          <p className="mt-1 text-[11px] text-neutral-500">
            {resolveProduct
              ? 'One link per line. Copy a product page address from your website (…/products/…) — the product’s photo appears on the wall and clicking it opens the product. Direct image links work too.'
              : 'One link per line — each line becomes one photo on the storefront. Facebook / CDN image links and /images/… paths all work.'}
          </p>
          <textarea
            ref={pasteRef}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder={resolveProduct ? 'https://your-site.com/products/product-name' : 'https://example.com/photo-1.jpg'}
            className="mt-3 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs outline-none transition-colors focus:border-neutral-400 focus:bg-white"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-neutral-400">
              {paste
                .split(/[\n,]+/)
                .map((s) => s.trim())
                .filter(Boolean).length}{' '}
              link(s) ready
            </span>
            <Button onClick={() => void addLinks()} disabled={!!busy || !paste.trim()}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              {busy ? `Adding ${busy.done}/${busy.total}…` : 'Add to the wall'}
            </Button>
          </div>
        </div>
      )}

      {guide && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-bold text-neutral-800">{guide.title}</p>
          <div className="mt-2 grid gap-1 text-[11px] text-neutral-500 sm:grid-cols-2 lg:grid-cols-4">
            {guide.rows.map((row) => (
              <span key={row.lead}>
                <strong className="text-neutral-700">{row.lead}</strong> {row.text}
              </span>
            ))}
          </div>
          {guide.note && <p className="mt-2 text-[11px] text-neutral-400">{guide.note}</p>}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState icon={<ImagePlus className="w-6 h-6" />} title="No images yet" hint={emptyHint} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row, i) => {
            const over = capacity !== undefined && i >= capacity;
            return (
              <div
                key={row.id}
                className={`overflow-hidden rounded-2xl border bg-white ${over ? 'border-amber-200' : 'border-neutral-200'}`}
              >
                <div className="relative aspect-[16/10] bg-neutral-100">
                  <img src={adminImageUrl(row.image)} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-neutral-900 backdrop-blur">
                    #{i + 1}
                    {slotLabels ? ` · ${slotLabels[i] ?? 'Over the limit'}` : ''}
                  </span>
                  {!row.isActive && <span aria-hidden="true" className="absolute inset-0 bg-white/60" />}
                </div>

                <div className="space-y-2 p-3">
                  {addBy === 'link' && (
                    <TextInput
                      defaultValue={row.image}
                      placeholder="Image URL — https://… or /images/…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value && value !== row.image) patch(row.id, { image: value });
                      }}
                    />
                  )}
                  <TextInput
                    defaultValue={row.link ?? ''}
                    placeholder="Optional link — /category/craft or https://…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value === (row.link ?? '')) return;
                      setSavingLink(row.id);
                      patch(row.id, { link: value }).finally(() => setSavingLink(null));
                    }}
                  />

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => patch(row.id, { isActive: !row.isActive })}
                      className="cursor-pointer"
                      title="Click to show/hide on the storefront"
                    >
                      {row.isActive ? (
                        <Badge color="bg-emerald-50 text-emerald-700">Live</Badge>
                      ) : (
                        <Badge color="bg-neutral-100 text-neutral-500">Hidden</Badge>
                      )}
                    </button>

                    <span className="text-[10px] font-semibold text-neutral-400">
                      {savingLink === row.id ? 'Saving link…' : row.link ? 'Link set' : ''}
                    </span>

                    <div className="flex items-center">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        title="Move up"
                        className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-default disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === rows.length - 1}
                        title="Move down"
                        className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-default disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => remove(row)}
                        title="Delete"
                        className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {over && overCapacityNote && (
                    <p className="text-[10px] font-semibold text-amber-700">{overCapacityNote}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
