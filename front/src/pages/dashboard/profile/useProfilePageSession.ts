import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import type { CertificateData } from './components/CertificateViewer';
import type { ProfileCertificateEntry } from './components/ProfileCertificatesPanel';
import type { ProfileFormData } from './components/profileTypes';
import {
  buildProfileCertificateData,
  getProfileUserInitials,
  mapProfileCertificates,
} from './profilePageModel';
import { changeAccountPassword, deleteAccount, fetchProfile, updateProfile } from '@/lib/accountApi';
import {
  fetchFundingRoundsForOwner,
  fetchCollaborations,
  fetchOwnerProjects,
  fetchPartnershipsForOwner,
  fetchTrackedProjects,
  type Collaboration,
  type FundingRound,
  type ProjectPartnership,
  type ProjectRecord,
  type TrackedProject,
} from '@/lib/projectApi';
import { fetchApprenantCertificates, type ApprenantCertificate } from '@/lib/apprenantDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import { useProfilePageErrors } from './useProfilePageErrors';
import { useProfileTagsControls } from './useProfileTagsControls';

export function useProfilePageSession() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { success, info, error } = useToast();
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    bio: user?.bio ?? '',
    location: user?.location ?? '',
    website: user?.website ?? '',
    linkedin: user?.socialLinks?.linkedin ?? '',
    twitter: user?.socialLinks?.twitter ?? '',
    profession: user?.publicTitle ?? '',
    company: '',
    experience: '',
    skills: user?.skills ?? [],
    languages: user?.languages ?? [],
  });

  const profileQueryKey = queryKeys.account.profile(user?.id);
  const profileQuery = useQuery({
    queryKey: profileQueryKey,
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user?.id),
  });

  const porteurPublicQuery = useQuery({
    queryKey: queryKeys.porteur.publicProfileData(user?.id),
    queryFn: async () => {
      const [projects, partnerships, rounds] = await Promise.all([
        fetchOwnerProjects(user!.id),
        fetchPartnershipsForOwner(user!.id),
        fetchFundingRoundsForOwner(user!.id),
      ]);
      return { projects, partnerships, rounds };
    },
    enabled: Boolean(user?.id && user.role === 'porteur'),
  });

  const partnerPublicQuery = useQuery({
    queryKey: queryKeys.partenaire.publicProfileData(user?.id),
    queryFn: async () => {
      const [trackedProjects, collaborations] = await Promise.all([
        fetchTrackedProjects(user!.id),
        fetchCollaborations(user!.id),
      ]);
      return { trackedProjects, collaborations };
    },
    enabled: Boolean(user?.id && user.role === 'partenaire'),
  });

  const apprenantCertificatesQuery = useQuery({
    queryKey: queryKeys.apprenant.certificates(user?.id),
    queryFn: () => fetchApprenantCertificates(user!.id, { status: 'issued' }),
    enabled: Boolean(user?.id && user.role === 'apprenant'),
  });

  useEffect(() => {
    if (profileQuery.data) {
      const profile = profileQuery.data;
      setFormData((prev) => ({
        ...prev,
        firstName: profile.firstName || prev.firstName,
        lastName: profile.lastName || prev.lastName,
        email: profile.email || prev.email,
        phone: profile.phone || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        linkedin: profile.socialLinks?.linkedin || '',
        twitter: profile.socialLinks?.twitter || '',
        profession: profile.publicTitle || '',
        skills: profile.skills ?? [],
        languages: profile.languages ?? [],
      }));
      updateUser(profile);
    }
  }, [profileQuery.data, updateUser]);

  useProfilePageErrors({ error, partnerPublicQuery, porteurPublicQuery, profileQuery });

  const porteurProjects: ProjectRecord[] = useMemo(() => porteurPublicQuery.data?.projects ?? [], [porteurPublicQuery.data?.projects]);
  const porteurPartnerships: ProjectPartnership[] = useMemo(() => porteurPublicQuery.data?.partnerships ?? [], [porteurPublicQuery.data?.partnerships]);
  const porteurRounds: FundingRound[] = useMemo(() => porteurPublicQuery.data?.rounds ?? [], [porteurPublicQuery.data?.rounds]);
  const partnerTrackedProjects: TrackedProject[] = useMemo(() => partnerPublicQuery.data?.trackedProjects ?? [], [partnerPublicQuery.data?.trackedProjects]);
  const partnerCollaborations: Collaboration[] = useMemo(() => partnerPublicQuery.data?.collaborations ?? [], [partnerPublicQuery.data?.collaborations]);
  const apprenantCertificates: ApprenantCertificate[] = useMemo(() => apprenantCertificatesQuery.data ?? [], [apprenantCertificatesQuery.data]);

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      const updated = await updateProfile(user.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        location: formData.location,
        publicTitle: formData.profession,
        website: formData.website,
        languages: formData.languages.filter(Boolean),
        skills: formData.skills.filter(Boolean),
        socialLinks: {
          linkedin: formData.linkedin || undefined,
          twitter: formData.twitter || undefined,
        },
      });

      updateUser(updated);
      queryClient.setQueryData(profileQueryKey, updated);
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      success('Profil mis a jour', 'Vos informations ont ete enregistrees avec succes.');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Le profil n a pas pu etre mis a jour.');
    }
  };

  const handlePasswordChange = async () => {
    if (!user?.id) return;

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      info('Champs requis', 'Veuillez remplir tous les champs du mot de passe.');
      return;
    }
    if (passwordData.newPassword.length < 10) {
      info('Mot de passe trop court', 'Le nouveau mot de passe doit contenir au moins 10 caracteres.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      info('Mots de passe différents', 'Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    try {
      await changeAccountPassword(user.id, passwordData.currentPassword, passwordData.newPassword);
      success('Mot de passe mis a jour', 'Votre mot de passe a ete change avec succes.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await profileQuery.refetch();
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Le mot de passe n a pas pu etre modifie.');
    }
  };

  const handleAvatarChange = async (url: string) => {
    if (!user?.id) return;

    updateUser({ avatar: url });
    try {
      const updated = await updateProfile(user.id, { avatar: url });
      updateUser(updated);
      queryClient.setQueryData(profileQueryKey, updated);
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
    } catch (err) {
      console.error(err);
      error('Erreur', 'La photo de profil n a pas pu etre enregistree.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id || isDeletingAccount) return;

    setIsDeletingAccount(true);
    try {
      await deleteAccount(user.id);
      setShowDeleteConfirm(false);
      success('Compte supprimé', 'Votre compte a été supprimé.');
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Le compte n a pas pu etre supprime.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const {
    addLanguage,
    addSkill,
    langInput,
    removeLanguage,
    removeSkill,
    setLangInput,
    setSkillInput,
    skillInput,
  } = useProfileTagsControls({ formData, setFormData });

  const userInitials = getProfileUserInitials(user);
  const completedCourses = mapProfileCertificates(apprenantCertificates);
  const isPorteur = user?.role === 'porteur';
  const isPartenaire = user?.role === 'partenaire';
  const publicName = user ? `${user.firstName} ${user.lastName}` : `${formData.firstName} ${formData.lastName}`;
  const porteurSectors = Array.from(new Set(porteurProjects.map((project) => project.sector || project.category).filter(Boolean))).slice(0, 5);
  const totalFundingTarget = porteurRounds.reduce((sum, round) => sum + Number(round.target_amount || 0), 0);
  const totalRaised = porteurRounds.reduce((sum, round) => sum + Number(round.raised_amount || 0), 0);
  const partnerTypes = Array.from(new Set([
    ...partnerTrackedProjects.map((project) => project.partner_type),
    ...partnerCollaborations.map((collaboration) => collaboration.partner_type),
  ].filter(Boolean))).map((type) => String(type));
  const partnerExpertise = Array.from(new Set(
    partnerCollaborations.flatMap((collaboration) => [
      collaboration.type,
      collaboration.partner_type,
      collaboration.project_title,
    ]).filter(Boolean).map((item) => String(item)),
  )).slice(0, 6);
  const totalPartnerInvestment = partnerTrackedProjects.reduce((sum, project) => sum + Number(project.invested_amount || 0), 0);
  const activePartnerCollaborations = partnerCollaborations.filter((collaboration) => String(collaboration.status || '').toLowerCase() === 'actif');

  const generateCertificate = (entry: ProfileCertificateEntry) => {
    setCertificate(buildProfileCertificateData(entry, user, formData));
  };

  return {
    user,
    activeTab,
    setActiveTab,
    isEditing,
    setIsEditing,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeletingAccount,
    passwordData,
    setPasswordData,
    certificate,
    setCertificate,
    formData,
    setFormData,
    skillInput,
    setSkillInput,
    langInput,
    setLangInput,
    profileLoading: profileQuery.isLoading,
    porteurProjects,
    porteurPartnerships,
    partnerTrackedProjects,
    partnerCollaborations,
    userInitials,
    completedCourses,
    isPorteur,
    isPartenaire,
    publicName,
    porteurSectors,
    totalFundingTarget,
    totalRaised,
    partnerTypes,
    partnerExpertise,
    totalPartnerInvestment,
    activePartnerCollaborations,
    handleSave,
    handlePasswordChange,
    handleAvatarChange,
    handleDeleteAccount,
    addSkill,
    removeSkill,
    addLanguage,
    removeLanguage,
    generateCertificate,
  };
}
