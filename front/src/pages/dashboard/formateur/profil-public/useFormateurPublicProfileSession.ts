import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchProfile, updateProfile } from '@/lib/accountApi';
import { fetchFormateurCourses } from '@/lib/formateurDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import { uploadVideoToServer } from '@/lib/uploadApi';
import type { CertificationItem, PaymentSettings, PortfolioItem, SocialLinks } from '@/lib/roles';
import {
  buildInitialForm,
  computePublicProfileStats,
  type ProfileFormState,
  type PublicProfileSnapshot,
} from './formateurPublicProfileModel';

export function useFormateurPublicProfileSession() {
  const { user, updateUser } = useAuth();
  const { success, error, info } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [form, setForm] = useState<ProfileFormState>(buildInitialForm(user));
  const [skillInput, setSkillInput] = useState('');
  const [languageInput, setLanguageInput] = useState('');
  const videoInputRef = useRef<HTMLInputElement>(null);

  const publicProfileQueryKey = useMemo(() => queryKeys.formateur.publicProfile(user?.id), [user?.id]);
  const {
    data: publicProfileSnapshot,
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: publicProfileQueryKey,
    queryFn: async () => {
      const [profile, coursesRes] = await Promise.all([
        fetchProfile(user?.id ?? ''),
        fetchFormateurCourses(user?.id ?? ''),
      ]);
      return {
        profile,
        courses: coursesRes,
      } as PublicProfileSnapshot;
    },
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (isError) {
      error('Erreur', 'Impossible de charger le profil public formateur.');
    }
  }, [error, isError]);

  useEffect(() => {
    if (!publicProfileSnapshot) return;
    const { profile } = publicProfileSnapshot;
    setForm(buildInitialForm(profile));
    updateUser(profile);
  }, [publicProfileSnapshot, updateUser]);

  const stats = useMemo(() => {
    const courses = publicProfileSnapshot?.courses ?? [];
    return computePublicProfileStats(courses);
  }, [publicProfileSnapshot?.courses]);

  const publicProfileUrl = useMemo(() => (user?.id ? `/formateurs/${user.id}` : null), [user?.id]);
  const userInitials = useMemo(
    () => `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || '?',
    [user?.firstName, user?.lastName],
  );

  const patchForm = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const patchSocialLink = (field: keyof SocialLinks, value: string) => {
    setForm((current) => ({
      ...current,
      socialLinks: {
        ...current.socialLinks,
        [field]: value,
      },
    }));
  };

  const patchPaymentSetting = (field: keyof PaymentSettings, value: string) => {
    setForm((current) => ({
      ...current,
      paymentSettings: {
        ...current.paymentSettings,
        [field]: value,
      },
    }));
  };

  const patchCertification = (id: string, field: keyof CertificationItem, value: string) => {
    setForm((current) => ({
      ...current,
      certifications: current.certifications.map((item) => (
        item.id === id ? { ...item, [field]: value } : item
      )),
    }));
  };

  const patchPortfolioItem = (id: string, field: keyof PortfolioItem, value: string) => {
    setForm((current) => ({
      ...current,
      portfolioItems: current.portfolioItems.map((item) => (
        item.id === id ? { ...item, [field]: value } : item
      )),
    }));
  };

  const addSkill = () => {
    const nextSkill = skillInput.trim();
    if (!nextSkill) return;
    if (form.skills.includes(nextSkill)) {
      info('Déjà présent', 'Cette compétence est déjà visible sur votre profil.');
      return;
    }
    patchForm('skills', [...form.skills, nextSkill]);
    setSkillInput('');
  };

  const addLanguage = () => {
    const nextLanguage = languageInput.trim();
    if (!nextLanguage) return;
    if (form.languages.includes(nextLanguage)) {
      info('Déjà présent', 'Cette langue est déjà visible sur votre profil.');
      return;
    }
    patchForm('languages', [...form.languages, nextLanguage]);
    setLanguageInput('');
  };

  const handleIntroVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    setVideoUploading(true);
    setVideoUploadProgress(0);
    try {
      const uploaded = await uploadVideoToServer(file, {
        folder: `c2p/trainers/${user.id}/intro`,
        filename: `intro-${Date.now()}`,
        onProgress: setVideoUploadProgress,
      });
      patchForm('introVideo', uploaded.url);
      success('Vidéo importée', 'La vidéo de présentation a été stockée sur le serveur.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible d’envoyer la vidéo de présentation.');
    } finally {
      setVideoUploading(false);
      setVideoUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const updated = await updateProfile(user.id, {
        avatar: form.avatar,
        bio: form.bio,
        publicTitle: form.publicTitle,
        website: form.website,
        preferredLanguage: form.preferredLanguage,
        languages: form.languages.filter(Boolean),
        skills: form.skills.filter(Boolean),
        introVideo: form.introVideo || undefined,
        publicProfileEnabled: Boolean(form.publicProfileEnabled),
        socialLinks: form.socialLinks,
        certifications: form.certifications.filter((item) => item.title.trim() && item.issuer.trim() && item.year.trim()),
        portfolioItems: form.portfolioItems.filter((item) => item.title.trim() && item.summary.trim()),
        paymentSettings: form.paymentSettings,
      });
      updateUser(updated);
      setForm(buildInitialForm(updated));
      success('Profil mis à jour', 'Le profil public formateur a été enregistré.');
      await queryClient.invalidateQueries({ queryKey: publicProfileQueryKey });
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Le profil public n a pas pu etre mis a jour.');
    } finally {
      setSaving(false);
    }
  };

  return {
    addLanguage,
    addSkill,
    form,
    handleIntroVideoUpload,
    handleSave,
    languageInput,
    loading,
    patchCertification,
    patchForm,
    patchPaymentSetting,
    patchPortfolioItem,
    patchSocialLink,
    publicProfileUrl,
    saving,
    setLanguageInput,
    setSkillInput,
    skillInput,
    stats,
    user,
    userInitials,
    videoInputRef,
    videoUploadProgress,
    videoUploading,
  };
}
