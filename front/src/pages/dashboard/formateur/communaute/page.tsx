import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import { queryKeys } from '@/lib/queryKeys';
import {
  createFormateurFaq,
  fetchFormateurCommunity,
  moderateFormateurCommunityComment,
  replyToFormateurCommunityComment,
  updateFormateurFaqStatus,
} from '@/lib/formateurDashboardApi';
import { CommunityCommentsPanel, CommunityFaqPanel, CommunityToolbar } from './CommunityPanels';
import {
  filterCommunityComments,
  filterCommunityFaqs,
  splitCommunityThreads,
  type CommunityComment,
  type CommunityFaq,
  type CommunitySnapshot,
  type CommunityTab,
} from './communityModel';

export default function FormateurCommunityPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CommunityTab>('comments');
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

  const communityQueryKey = useMemo(() => queryKeys.formateur.community(user?.id), [user?.id]);
  const {
    data: communitySnapshot,
    isLoading: loading,
    isError,
    error: communityError,
  } = useQuery({
    queryKey: communityQueryKey,
    queryFn: async () => fetchFormateurCommunity(user?.id ?? '') as Promise<CommunitySnapshot>,
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (isError) {
      error('Erreur', 'Impossible de charger l’espace communauté formateur.');
      console.error(communityError);
    }
  }, [communityError, error, isError]);

  const courses = useMemo(() => communitySnapshot?.courses || [], [communitySnapshot?.courses]);
  const comments = useMemo(() => communitySnapshot?.comments || [], [communitySnapshot?.comments]);
  const faqs = useMemo(() => communitySnapshot?.faqs || [], [communitySnapshot?.faqs]);

  useEffect(() => {
    if (faqForm.course_id || courses.length === 0) return;
    setFaqForm((current) => ({ ...current, course_id: String(courses[0]?.id || '') }));
  }, [courses, faqForm.course_id]);

  const refreshCommunity = async () => {
    await queryClient.invalidateQueries({ queryKey: communityQueryKey });
  };

  const filteredComments = useMemo(() => filterCommunityComments(comments, courseFilter), [comments, courseFilter]);

  const filteredFaqs = useMemo(() => filterCommunityFaqs(faqs, courseFilter), [courseFilter, faqs]);

  const { rootComments, repliesByParent } = useMemo(() => splitCommunityThreads(filteredComments), [filteredComments]);

  const updateReplyDraft = (commentId: string, value: string) => {
    setReplyDrafts((current) => ({ ...current, [commentId]: value }));
  };

  const updateFaqForm = (patch: Partial<typeof faqForm>) => {
    setFaqForm((current) => ({ ...current, ...patch }));
  };

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
      await refreshCommunity();
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
      await refreshCommunity();
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
      await refreshCommunity();
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
      await refreshCommunity();
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

        <CommunityToolbar
          activeTab={activeTab}
          courseFilter={courseFilter}
          courses={courses}
          onCourseFilterChange={setCourseFilter}
          onTabChange={setActiveTab}
        />

        {activeTab === 'comments' ? (
          <CommunityCommentsPanel
            canManage={subscriptionGate.allowed}
            loading={loading}
            repliesByParent={repliesByParent}
            replyDrafts={replyDrafts}
            rootComments={rootComments}
            onDraftChange={updateReplyDraft}
            onModerate={(comment, patch) => void moderateComment(comment, patch)}
            onReply={(comment) => void sendReply(comment)}
          />
        ) : (
          <CommunityFaqPanel
            canManage={subscriptionGate.allowed}
            courses={courses}
            faqForm={faqForm}
            faqs={filteredFaqs}
            loading={loading}
            onCreateFaq={() => void createFaq()}
            onFaqFormChange={updateFaqForm}
            onStatusChange={(faq, status) => void updateFaqStatus(faq, status)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
