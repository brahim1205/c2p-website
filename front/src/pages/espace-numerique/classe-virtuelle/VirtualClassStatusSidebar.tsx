import type { LessonComment } from './classeVirtuelleTypes';

interface VirtualClassStatusSidebarProps {
  commentInput: string;
  commentSubmitting: boolean;
  comments: LessonComment[];
  isEnded: boolean;
  isLive: boolean;
  isScheduled: boolean;
  loadingComments: boolean;
  userId?: string | number | null;
  onChangeComment: (value: string) => void;
  onSubmitComment: () => void;
}

export default function VirtualClassStatusSidebar({
  commentInput,
  commentSubmitting,
  comments,
  isEnded,
  isLive,
  isScheduled,
  loadingComments,
  userId,
  onChangeComment,
  onSubmitComment,
}: VirtualClassStatusSidebarProps) {
  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0 hidden md:flex">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-base font-bold text-white">Statut du direct</h3>
        <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
          isLive ? 'bg-red-600/20 text-red-400' : isScheduled ? 'bg-teal-600/20 text-teal-300' : 'bg-gray-700 text-gray-300'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : isScheduled ? 'bg-teal-400' : 'bg-gray-400'}`}></span>
          {isLive ? 'Live' : isScheduled ? 'Planifie' : isEnded ? 'Replay' : 'Viewer'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-4">
          <h4 className="text-sm font-semibold text-white">Ce qui est branché</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 text-teal-400"></i><span>Acces a la salle live quand le lien est publie.</span></li>
            <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 text-teal-400"></i><span>Replay quand l enregistrement est pret.</span></li>
            <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 text-teal-400"></i><span>Programme et lecons relies au cours.</span></li>
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <h4 className="text-sm font-semibold text-white">Ce qui reste a brancher</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2"><i className="ri-subtract-line mt-0.5 text-amber-300"></i><span>Chat temps reel partagé.</span></li>
            <li className="flex items-start gap-2"><i className="ri-subtract-line mt-0.5 text-amber-300"></i><span>Presence live et participation synchronisee.</span></li>
            <li className="flex items-start gap-2"><i className="ri-subtract-line mt-0.5 text-amber-300"></i><span>Notes personnelles synchronisees cote serveur.</span></li>
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-white">Questions sur la lecon</h4>
            <span className="text-xs text-gray-400">{comments.length} message{comments.length > 1 ? 's' : ''}</span>
          </div>
          {userId ? (
            <div className="mt-3">
              <textarea
                value={commentInput}
                onChange={(event) => onChangeComment(event.target.value)}
                rows={3}
                placeholder="Poser une question ou laisser un retour au formateur..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-teal-500"
              />
              <button
                onClick={onSubmitComment}
                disabled={commentSubmitting || commentInput.trim().length === 0}
                className="mt-3 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {commentSubmitting ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-400">Connectez-vous pour poser une question sur cette lecon.</p>
          )}

          <div className="mt-4 space-y-3">
            {loadingComments ? (
              <p className="text-sm text-gray-400">Chargement des questions...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun message pour cette lecon pour le moment.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{comment.user_name}</p>
                      <span className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gray-300">
                        {comment.user_role}
                      </span>
                      {comment.pinned ? (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-200">Epingle</span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-gray-500">{new Date(comment.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-300">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
