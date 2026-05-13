import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import {
  createFormateurFaq,
  fetchFormateurCommunity,
  moderateFormateurCommunityComment,
  replyToFormateurCommunityComment,
  updateFormateurFaqStatus,
} from '@/lib/formateurDashboardApi';

interface CommunityCourse {
  id: string | number;
  title: string;
}

interface CommunityComment {
  id: string;
  course_id: string | number;
  lesson_id: string | number;
  lesson_title?: string | null;
  user_id: string;
  user_name: string;
  user_role: string;
  content: string;
  status: 'visible' | 'hidden';
  likes: number;
  pinned: boolean;
  parent_id?: string | null;
  created_at: string;
}

interface CommunityFaq {
  id: string;
  course_id: string | number;
  course_name?: string | null;
  question: string;
  answer: string;
  status: 'draft' | 'published' | 'archived';
  position: number;
}

export default function FormateurCommunityPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'comments' | 'faq'>('comments');
  const [courses, setCourses] = useState<CommunityCourse[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [faqs, setFaqs] = useState<CommunityFaq[]>([]);
  const [courseFilter, setCourseFilter] = useState<'all' | string>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [faqForm, setFaqForm] = useState({
    course_id: '',
    question: '',
    answer: '',
    status: 'published' as CommunityFaq['status'],
  });
  const isMountedRef = useRef(true);
  const subscriptionGate = gateFor('trainer_community_manage');

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadPage = useCallback(async () => {
    if (!user?.id) {
      if (isMountedRef.current) {
        setCourses([]);
        setComments([]);
        setFaqs([]);
        setLoading(false);
      }
      return;
    }
    if (isMountedRef.current) {
      setLoading(true);
    }
    try {
      const snapshot = await fetchFormateurCommunity(user.id);
      const nextCourses = snapshot.courses || [];
      if (!isMountedRef.current) return;
      setCourses(nextCourses);
      setComments(snapshot.comments as CommunityComment[]);
      setFaqs(snapshot.faqs as CommunityFaq[]);
      setFaqForm((current) => ({ ...current, course_id: current.course_id || String(nextCourses[0]?.id || '') }));
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error(err);
      error('Erreur', 'Impossible de charger l’espace communauté formateur.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [error, user?.id]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const filteredComments = useMemo(() => {
    return comments.filter((comment) => courseFilter === 'all' || String(comment.course_id) === courseFilter);
  }, [comments, courseFilter]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => courseFilter === 'all' || String(faq.course_id) === courseFilter);
  }, [courseFilter, faqs]);

  const rootComments = useMemo(() => filteredComments.filter((comment) => !comment.parent_id), [filteredComments]);

  const repliesByParent = useMemo(() => {
    return filteredComments.reduce<Record<string, CommunityComment[]>>((accumulator, comment) => {
      if (!comment.parent_id) return accumulator;
      if (!accumulator[comment.parent_id]) {
        accumulator[comment.parent_id] = [];
      }
      accumulator[comment.parent_id].push(comment);
      return accumulator;
    }, {});
  }, [filteredComments]);

  const moderateComment = async (comment: CommunityComment, patch: Partial<CommunityComment>) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    try {
      if (!user?.id) throw new Error('Commentaire introuvable.');
      await moderateFormateurCommunityComment(user.id, comment.id, patch);
      if (!isMountedRef.current) return;
      success('Commentaire mis à jour', 'La modération du commentaire a été enregistrée.');
      await loadPage();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error(err);
      error('Erreur', 'Impossible de modifier ce commentaire.');
    }
  };

  const sendReply = async (comment: CommunityComment) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    const content = (replyDrafts[comment.id] || '').trim();
    if (!content) {
      error('Réponse vide', 'Saisissez une réponse avant l’envoi.');
      return;
    }
    try {
      if (!user?.id) throw new Error('Commentaire introuvable.');
      await replyToFormateurCommunityComment(user.id, comment.id, content);
      if (!isMountedRef.current) return;
      setReplyDrafts((current) => ({ ...current, [comment.id]: '' }));
      success('Réponse envoyée', 'Votre réponse a été ajoutée à la discussion.');
      await loadPage();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error(err);
      error('Erreur', 'Impossible d’envoyer la réponse.');
    }
  };

  const createFaq = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!faqForm.course_id || !faqForm.question.trim() || !faqForm.answer.trim()) {
      error('Champs requis', 'Renseignez le cours, la question et la réponse.');
      return;
    }
    try {
      if (!user?.id) throw new Error('FAQ inaccessible.');
      await createFormateurFaq(user.id, {
        course_id: faqForm.course_id,
        question: faqForm.question,
        answer: faqForm.answer,
        status: faqForm.status,
      });
      if (!isMountedRef.current) return;
      success('FAQ ajoutée', 'La nouvelle entrée FAQ a été enregistrée.');
      setFaqForm((current) => ({ ...current, question: '', answer: '' }));
      await loadPage();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error(err);
      error('Erreur', 'Impossible d’ajouter cette FAQ.');
    }
  };

  const updateFaqStatus = async (faq: CommunityFaq, status: CommunityFaq['status']) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    try {
      if (!user?.id) throw new Error('FAQ inaccessible.');
      await updateFormateurFaqStatus(user.id, faq.id, status);
      if (!isMountedRef.current) return;
      success('FAQ mise à jour', 'Le statut de la FAQ a été enregistré.');
      await loadPage();
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error(err);
      error('Erreur', 'Impossible de mettre à jour cette FAQ.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur', path: '/dashboard/formateur' }, { label: 'Communauté' }]} />
        <SubscriptionRequiredBanner gate={subscriptionGate} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Commentaires, réponses et FAQ</h1>
          <p className="mt-2 text-gray-600">Suivez les questions des apprenants, répondez vite et structurez la FAQ des cours.</p>
        </div>

        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('comments')} className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === 'comments' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Commentaires</button>
            <button onClick={() => setActiveTab('faq')} className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === 'faq' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>FAQ</button>
          </div>
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none">
            <option value="all">Tous les cours</option>
            {courses.map((course) => <option key={course.id} value={String(course.id)}>{course.title}</option>)}
          </select>
        </div>

        {activeTab === 'comments' ? (
          <div className="space-y-4">
            {rootComments.map((comment) => (
              <div key={comment.id} className="rounded-xl border border-gray-200 bg-white p-5">
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
                    <div className="mt-2 text-sm text-gray-500">{comment.lesson_title || 'Leçon'} • {new Date(comment.created_at).toLocaleString('fr-FR')}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void moderateComment(comment, { pinned: !comment.pinned })} disabled={!subscriptionGate.allowed} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
                      {comment.pinned ? 'Désépingler' : 'Épingler'}
                    </button>
                    <button onClick={() => void moderateComment(comment, { status: comment.status === 'visible' ? 'hidden' : 'visible' })} disabled={!subscriptionGate.allowed} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
                      {comment.status === 'visible' ? 'Masquer' : 'Rendre visible'}
                    </button>
                  </div>
                </div>
                <p className="text-gray-700">{comment.content}</p>
                <div className="mt-3 text-xs text-gray-500">{comment.likes} mention(s) utile(s)</div>

                {(repliesByParent[comment.id] || []).length > 0 ? (
                  <div className="mt-4 space-y-3 border-l-2 border-gray-100 pl-4">
                    {repliesByParent[comment.id].map((reply) => (
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
                    value={replyDrafts[comment.id] || ''}
                    onChange={(event) => setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))}
                    placeholder="Répondre au commentaire..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button onClick={() => void sendReply(comment)} disabled={!subscriptionGate.allowed} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
                      Répondre
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && rootComments.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">Aucun commentaire sur ce périmètre pour le moment.</div> : null}
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              {filteredFaqs.map((faq) => (
                <div key={faq.id} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-gray-900">{faq.question}</div>
                      <div className="mt-1 text-sm text-gray-500">{faq.course_name || courses.find((course) => String(course.id) === String(faq.course_id))?.title || 'Cours'}</div>
                    </div>
                    <select
                      value={faq.status}
                      onChange={(event) => void updateFaqStatus(faq, event.target.value as CommunityFaq['status'])}
                      disabled={!subscriptionGate.allowed}
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
              {!loading && filteredFaqs.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">Aucune FAQ sur ce périmètre.</div> : null}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 h-fit">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Nouvelle FAQ</h2>
              <div className="space-y-4">
                <select value={faqForm.course_id} onChange={(e) => setFaqForm((current) => ({ ...current, course_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                  <option value="">Sélectionner un cours</option>
                  {courses.map((course) => <option key={course.id} value={String(course.id)}>{course.title}</option>)}
                </select>
                <input value={faqForm.question} onChange={(e) => setFaqForm((current) => ({ ...current, question: e.target.value }))} placeholder="Question fréquente" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                <textarea value={faqForm.answer} onChange={(e) => setFaqForm((current) => ({ ...current, answer: e.target.value }))} rows={5} placeholder="Réponse formateur" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                <select value={faqForm.status} onChange={(e) => setFaqForm((current) => ({ ...current, status: e.target.value as CommunityFaq['status'] }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                  <option value="published">Publier immédiatement</option>
                  <option value="draft">Garder en brouillon</option>
                </select>
                <button onClick={() => void createFaq()} disabled={!subscriptionGate.allowed} className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
                  Ajouter la FAQ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
