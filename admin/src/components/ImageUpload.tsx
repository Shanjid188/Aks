import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { api } from '../api';
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

/**
 * "Upload from PC" button — picks a local image file, uploads it to the API
 * (POST /api/admin/upload) which saves it under <repo>/public/images/uploads,
 * then hands back the public path so it renders on both admin & storefront.
 */
export function UploadImageButton({ onUploaded, label = 'Upload from PC', className }: UploadImageButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await api.post<{ url: string; size: number }>('/admin/upload', {
        name: file.name,
        data: dataUrl,
      });
      onUploaded(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
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
    </div>
  );
}
