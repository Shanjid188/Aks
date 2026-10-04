import { useEffect, useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { api } from '../api';
import { adminImageUrl } from '../lib/imageUrl';
import { Button } from './ui';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

interface UploadImageButtonProps {
  /** Called with the public web path of the uploaded image, e.g. "/images/uploads/foo.jpg" */
  onUploaded: (url: string) => void;
  label?: string;
  className?: string;
}

/** Append a cache-busting query so a re-picked image never renders stale bytes. */
const freshUrl = (url: string): string => `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;

/**
 * "Upload from PC" button — picks a local image file, shows an instant preview,
 * uploads it to the API (POST /api/admin/upload), which optimises and stores it
 * under <repo>/public/images/uploads, then swaps in the server-returned URL so
 * the new artwork appears immediately (no page reload, no stale cache).
 */
export function UploadImageButton({ onUploaded, label = 'Upload from PC', className }: UploadImageButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Instant local preview of the chosen file (an object URL, revoked on change). */
  const [preview, setPreview] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Release the previous object URL so a long editing session doesn't leak blobs.
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const showPreview = (file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreview(url);
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    showPreview(file); // instant local preview, before the network round-trip
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await api.post<{ url: string; size: number; optimized?: boolean }>('/admin/upload', {
        name: file.name,
        data: dataUrl,
      });
      // Show the authoritative server-returned URL (cache-busted so the browser
      // cannot reuse a previous file under the same name).
      setPreview(freshUrl(res.url));
      onUploaded(res.url); // parent swaps the field to the saved URL immediately
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      // Drop the preview so the field doesn't show an image that never saved.
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      setPreview(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()} disabled={busy} className="shrink-0">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {busy ? 'Uploading…' : label}
      </Button>
      {error && <p className="mt-1 text-[10px] font-semibold text-red-600">{error}</p>}
      {/* Live preview thumbnail: local blob while uploading, server URL once saved.
          The server URL is rewritten to the live /api/uploads route so the preview
          shows the file that is actually on disk, not a stale /images/ path. */}
      {preview && (
        <img
          src={adminImageUrl(preview)}
          alt="Selected image preview"
          className="mt-2 h-16 w-16 rounded-lg object-cover border border-neutral-200 bg-neutral-50"
        />
      )}
    </div>
  );
}
