import type { Dispatch, SetStateAction } from 'react';
import type { CourseReview, ReviewDraft } from './formationDetailModel';

export function ReviewsTab({
  rating,
  reviews,
  userId,
  myReview,
  reviewGateMessage,
  reviewDraft,
  canWriteReview,
  reviewSubmitting,
  setReviewDraft,
  onSubmit,
}: {
  rating: number;
  reviews: CourseReview[];
  userId?: string | number | null;
  myReview: CourseReview | null;
  reviewGateMessage: string | null;
  reviewDraft: ReviewDraft;
  canWriteReview: boolean;
  reviewSubmitting: boolean;
  setReviewDraft: Dispatch<SetStateAction<ReviewDraft>>;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-6" role="tabpanel" id="course-panel-reviews" aria-labelledby="course-tab-reviews">
      <h2 className="mb-5 text-xl font-bold text-gray-900 sm:mb-6 sm:text-2xl">Avis des apprenants</h2>
      <div className="rounded-xl bg-gray-50 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-900 mb-2">{rating > 0 ? rating.toFixed(1) : '-'}</div>
            <StarRating rating={rating} />
            <div className="text-sm text-gray-600">{reviews.length} avis publiés</div>
          </div>
          <div className="max-w-lg text-sm text-gray-600 leading-7">
            Les avis affichés ici proviennent des apprenants réellement inscrits au parcours.
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{myReview ? 'Modifier votre avis' : 'Laisser un avis'}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {reviewGateMessage ?? 'Partagez un retour utile pour les prochains apprenants.'}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          <label htmlFor="course-review-rating" className="grid gap-2 text-sm font-medium text-gray-700">
            <span>Note</span>
            <select
              id="course-review-rating"
              value={reviewDraft.rating}
              disabled={!canWriteReview || reviewSubmitting}
              onChange={(event) => setReviewDraft((current) => ({ ...current, rating: Number(event.target.value) }))}
              className="c2p-input"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>{value}/5</option>
              ))}
            </select>
          </label>
          <label htmlFor="course-review-comment" className="grid gap-2 text-sm font-medium text-gray-700">
            <span>Commentaire</span>
            <textarea
              id="course-review-comment"
              value={reviewDraft.comment}
              disabled={!canWriteReview || reviewSubmitting}
              onChange={(event) => setReviewDraft((current) => ({ ...current, comment: event.target.value }))}
              rows={4}
              className="c2p-input min-h-[120px] resize-y"
              placeholder="Ce que ce parcours vous a apporté, ce qui pourrait être renforcé, le format, le rythme..."
            />
          </label>
          <div>
            <button
              type="button"
              disabled={!canWriteReview || reviewSubmitting}
              onClick={onSubmit}
              className="c2p-btn-primary w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {reviewSubmitting ? 'Publication...' : (myReview ? 'Mettre à jour mon avis' : 'Publier mon avis')}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
            Aucun avis publié pour cette formation pour le moment.
          </div>
        ) : (
          reviews.map((review) => (
            <ReviewCard key={review.id} review={review} isCurrentUser={Boolean(userId && String(review.student_id) === String(userId))} />
          ))
        )}
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center justify-center space-x-1 mb-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <i key={star} className={`ri-star-fill text-base ${rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}></i>
      ))}
    </div>
  );
}

function ReviewCard({ review, isCurrentUser }: { review: CourseReview; isCurrentUser: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{review.student_name}</p>
            {isCurrentUser ? (
              <span className="rounded-full bg-[#eef2f7] px-2 py-0.5 text-[11px] font-medium text-[#475569]">Vous</span>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <i key={star} className={`ri-star-fill text-sm ${Number(review.rating) >= star ? 'text-yellow-500' : 'text-gray-300'}`}></i>
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString('fr-FR')}</span>
      </div>
      <p className="mt-3 text-sm leading-7 text-gray-700">{review.comment}</p>
    </div>
  );
}
