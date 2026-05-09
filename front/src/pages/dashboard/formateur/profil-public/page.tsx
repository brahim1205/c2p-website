import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import AvatarUpload from '@/components/base/AvatarUpload';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { backendClient } from '@/lib/backendClient';
import { fetchProfile, updateProfile } from '@/lib/accountApi';
import { uploadVideoToServer } from '@/lib/uploadApi';
import type { AuthUser, CertificationItem, PaymentSettings, PortfolioItem, SocialLinks } from '@/lib/roles';

type ProfileFormState = Pick<
  AuthUser,
  'avatar' | 'bio' | 'publicTitle' | 'website' | 'preferredLanguage' | 'languages' | 'skills' | 'introVideo' | 'publicProfileEnabled'
> & {
  socialLinks: SocialLinks;
  certifications: CertificationItem[];
  portfolioItems: PortfolioItem[];
  paymentSettings: PaymentSettings;
};

const emptyCertification = (): CertificationItem => ({
  id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: '',
  issuer: '',
  year: '',
  credentialUrl: '',
});

const emptyPortfolioItem = (): PortfolioItem => ({
  id: `portfolio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: '',
  summary: '',
  image: '',
  url: '',
});

function buildInitialForm(user?: AuthUser | null): ProfileFormState {
  return {
    avatar: user?.avatar ?? '',
    bio: user?.bio ?? '',
    publicTitle: user?.publicTitle ?? '',
    website: user?.website ?? '',
    preferredLanguage: user?.preferredLanguage ?? 'Francais',
    languages: user?.languages ?? [],
    skills: user?.skills ?? [],
    introVideo: user?.introVideo ?? '',
    publicProfileEnabled: Boolean(user?.publicProfileEnabled),
    socialLinks: user?.socialLinks ?? {},
    certifications: user?.certifications ?? [],
    portfolioItems: user?.portfolioItems ?? [],
    paymentSettings: user?.paymentSettings ?? {},
  };
}

function getFieldClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20';
}

export default function FormateurPublicProfilePage() {
  const { user, updateUser } = useAuth();
  const { success, error, info } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [form, setForm] = useState<ProfileFormState>(buildInitialForm(user));
  const [skillInput, setSkillInput] = useState('');
  const [languageInput, setLanguageInput] = useState('');
  const [stats, setStats] = useState({
    courses: 0,
    students: 0,
    revenue: 0,
    completionRate: 0,
  });
  const videoInputRef = useRef<HTMLInputElement>(null);

  const loadPage = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [profile, coursesRes] = await Promise.all([
        fetchProfile(user.id),
        backendClient.from('courses').select('*').eq('instructor_id', user.id).order('updated_at', { ascending: false }),
      ]);

      if (coursesRes.error) throw coursesRes.error;

      const courses = (coursesRes.data || []) as Array<{
        students_count?: number;
        revenue?: number;
        completion_rate?: number;
      }>;

      setForm(buildInitialForm(profile));
      setStats({
        courses: courses.length,
        students: courses.reduce((sum, course) => sum + Number(course.students_count || 0), 0),
        revenue: courses.reduce((sum, course) => sum + Number(course.revenue || 0), 0),
        completionRate: courses.length
          ? Math.round(courses.reduce((sum, course) => sum + Number(course.completion_rate || 0), 0) / courses.length)
          : 0,
      });
      updateUser(profile);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger le profil public formateur.');
    } finally {
      setLoading(false);
    }
  }, [error, updateUser, user?.id]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

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

  const handleIntroVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Le profil public n a pas pu etre mis a jour.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Formateur', path: '/dashboard/formateur' },
            { label: 'Profil public' },
          ]}
        />

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profil public formateur</h1>
            <p className="mt-2 text-gray-600">Ce profil alimente votre page publique, vos preuves d’expertise et vos données de paiement.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {publicProfileUrl ? (
              <Link
                to={publicProfileUrl}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Prévisualiser la page publique
              </Link>
            ) : null}
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Formations', value: stats.courses, icon: 'ri-book-open-line' },
            { label: 'Apprenants', value: stats.students, icon: 'ri-group-line' },
            { label: 'Revenus', value: `${stats.revenue.toLocaleString('fr-FR')} FCFA`, icon: 'ri-wallet-3-line' },
            { label: 'Complétion', value: `${stats.completionRate}%`, icon: 'ri-bar-chart-line' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <i className={`${stat.icon} text-lg`}></i>
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-4">
                  <AvatarUpload
                    src={form.avatar || null}
                    initials={userInitials}
                    size="xl"
                    editable
                    onChange={(url) => patchForm('avatar', url)}
                  />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {user ? `${user.firstName} ${user.lastName}` : 'Profil formateur'}
                    </h2>
                    <p className="text-sm text-gray-600">{form.publicTitle || 'Ajoutez un titre public pour clarifier votre positionnement.'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${user?.expertVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                        {user?.expertVerified ? 'Expert vérifié' : 'En attente de vérification admin'}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${form.publicProfileEnabled ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                        {form.publicProfileEnabled ? 'Profil public actif' : 'Profil public masqué'}
                      </span>
                    </div>
                  </div>
                </div>
                <label className="inline-flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(form.publicProfileEnabled)}
                    onChange={(event) => patchForm('publicProfileEnabled', event.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  Rendre le profil public
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Titre public</label>
                  <input
                    type="text"
                    value={form.publicTitle || ''}
                    onChange={(event) => patchForm('publicTitle', event.target.value)}
                    placeholder="Ex: Formatrice React et marketing digital"
                    className={getFieldClass()}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
                  <textarea
                    rows={5}
                    value={form.bio || ''}
                    onChange={(event) => patchForm('bio', event.target.value)}
                    placeholder="Présentez votre expertise, votre méthode et vos résultats."
                    className={`${getFieldClass()} resize-none`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Site web</label>
                  <input
                    type="url"
                    value={form.website || ''}
                    onChange={(event) => patchForm('website', event.target.value)}
                    placeholder="https://..."
                    className={getFieldClass()}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Langue principale</label>
                  <input
                    type="text"
                    value={form.preferredLanguage || ''}
                    onChange={(event) => patchForm('preferredLanguage', event.target.value)}
                    placeholder="Français"
                    className={getFieldClass()}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Compétences et langues</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Compétences</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(event) => setSkillInput(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), addSkill())}
                        placeholder="Ajouter une compétence"
                        className={getFieldClass()}
                      />
                      <button onClick={addSkill} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black">
                        Ajouter
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.skills.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => patchForm('skills', form.skills.filter((item) => item !== skill))}
                        className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700"
                      >
                        {skill}
                        <i className="ri-close-line"></i>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Langues</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={languageInput}
                        onChange={(event) => setLanguageInput(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), addLanguage())}
                        placeholder="Ajouter une langue"
                        className={getFieldClass()}
                      />
                      <button onClick={addLanguage} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black">
                        Ajouter
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.languages.map((language) => (
                      <button
                        key={language}
                        onClick={() => patchForm('languages', form.languages.filter((item) => item !== language))}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
                      >
                        {language}
                        <i className="ri-close-line"></i>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Réseaux et vidéo</h2>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={videoUploading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {videoUploading ? `Import ${videoUploadProgress}%` : 'Importer une vidéo'}
                </button>
              </div>
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleIntroVideoUpload} />
              <div className="grid gap-4 md:grid-cols-2">
                {(['linkedin', 'twitter', 'facebook', 'instagram', 'youtube'] as const).map((network) => (
                  <div key={network}>
                    <label className="mb-1 block text-sm font-medium capitalize text-gray-700">{network.replace('_', ' ')}</label>
                    <input
                      type="url"
                      value={form.socialLinks[network] || ''}
                      onChange={(event) => patchSocialLink(network, event.target.value)}
                      placeholder="https://..."
                      className={getFieldClass()}
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Vidéo de présentation</label>
                  <input
                    type="url"
                    value={form.introVideo || ''}
                    onChange={(event) => patchForm('introVideo', event.target.value)}
                    placeholder="https://.../presentation.mp4"
                    className={getFieldClass()}
                  />
                  {videoUploading ? (
                    <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
                      <div className="mb-2 flex items-center justify-between text-xs font-medium text-teal-700">
                        <span>Upload de la vidéo en cours</span>
                        <span>{videoUploadProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-teal-100">
                        <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${videoUploadProgress}%` }}></div>
                      </div>
                    </div>
                  ) : null}
                  {form.introVideo ? (
                    <video src={form.introVideo} controls className="mt-3 h-56 w-full rounded-xl border border-gray-200 bg-black object-cover" />
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Certifications</h2>
                <button onClick={() => patchForm('certifications', [...form.certifications, emptyCertification()])} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Ajouter
                </button>
              </div>
              <div className="space-y-4">
                {form.certifications.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="mb-3 flex justify-end">
                      <button
                        onClick={() => patchForm('certifications', form.certifications.filter((entry) => entry.id !== item.id))}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input value={item.title} onChange={(e) => patchCertification(item.id, 'title', e.target.value)} placeholder="Titre" className={getFieldClass()} />
                      <input value={item.issuer} onChange={(e) => patchCertification(item.id, 'issuer', e.target.value)} placeholder="Organisme" className={getFieldClass()} />
                      <input value={item.year} onChange={(e) => patchCertification(item.id, 'year', e.target.value)} placeholder="Année" className={getFieldClass()} />
                      <input value={item.credentialUrl || ''} onChange={(e) => patchCertification(item.id, 'credentialUrl', e.target.value)} placeholder="URL justificatif" className={getFieldClass()} />
                    </div>
                  </div>
                ))}
                {form.certifications.length === 0 ? <p className="text-sm text-gray-500">Aucune certification renseignée.</p> : null}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Portfolio</h2>
                <button onClick={() => patchForm('portfolioItems', [...form.portfolioItems, emptyPortfolioItem()])} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Ajouter
                </button>
              </div>
              <div className="space-y-4">
                {form.portfolioItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="mb-3 flex justify-end">
                      <button
                        onClick={() => patchForm('portfolioItems', form.portfolioItems.filter((entry) => entry.id !== item.id))}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input value={item.title} onChange={(e) => patchPortfolioItem(item.id, 'title', e.target.value)} placeholder="Titre" className={getFieldClass()} />
                      <input value={item.url || ''} onChange={(e) => patchPortfolioItem(item.id, 'url', e.target.value)} placeholder="URL du projet" className={getFieldClass()} />
                      <input value={item.image || ''} onChange={(e) => patchPortfolioItem(item.id, 'image', e.target.value)} placeholder="URL visuel" className={`${getFieldClass()} md:col-span-2`} />
                      <textarea value={item.summary} onChange={(e) => patchPortfolioItem(item.id, 'summary', e.target.value)} rows={3} placeholder="Résumé du projet ou cas client" className={`${getFieldClass()} md:col-span-2 resize-none`} />
                    </div>
                  </div>
                ))}
                {form.portfolioItems.length === 0 ? <p className="text-sm text-gray-500">Ajoutez au moins un cas client ou une réalisation.</p> : null}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Informations de paiement</h2>
              <div className="space-y-4">
                <input value={form.paymentSettings.beneficiaryName || ''} onChange={(e) => patchPaymentSetting('beneficiaryName', e.target.value)} placeholder="Nom du bénéficiaire" className={getFieldClass()} />
                <input value={form.paymentSettings.iban || ''} onChange={(e) => patchPaymentSetting('iban', e.target.value)} placeholder="IBAN / compte bancaire" className={getFieldClass()} />
                <input value={form.paymentSettings.paypal || ''} onChange={(e) => patchPaymentSetting('paypal', e.target.value)} placeholder="Email PayPal" className={getFieldClass()} />
                <input value={form.paymentSettings.orangeMoney || ''} onChange={(e) => patchPaymentSetting('orangeMoney', e.target.value)} placeholder="Orange Money" className={getFieldClass()} />
                <input value={form.paymentSettings.wave || ''} onChange={(e) => patchPaymentSetting('wave', e.target.value)} placeholder="Wave" className={getFieldClass()} />
                <input value={form.paymentSettings.freeMoney || ''} onChange={(e) => patchPaymentSetting('freeMoney', e.target.value)} placeholder="Free Money" className={getFieldClass()} />
                <input value={form.paymentSettings.mtnMoney || ''} onChange={(e) => patchPaymentSetting('mtnMoney', e.target.value)} placeholder="MTN Mobile Money" className={getFieldClass()} />
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Checklist visibilité</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span>Photo de profil</span>
                  <span className={form.avatar ? 'text-emerald-600' : 'text-amber-600'}>{form.avatar ? 'OK' : 'À faire'}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span>Bio et titre public</span>
                  <span className={form.bio && form.publicTitle ? 'text-emerald-600' : 'text-amber-600'}>{form.bio && form.publicTitle ? 'OK' : 'À compléter'}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span>Certifications</span>
                  <span className={form.certifications.length > 0 ? 'text-emerald-600' : 'text-amber-600'}>{form.certifications.length}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span>Portfolio</span>
                  <span className={form.portfolioItems.length > 0 ? 'text-emerald-600' : 'text-amber-600'}>{form.portfolioItems.length}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span>Vidéo de présentation</span>
                  <span className={form.introVideo ? 'text-emerald-600' : 'text-amber-600'}>{form.introVideo ? 'OK' : 'À ajouter'}</span>
                </li>
              </ul>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Prochaine étape</h2>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Le badge “expert vérifié” reste piloté par l’admin. Dès que le profil est complet, l’admin peut activer la vérification dans la gestion des utilisateurs.</p>
                <p className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
                  Assurez-vous de renseigner photo, bio, au moins une certification, un portfolio et les coordonnées de paiement avant de demander la vérification.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
