import {
  resolveFaqCourseName,
  type CommunityComment,
  type CommunityCourse,
  type CommunityCourseFilter,
  type CommunityFaq,
  type CommunityTab,
} from './communityModel';

export function CommunityToolbar({
  activeTab,
  courseFilter,
  courses,
  onCourseFilterChange,
  onTabChange,
}: {
  activeTab: CommunityTab;
  courseFilter: CommunityCourseFilter;
  courses: CommunityCourse[];
  onCourseFilterChange: (filter: CommunityCourseFilter) => void;
  onTabChange: (tab: CommunityTab) => void;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-2">
        <CommunityTabButton active={activeTab === 'comments'} onClick={() => onTabChange('comments')}>
          Commentaires
        </CommunityTabButton>
        <CommunityTabButton active={activeTab === 'faq'} onClick={() => onTabChange('faq')}>
          FAQ
        </CommunityTabButton>
      </div>
      <select
        value={courseFilter}
        onChange={(event) => onCourseFilterChange(event.target.value)}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none"
      >
        <option value="all">Tous les cours</option>
        {courses.map((course, index) => (
          <option key={`${String(course.id)}-${index}`} value={String(course.id)}>
            {course.title}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CommunityCommentsPanel({
  canManage,
  loading,
  repliesByParent,
  replyDrafts,
  rootComments,
  onDraftChange,
  onModerate,
  onReply,
}: {
  canManage: boolean;
  loading: boolean;
  repliesByParent: Record<string, CommunityComment[]>;
  replyDrafts: Record<string, string>;
  rootComments: CommunityComment[];
  onDraftChange: (commentId: string, value: string) => void;
  onModerate: (comment: CommunityComment, patch: Partial<CommunityComment>) => void;
  onReply: (comment: CommunityComment) => void;
}) {
  return (
    <div className="space-y-4">
      {rootComments.map((comment) => (
        <CommentCard
          key={comment.id}
          canManage={canManage}
          comment={comment}
          replies={repliesByParent[comment.id] || []}
          replyDraft={replyDrafts[comment.id] || ''}
          onDraftChange={onDraftChange}
          onModerate={onModerate}
          onReply={onReply}
        />
      ))}
      {!loading && rootComments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          Aucun commentaire sur ce périmètre pour le moment.
        </div>
      ) : null}
    </div>
  );
}

export function CommunityFaqPanel({
  canManage,
  courses,
  faqForm,
  faqs,
  loading,
  onCreateFaq,
  onFaqFormChange,
  onStatusChange,
}: {
  canManage: boolean;
  courses: CommunityCourse[];
  faqForm: { course_id: string; question: string; answer: string; status: CommunityFaq['status'] };
  faqs: CommunityFaq[];
  loading: boolean;
  onCreateFaq: () => void;
  onFaqFormChange: (patch: Partial<typeof faqForm>) => void;
  onStatusChange: (faq: CommunityFaq, status: CommunityFaq['status']) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900">{faq.question}</div>
                <div className="mt-1 text-sm text-gray-500">{resolveFaqCourseName(faq, courses)}</div>
              </div>
              <select
                value={faq.status}
                onChange={(event) => onStatusChange(faq, event.target.value as CommunityFaq['status'])}
                disabled={!canManage}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </div>
            <p className="text-sm text-gray-700">{faq.answer}</p>
          </div>
        ))}
        {!loading && faqs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
            Aucune FAQ sur ce périmètre.
          </div>
        ) : null}
      </div>

      <div className="h-fit rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Nouvelle FAQ</h2>
        <div className="space-y-4">
          <select value={faqForm.course_id} onChange={(event) => onFaqFormChange({ course_id: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
            <option value="">Sélectionner un cours</option>
            {courses.map((course, index) => (
              <option key={`${String(course.id)}-${index}`} value={String(course.id)}>
                {course.title}
              </option>
            ))}
          </select>
          <input value={faqForm.question} onChange={(event) => onFaqFormChange({ question: event.target.value })} placeholder="Question fréquente" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
          <textarea value={faqForm.answer} onChange={(event) => onFaqFormChange({ answer: event.target.value })} rows={5} placeholder="Réponse formateur" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
          <select value={faqForm.status} onChange={(event) => onFaqFormChange({ status: event.target.value as CommunityFaq['status'] })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
            <option value="published">Publier immédiatement</option>
            <option value="draft">Garder en brouillon</option>
          </select>
          <button onClick={onCreateFaq} disabled={!canManage} className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
            Ajouter la FAQ
          </button>
        </div>
      </div>
    </div>
  );
}

function CommunityTabButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium ${active ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
      {children}
    </button>
  );
}

function CommentCard({
  canManage,
  comment,
  replies,
  replyDraft,
  onDraftChange,
  onModerate,
  onReply,
}: {
  canManage: boolean;
  comment: CommunityComment;
  replies: CommunityComment[];
  replyDraft: string;
  onDraftChange: (commentId: string, value: string) => void;
  onModerate: (comment: CommunityComment, patch: Partial<CommunityComment>) => void;
  onReply: (comment: CommunityComment) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900">{comment.user_name}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{comment.user_role}</span>
            {comment.pinned ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Épinglé</span> : null}
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${comment.status === 'visible' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {comment.status === 'visible' ? 'Visible' : 'Masqué'}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {comment.lesson_title || 'Leçon'} • {new Date(comment.created_at).toLocaleString('fr-FR')}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onModerate(comment, { pinned: !comment.pinned })} disabled={!canManage} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
            {comment.pinned ? 'Désépingler' : 'Épingler'}
          </button>
          <button onClick={() => onModerate(comment, { status: comment.status === 'visible' ? 'hidden' : 'visible' })} disabled={!canManage} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
            {comment.status === 'visible' ? 'Masquer' : 'Rendre visible'}
          </button>
        </div>
      </div>
      <p className="text-gray-700">{comment.content}</p>
      <div className="mt-3 text-xs text-gray-500">{comment.likes} mention(s) utile(s)</div>

      {replies.length > 0 ? (
        <div className="mt-4 space-y-3 border-l-2 border-gray-100 pl-4">
          {replies.map((reply) => (
            <div key={reply.id} className="rounded-lg bg-gray-50 p-4">
              <div className="mb-1 text-sm font-semibold text-gray-900">{reply.user_name}</div>
              <p className="text-sm text-gray-700">{reply.content}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <textarea
          rows={3}
          value={replyDraft}
          onChange={(event) => onDraftChange(comment.id, event.target.value)}
          placeholder="Répondre au commentaire..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
        <div className="flex justify-end">
          <button onClick={() => onReply(comment)} disabled={!canManage} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
            Répondre
          </button>
        </div>
      </div>
    </div>
  );
}
