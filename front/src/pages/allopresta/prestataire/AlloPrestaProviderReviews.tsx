import type { ProviderReview } from './providerDetailTypes';

interface AlloPrestaProviderReviewsProps {
  displayName: string;
  profileUnlocked: boolean;
  reviewComment: string;
  reviews: ProviderReview[];
  selectedReviewRating: number;
  showReviewForm: boolean;
  onCancelReview: () => void;
  onChangeComment: (value: string) => void;
  onChangeRating: (value: number) => void;
  onStartReview: () => void;
  onSubmitReview: () => void;
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, index) => (
        <i key={index} className={`ri-star-fill text-sm ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}></i>
      ))}
    </div>
  );
}

export default function AlloPrestaProviderReviews({
  displayName,
  profileUnlocked,
  reviewComment,
  reviews,
  selectedReviewRating,
  showReviewForm,
  onCancelReview,
  onChangeComment,
  onChangeRating,
  onStartReview,
  onSubmitReview,
}: AlloPrestaProviderReviewsProps) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[#0f1c35] font-bold text-2xl">
          Avis Clients ({reviews.length})
        </h3>
        {profileUnlocked ? (
          <button type="button" onClick={onStartReview} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#147f7b] transition-colors hover:text-[#0f6f6b] cursor-pointer">
            <i className="ri-star-line"></i>
            Ajouter un retour client
          </button>
        ) : null}
      </div>

      {!profileUnlocked ? (
        <div className="rounded-xl border border-dashed border-[#d6dbe1] bg-[#f7fbfb] p-5 text-sm leading-7 text-[#64748b]">
          Les avis détaillés deviennent visibles une fois le niveau d’accès requis atteint. En attendant, C2P peut recevoir votre besoin et piloter la mise en relation.
        </div>
      ) : null}

      {showReviewForm && profileUnlocked && (
        <div className="mb-6 rounded-xl bg-gray-50 p-4 sm:p-6" role="group" aria-label="Formulaire d avis client">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Noter {displayName}</h4>
          <div className="mb-3 flex gap-1" role="radiogroup" aria-label={`Attribuer une note à ${displayName}`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChangeRating(star)}
                aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                aria-pressed={star <= selectedReviewRating}
                className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className={`ri-star-fill text-xl ${star <= selectedReviewRating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
              </button>
            ))}
          </div>
          <label htmlFor="provider-review-comment" className="sr-only">Commentaire de votre avis</label>
          <textarea
            id="provider-review-comment"
            value={reviewComment}
            onChange={(event) => onChangeComment(event.target.value)}
            placeholder="Décrivez votre expérience..."
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1a9a96] text-sm resize-none"
            rows={3}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{reviewComment.length}/500</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onSubmitReview} className="px-4 py-2 bg-[#1a9a96] text-white rounded-lg text-sm font-medium hover:bg-[#147f7b] transition-colors whitespace-nowrap cursor-pointer">
              Publier l&apos;avis
            </button>
            <button type="button" onClick={onCancelReview} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer">
              Annuler
            </button>
          </div>
        </div>
      )}

      {profileUnlocked ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-5 last:border-0 sm:pb-6">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  {review.client_avatar ? (
                    <img src={review.client_avatar} alt={review.client_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-500 font-medium text-sm">{review.client_name.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-[#0f1c35]">{review.client_name}</div>
                    <ReviewStars rating={review.rating} />
                  </div>
                </div>
                <span className="text-gray-500 text-sm">{new Date(review.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">{review.comment}</p>
              <span className="text-gray-500 text-xs">Service: {review.service}</span>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <button type="button" aria-label={`Marquer l avis de ${review.client_name} comme utile`} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                  <i className="ri-thumb-up-line"></i> Utile ({review.helpful})
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {profileUnlocked && reviews.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun avis pour le moment.</p>
        </div>
      )}
    </div>
  );
}
