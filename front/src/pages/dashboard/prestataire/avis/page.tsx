import { useState, useEffect, useCallback } from 'react';
import { backendClient } from '@/lib/backendClient';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { createNotification } from '@/hooks/useCreateNotification';
import { useAuth } from '@/hooks/useAuth';
import { fetchProviderByUserId } from '@/lib/providerApi';


interface Review {
  id: number;
  provider_id: number;
  client_id: string;
  client_name: string;
  client_avatar: string | null;
  service: string;
  rating: number;
  comment: string;
  date: string;
  response: string | null;
  helpful: number;
  created_at: string;
}

export default function PrestataireAvisPage() {
  const { user } = useAuth();
  const { success } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setReviews([]);
        return;
      }

      const provider = await fetchProviderByUserId(user.id);
      if (!provider?.id) {
        setReviews([]);
        return;
      }

      const { data, error } = await backendClient
        .from('provider_reviews')
        .select('*')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }

      setReviews((data || []).map((r: any) => ({
        ...r,
        date: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '',
      })) as Review[]);
    } catch (error) {
      console.error(error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const filteredReviews = ratingFilter === 'all'
    ? reviews
    : reviews.filter(r => r.rating === ratingFilter);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0
  }));

  const handleReply = async (reviewId: number) => {
    if (!replyText.trim()) return;
    const { error } = await backendClient
      .from('provider_reviews')
      .update({ response: replyText.trim() })
      .eq('id', reviewId);
    if (error) {
      console.error(error);
      return;
    }
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, response: replyText.trim() } : r));
    success('Réponse publiée', 'Votre réponse a été publiée avec succès.');
    setReplyingTo(null);
    setReplyText('');

    // Notify the client that the provider responded
    const review = reviews.find(r => r.id === reviewId);
    if (review) {
      await createNotification(
        review.client_id,
        'Réponse à votre avis',
        `Le prestataire a repondu a votre avis sur "${review.service}".`,
        'review',
        '/dashboard/client/prestataires'
      );
    }
  };

  const handleHelpful = async (reviewId: number) => {
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;
    const newHelpful = review.helpful + 1;
    const { error } = await backendClient
      .from('provider_reviews')
      .update({ helpful: newHelpful })
      .eq('id', reviewId);
    if (error) {
      console.error(error);
      return;
    }
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpful: newHelpful } : r));
    success('Merci !', 'Vous avez trouvé cet avis utile.');
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Prestataire', path: '/dashboard/prestataire' }, { label: 'Avis clients' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Avis clients</h1>
          <p className="text-gray-600 text-sm md:text-base">Consultez et répondez aux avis de vos clients</p>
        </div>

        {/* Rating Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Overall Score */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-gray-900 mb-2">{averageRating.toFixed(1)}</p>
              <div className="flex items-center justify-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-5 h-5 flex items-center justify-center">
                    <i className={`ri-star-fill text-lg ${i < Math.round(averageRating) ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600">Basé sur {reviews.length} avis</p>
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Répartition des notes</h3>
            <div className="space-y-2">
              {ratingCounts.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-8">{star}★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div
                      className="bg-yellow-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setRatingFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              ratingFilter === 'all' ? 'bg-[#14B8A6] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Tous les avis
          </button>
          {[5, 4, 3, 2, 1].map(star => (
            <button
              key={star}
              onClick={() => setRatingFilter(star)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                ratingFilter === star ? 'bg-[#14B8A6] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <i className="ri-star-fill text-xs"></i> {star}
            </button>
          ))}
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonList count={4} />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start gap-4">
                  <img src={review.client_avatar || 'https://readdy.ai/api/search-image?query=professional%20user%20avatar%20placeholder%20icon%20simple%20modern&width=60&height=60&seq=avatar-fallback&orientation=squarish'} alt={review.client_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{review.client_name}</h3>
                        <p className="text-sm text-gray-500">{review.service} · {review.date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="w-4 h-4 flex items-center justify-center">
                            <i className={`ri-star-fill text-sm ${i < review.rating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{review.comment}</p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleHelpful(review.id)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <i className="ri-thumb-up-line"></i>
                        Utile ({review.helpful})
                      </button>
                      {!review.response && replyingTo !== review.id && (
                        <button
                          onClick={() => setReplyingTo(review.id)}
                          className="text-sm text-[#14B8A6] hover:text-[#0D9488] transition-colors font-medium"
                        >
                          Répondre
                        </button>
                      )}
                    </div>

                    {/* Reply Input */}
                    {replyingTo === review.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Écrivez votre réponse..."
                          maxLength={500}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm"
                        />
                        <button
                          onClick={() => handleReply(review.id)}
                          className="px-4 py-2 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488] transition-colors whitespace-nowrap"
                        >
                          Publier
                        </button>
                        <button
                          onClick={() => { setReplyingTo(null); setReplyText(''); }}
                          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    )}

                    {/* Existing Response */}
                    {review.response && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Votre réponse</p>
                        <p className="text-sm text-gray-700">{review.response}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredReviews.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-star-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun avis trouvé</h3>
            <p className="text-gray-600">Ajustez vos filtres</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
