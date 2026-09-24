import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Review } from '../types';
import { Badge, Button, EmptyState, Spinner } from '../components/ui';
import { MessageSquare, Star, Trash2 } from 'lucide-react';

export function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<{ reviews: Review[] }>('/admin/reviews')
      .then((res) => setReviews(res.reviews))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (r: Review, isApproved: boolean) => {
    const res = await api.patch<{ review: Review }>(`/admin/reviews/${r.id}`, { isApproved });
    setReviews((prev) => prev.map((x) => (x.id === r.id ? res.review : x)));
  };

  const remove = async (r: Review) => {
    if (!window.confirm('Delete this review?')) return;
    await api.del(`/admin/reviews/${r.id}`);
    setReviews((prev) => prev.filter((x) => x.id !== r.id));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-neutral-900">Customer Reviews</h2>
        <p className="text-xs text-neutral-400">{reviews.length} reviews across all products</p>
        <p className="text-[11px] text-neutral-400 mt-0.5">
          A product's star rating and review count on the storefront come from its approved reviews.
        </p>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <Spinner />
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={<MessageSquare className="w-6 h-6" />} title="No reviews yet" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-neutral-900">{r.author}</p>
                  <p className="text-[10px] text-neutral-400">{r.city || '—'} · {r.date}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-neutral-800">{r.rating}</span>
                </div>
              </div>
              <p className="text-xs font-semibold text-neutral-800">{r.title}</p>
              <p className="text-xs text-neutral-500 leading-relaxed line-clamp-3">{r.comment}</p>
              <p className="text-[10px] font-semibold text-neutral-400">On: {r.product?.name || 'Unknown product'}</p>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                {r.isApproved ? (
                  <Badge color="bg-emerald-50 text-emerald-700">Approved</Badge>
                ) : (
                  <Badge color="bg-amber-50 text-amber-700">Pending</Badge>
                )}
                <div className="flex gap-1.5">
                  {!r.isApproved && (
                    <Button onClick={() => approve(r, true)} className="px-2.5 py-1 text-[11px]">Approve</Button>
                  )}
                  {r.isApproved && (
                    <Button variant="ghost" onClick={() => approve(r, false)} className="px-2.5 py-1 text-[11px]">Hide</Button>
                  )}
                  <Button variant="danger" onClick={() => remove(r)} className="px-2.5 py-1 text-[11px]">
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}